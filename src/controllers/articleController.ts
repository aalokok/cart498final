import { Request, Response, NextFunction } from 'express';
import { NewsService } from '../services/NewsService';
import ArticleModel, { IArticle } from '../models/Article'; // Ensure IArticle is imported
import { ContentTransformationService } from '../services/ContentTransformationService';
import { OpenAIService } from '../services/OpenAIService';
import { ApiError } from '../utils/error';
import { PoliticalBias } from '../models/Article';
import mongoose from 'mongoose';

const newsService = new NewsService();
const contentTransformationService = new ContentTransformationService();
const openAIService = new OpenAIService();

// Fetch all articles from database
export const getAllArticles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = req.query.category as string;
    
    console.log(`[getAllArticles] Retrieving articles from MongoDB: category=${category || 'all'}`);
    
    // Use the enhanced NewsService method that removes duplicates and limits to 20 articles
    const articles = await newsService.getAllArticles(20, category);
    
    console.log(`[getAllArticles] Retrieved ${articles.length} articles from MongoDB with duplicates removed`);
    
    res.json({
      success: true,
      count: articles.length,
      data: articles
    });
  } catch (error) {
    console.error('Error in getAllArticles:', error);
    next(error);
  }
};

// Fetch ALL articles from database without any limit
export const getAllArticlesNoLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = req.query.category as string;
    
    console.log(`[getAllArticlesNoLimit] Retrieving ALL articles from MongoDB: category=${category || 'all'}`);
    
    // Query MongoDB directly to get all articles without limit
    const query = category ? { category } : {};
    console.log('MongoDB query:', JSON.stringify(query));
    
    const articles = await ArticleModel.find(query)
      .sort({ publishedAt: -1 })
      .lean()  // Convert to plain JS objects for better performance
      .exec();
    
    console.log(`[getAllArticlesNoLimit] Retrieved ${articles.length} total articles from MongoDB`);
    console.log('Sample article IDs:', articles.slice(0, 3).map(a => a._id));
    
    res.json({
      success: true,
      count: articles.length,
      data: articles
    });
  } catch (error) {
    console.error('Error in getAllArticlesNoLimit:', error);
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

    console.log(`[fetchAllArticles] Fetching articles from News API: language=${language}, timeframe=${timeframe}, pageSize=${pageSize}`);
    
    // The service now fetches, saves, and returns the IArticle objects directly
    const articles: IArticle[] = await newsService.fetchAllArticlesAtOnce(pageSize, language, timeframe);
    
    return res.json({
      success: true,
      message: articles.length > 0 ? 'Fetched and categorized articles' : 'No new articles found or fetched',
      count: articles.length,
      data: articles
    });
  } catch (error: any) {
    console.error('Error in fetchAllArticles:', error);
    
    // The service method now attempts a fallback to DB internally on error.
    // If it still throws or returns empty, we return an error response.
    try {
      // Try one last time to get *any* articles from DB if service failed completely
      const existingArticles = await newsService.getAllArticles(50); // Use service method
      if (existingArticles.length > 0) {
        console.warn('fetchAllArticles failed, returning existing articles as fallback.');
        return res.status(200).json({ // Return 200 OK, but indicate fallback
          success: true,
          message: 'Using existing articles (API fetch/process failed)',
          count: existingArticles.length,
          data: existingArticles
        });
      }
    } catch (fallbackError: any) {
      console.error('Fallback article retrieval also failed:', fallbackError);
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
 
    console.log(`[fetchLatestNews] Fetching latest news from API: category=${category}, language=${language}, pageSize=${pageSize}`);
    
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
      console.error(`API Error fetching ${category} articles:`, apiError.message);
      
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

// Transform an article with specified political bias
export const transformArticle = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const articleId = req.params.id;
    const bias = (req.query.bias as PoliticalBias) || 'neutral';
    
    // Validate bias
    if (!['left', 'right', 'neutral'].includes(bias)) {
      throw new ApiError(400, 'Invalid bias. Must be "left", "right", or "neutral"');
    }

    const article = await contentTransformationService.transformArticle(articleId, bias);
    res.json({
      success: true,
      message: `Successfully transformed article with ${bias} bias`,
      data: article
    });
  } catch (error) {
    next(error);
  }
};

