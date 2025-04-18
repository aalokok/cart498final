import express, { Request, Response, NextFunction } from 'express';
import {
  getAllArticles,
  getAllArticlesNoLimit,
  getArticleById,
  fetchLatestNews,
  fetchAllArticles,
  rewriteArticleExtremeRight,
  rewriteArticleExtremeLeft,
  forceRefreshAndCleanArticles
} from '../controllers/articleController';

const router = express.Router();

// Get all articles
router.get('/', getAllArticles);

// Get all articles without limit
router.get('/all', getAllArticlesNoLimit);

// Get a single article by ID
router.get('/:id', getArticleById);

// Fetch new articles from News API
// Route for fetching specific category (now uses path param)
router.post('/fetch/:category', fetchLatestNews);
// Fallback route if no category is provided in path
router.post('/fetch', fetchLatestNews); // Defaults to 'top' in controller

// Fetch all articles at once from all categories - separate endpoint
router.post('/fetch-all', fetchAllArticles);

// Dynamically rewrite an article with extreme right bias
router.post('/:id/rewrite-extreme-right', rewriteArticleExtremeRight);

// Dynamically rewrite an article with extreme left bias
router.post('/:id/rewrite-extreme-left', rewriteArticleExtremeLeft);

// Manually trigger fetch and clean
router.post('/refresh-and-clean', forceRefreshAndCleanArticles);

export default router;