import { Request, Response, NextFunction } from 'express';
import { NewsService } from '../services/NewsService';
import ArticleModel, { IArticle } from '../models/Article'; // Ensure IArticle is imported
import { OpenAIService } from '../services/OpenAIService';
import { ApiError } from '../utils/error'; // Correct path to error.ts
import { PoliticalBias } from '../models/Article';
import mongoose from 'mongoose';
import { elevenLabsService } from '../services/ElevenLabsService'; // Ensure ElevenLabsService is imported
import logger from '../config/logger'; // Correct path to logger.ts

const newsService = new NewsService();
const openAIService = new OpenAIService();

const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Example default voice ID

// Fetch all articles from database
export const getAllArticles = async (req: Request, res: Response, next: NextFunction) => {
  console.log('[Controller:getAllArticles] Request received'); // Log start
  try {
    const { category = 'all' } = req.query;
    console.log(`[Controller:getAllArticles] Retrieving articles from MongoDB: category=${category}`);
    const articles = await ArticleModel.find({ 
        ...(category !== 'all' && { category: category as string }) 
    })
    .sort({ publishedAt: -1 })
    .limit(20);
    
    console.log(`[Controller:getAllArticles] Found ${articles.length} articles for category=${category}`); // Log success
    
    // Remove duplicates based on title - consider moving this logic if performance is critical
    const uniqueArticles = Array.from(new Map(articles.map(article => [article.title, article])).values());
    console.log(`[Controller:getAllArticles] Returning ${uniqueArticles.length} unique articles.`);
    
    res.status(200).json({
      success: true,
      count: uniqueArticles.length,
      data: uniqueArticles
    });
  } catch (error) {
    console.error('[Controller:getAllArticles] Error retrieving articles:', error); // Log error
    next(error); // Pass error to global error handler
  }
};

// Fetch ALL articles from database without any limit
export const getAllArticlesNoLimit = async (req: Request, res: Response, next: NextFunction) => {
  // console.log('[Controller:getAllArticlesNoLimit] Request received - DEBUG MODE: Returning fixed response'); // Reverted log
  try {
    // --- Re-enabled DATABASE LOGIC ---
    const category = req.query.category as string;
    logger.info(`[getAllArticlesNoLimit] Retrieving ALL articles from MongoDB: category=${category || 'all'}`);
    const query = category ? { category } : {};
    logger.info('MongoDB query:', JSON.stringify(query));
    const articles = await ArticleModel.find(query)
      .sort({ publishedAt: -1 })
      .lean()  // Convert to plain JS objects for better performance
      .exec();
    logger.info(`[getAllArticlesNoLimit] Retrieved ${articles.length} total articles from MongoDB`);
    logger.info('Sample article IDs:', articles.slice(0, 3).map(a => a._id));
    // -- END OF Re-enabled --

    // Return the actual articles
    res.status(200).json({
      success: true,
      count: articles.length, // Use actual count
      // message: "DEBUG MODE - Fixed response", // Removed debug message
      data: articles // Return actual data
    });

  } catch (error) {
    // console.error('[Controller:getAllArticlesNoLimit] Error (even in debug mode?): ', error); // Reverted log
    logger.error('Error in getAllArticlesNoLimit:', error); // Use logger again
    next(error);
  }
};

// Get a single article by ID
export const getArticleById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const article = await newsService.getArticleById(req.params.id);
    
    if (!article) {
      throw new ApiError(404, `Article with ID ${req.params.id} not found`);
    }
    
    res.json({
      success: true,
      data: article
    });
  } catch (error) {
    next(error);
  }
};

// Fetch all articles at once from News API, categorize them, and store in MongoDB
export const fetchAllArticles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const language = req.query.language as string || 'en';
    const timeframe = req.query.timeframe as string || '24h';
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 20; 

    logger.info(`[fetchAllArticles] Fetching articles from News API: language=${language}, timeframe=${timeframe}, pageSize=${pageSize}`);
    
    // The service now fetches, saves, and returns the IArticle objects directly
    const articles: IArticle[] = await newsService.fetchAllArticlesAtOnce(pageSize, language, timeframe);
    
    return res.json({
      success: true,
      message: articles.length > 0 ? 'Fetched and categorized articles' : 'No new articles found or fetched',
      count: articles.length,
      data: articles
    });
  } catch (error: any) {
    logger.error('Error in fetchAllArticles:', error);
    
    // The service method now attempts a fallback to DB internally on error.
    // If it still throws or returns empty, we return an error response.
    try {
      // Try one last time to get *any* articles from DB if service failed completely
      const existingArticles = await newsService.getAllArticles(50); // Use service method
      if (existingArticles.length > 0) {
        logger.warn('fetchAllArticles failed, returning existing articles as fallback.');
        return res.status(200).json({ // Return 200 OK, but indicate fallback
          success: true,
          message: 'Using existing articles (API fetch/process failed)',
          count: existingArticles.length,
          data: existingArticles
        });
      }
    } catch (fallbackError: any) {
      logger.error('Fallback article retrieval also failed:', fallbackError);
      // If even the fallback fails, send the original error
      return next(error); // Pass original error to error handler
    }
    
    // If fallback didn't find articles, send a generic error
    return next(new ApiError(500, 'Failed to fetch articles and no fallback data available.'));
  }
};