// Process all pending articles
export const processPendingArticles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bias = (req.query.bias as PoliticalBias) || 'neutral';
    
    // Validate bias
    if (!['left', 'right', 'neutral'].includes(bias)) {
      throw new ApiError(400, 'Invalid bias. Must be "left", "right", or "neutral"');
    }

    const processedCount = await contentTransformationService.processPendingArticles(bias);
    
    res.json({
      success: true,
      message: `Processed ${processedCount} articles`
    });
  } catch (error) {
    next(error);
  }
}; 

// Generate explanation for an article using OpenAI
export const generateArticleExplanation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.isValidObjectId(id)) {
      throw new ApiError(400, `Invalid article ID: ${id}`);
    }
    
    const article = await ArticleModel.findById(id);
    
    if (!article) {
      throw new ApiError(404, `Article with ID ${id} not found`);
    }
    
    console.log(`Generating explanation for article: ${article.title}`);
    
    // Use the article title, content and category to generate an explanation
    const explanation = await openAIService.generateArticleExplanation(
      article.title,
      article.content || article.description || '', // Use content if available, otherwise description
      article.category
    );
    
    // Save the explanation to the article in MongoDB for future use
    article.explanation = explanation;
    await article.save();
    
    res.json({
      success: true,
      data: {
        articleId: article._id,
        title: article.title,
        explanation
      }
    });
  } catch (error) {
    console.error('Error generating article explanation:', error);
    next(error);
  }
};

// Generate a full article from a headline using OpenAI
export const generateFullArticle = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const articleId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(articleId)) {
      throw new ApiError(400, 'Invalid article ID format');
    }
    
    // Call the service to generate a full article
    const article = await contentTransformationService.generateFullArticleFromHeadline(articleId);
    
    res.json({
      success: true,
      message: 'Article generated successfully',
      data: article
    });
  } catch (error) {
    console.error('Error in generateFullArticle:', error);
    next(error);
  }
};

/**
 * Rewrite an article with right-wing bias using OpenAI and store in MongoDB
 */
export const rewriteArticleWithRightWingBias = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid article ID format');
    }

    const article = await contentTransformationService.rewriteArticleWithRightWingBias(id);
    
    res.json({
      success: true,
      message: 'Article rewritten with right-wing bias successfully',
      data: article
    });
  } catch (error) {
    console.error('Error in rewriteArticleWithRightWingBias:', error);
    next(error);
  }
};

/**
 * Process all articles with right-wing bias
 */
export const processAllArticlesWithRightWingBias = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const processedCount = await contentTransformationService.processAllArticlesWithRightWingBias();
    
    res.json({
      success: true,
      message: `Successfully processed ${processedCount} articles with right-wing bias`,
      count: processedCount
    });
  } catch (error) {
    console.error('Error in processAllArticlesWithRightWingBias:', error);
    next(error);
  }
};

/**
 * Process displayed articles (20) with right-wing bias
 */
export const processDisplayedArticlesWithRightWingBias = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const processedCount = await contentTransformationService.processDisplayedArticlesWithRightWingBias();
    
    res.json({
      success: true,
      message: `Successfully processed ${processedCount} displayed articles with right-wing bias`,
      count: processedCount
    });
  } catch (error) {
    console.error('Error in processDisplayedArticlesWithRightWingBias:', error);
    next(error);
  }
};

// Dynamically rewrite article with extreme right-wing bias
export const rewriteArticleExtremeRight = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  console.log(`[rewriteArticleExtremeRight] Received request for article ID: ${id}`);

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

    console.log(`[rewriteArticleExtremeRight] Rewriting content for article: ${title}`);
    const rewrittenContent = await openAIService.rewriteExtremeRightWing(contentToRewrite, title);

    return res.json({ 
        success: true, 
        rewrittenContent 
    });

  } catch (error: any) {
    console.error(`[rewriteArticleExtremeRight] Error rewriting article ID ${id}:`, error);
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

    const rewrittenContent = await openAIService.rewriteExtremeLeftWing(contentToRewrite, article.title || 'Untitled Article');
    
    return res.status(200).json({
      success: true,
      message: "Article rewritten with extreme left-wing bias successfully.",
      rewrittenContent: rewrittenContent,
    });
  } catch (error) {
    console.error(`[ArticleController] Error rewriting article ${id} (left-wing):`, error);
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
     console.error(`[ArticleController] Error deleting article ${id}:`, error);
     next(error); // Pass error to the global error handler
   }
 };