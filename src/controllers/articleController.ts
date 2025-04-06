import { Request, Response, NextFunction } from 'express';
import { NewsService } from '../services/NewsService';
import { ContentTransformationService } from '../services/ContentTransformationService';
import { ApiError } from '../utils/error';

const newsService = new NewsService();
const contentTransformationService = new ContentTransformationService();

// Get all articles
export const getAllArticles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const articles = await newsService.getAllArticles(limit);
    res.json({
      success: true,
      count: articles.length,
      data: articles
    });
  } catch (error) {
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

// Fetch new articles from News API
export const fetchLatestNews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = req.query.category as string || 'general';
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 10;
    
    await newsService.fetchLatestNews(category, pageSize);
    
    res.json({
      success: true,
      message: `Successfully fetched latest news in category: ${category}`
    });
  } catch (error) {
    next(error);
  }
};

// Transform an article
export const transformArticle = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const articleId = req.params.id;
    const article = await contentTransformationService.transformArticle(articleId);
    
    res.json({
      success: true,
      data: article
    });
  } catch (error) {
    next(error);
  }
};

// Process all pending articles
export const processAllPendingArticles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const processedCount = await contentTransformationService.processAllPendingArticles();
    
    res.json({
      success: true,
      message: `Processed ${processedCount} articles`
    });
  } catch (error) {
    next(error);
  }
}; 