// Fetch new articles from News API
export const fetchLatestNews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const language = req.query.language as string || 'en';
    const timeframe = req.query.timeframe as string || '24h';
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 20; 
    const priorityDomain = req.query.priorityDomain as string || 'top';
    // Get category from path parameter instead of query
    const category = req.params.category || 'top'; 
 
    logger.info(`[fetchLatestNews] Fetching latest news from API: category=${category}, language=${language}, pageSize=${pageSize}`);
    
    // The service now handles checking the DB first and saving API results.
    // It directly returns IArticle[] whether from DB or after fetching/saving.
    try {
      const articles: IArticle[] = await newsService.fetchLatestNews(category, pageSize, language, timeframe, priorityDomain);
       
      return res.json({
        success: true,
        message: `Articles for category: ${category}`,
        count: articles.length,
        data: articles
      });
    } catch (apiError: any) {
      // More detailed error handling for API calls
      logger.error(`API Error fetching ${category} articles:`, apiError.message);
      
      // The service handles the 429 fallback, so controller just passes error
      if (apiError instanceof ApiError) {
        // If it's an ApiError we created (e.g., key missing), pass it on
        return next(apiError);
      }
      // For other unexpected errors from the service call
      return next(new ApiError(500, `Failed to fetch news for ${category}: ${apiError.message}`));
    }
  } catch (error) {
    next(error);
  }
};

// Dynamically rewrite article with extreme right-wing bias
export const rewriteArticleExtremeRight = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  logger.info(`[rewriteArticleExtreme] Received request for article ID: ${id}, bias: right`);

  if (!mongoose.isValidObjectId(id)) {
    return next(new ApiError(400, 'Invalid article ID format'));
  }

  try {
    const article = await ArticleModel.findById(id).lean();

    if (!article) {
      return next(new ApiError(404, 'Article not found'));
    }

    // Use the original content for rewriting, fall back to description if content is empty
    const contentToRewrite = article.content || article.description || '';
    const title = article.title;

    if (!contentToRewrite) {
        return next(new ApiError(400, 'Article has no content to rewrite'));
    }

    logger.info(`[rewriteArticleExtreme] Rewriting content for article: ${title}`);
    // Call the consolidated service function
    const rewrittenContent = await openAIService.rewriteExtreme(contentToRewrite, title, 'right');

    return res.json({ 
        success: true, 
        rewrittenContent 
    });

  } catch (error: any) {
    logger.error(`[rewriteArticleExtreme] Error rewriting article ID ${id} (bias: right):`, error);
    // Pass specific OpenAI errors or a generic error
    next(error instanceof Error ? new ApiError(500, error.message) : error);
  }
};

// Controller function to rewrite an article with extreme left-wing bias
export const rewriteArticleExtremeLeft = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  const { id } = req.params;
  logger.info(`[rewriteArticleExtreme] Received request for article ID: ${id}, bias: left`);
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return next(new ApiError(400, "Valid article ID is required."));
  }

  try {
    const article = await ArticleModel.findById(id).select('title content description');
    if (!article) {
      return next(new ApiError(404, "Article not found."));
    }

    const contentToRewrite = article.content || article.description || '';
    if (!contentToRewrite) {
      return next(new ApiError(400, "Article has no content or description to rewrite."));
    }

    // Call the consolidated service function
    const rewrittenContent = await openAIService.rewriteExtreme(contentToRewrite, article.title || 'Untitled Article', 'left');
    
    return res.status(200).json({
      success: true,
      message: "Article rewritten with extreme left-wing bias successfully.",
      rewrittenContent: rewrittenContent,
    });
  } catch (error) {
    logger.error(`[rewriteArticleExtreme] Error rewriting article ID ${id} (bias: left):`, error);
    next(error); // Pass error to the global error handler
  }
};

 // Controller function to delete an article by ID
 export const deleteArticleById = async (
   req: Request,
   res: Response,
   next: NextFunction
 ): Promise<void | Response> => {
   const { id } = req.params;
   if (!id || !mongoose.Types.ObjectId.isValid(id)) {
     return next(new ApiError(400, 'Valid article ID is required.'));
   }

   try {
     const deletedArticle = await ArticleModel.findByIdAndDelete(id);
     if (!deletedArticle) {
       return next(new ApiError(404, 'Article not found.'));
     }
     return res.status(200).json({ success: true, message: 'Article deleted successfully.' });
   } catch (error) {
     logger.error(`[ArticleController] Error deleting article ${id}:`, error);
     next(error); // Pass error to the global error handler
   }
 };

/**
 * Manually trigger the daily fetch and clean process.
 */
export const forceRefreshAndCleanArticles = async (req: Request, res: Response, next: NextFunction) => {
  logger.info('[forceRefreshAndCleanArticles] Manual trigger received.');
  try {
    // Call the service method, keep default 50 articles
    await newsService.fetchAndCleanDailyArticles(); 
    res.status(200).json({
      success: true,
      message: 'Manual refresh and clean process initiated successfully.'
    });
  } catch (error) {
    logger.error('[forceRefreshAndCleanArticles] Error during manual trigger:', error);
    // Pass error to the main error handler
    next(error instanceof ApiError ? error : new ApiError(500, `Manual refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`)); 
  }
};