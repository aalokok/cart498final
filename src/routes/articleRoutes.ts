import express, { Request, Response, NextFunction } from 'express';
import {
  getAllArticles,
  getAllArticlesNoLimit,
  getArticleById,
  generateArticleExplanation,
  fetchLatestNews,
  fetchAllArticles,
  transformArticle,
  rewriteArticleExtremeRight,
  rewriteArticleExtremeLeft,
  processPendingArticles,
  generateFullArticle,
  generateSpecificBiasedHeadlineAudio,
  getBiasedBreakingNewsAudio
} from '../controllers/articleController';

const router = express.Router();

// Get all articles
router.get('/', getAllArticles);

// Get all articles without limit
router.get('/all', getAllArticlesNoLimit);

// Get a single article by ID
router.get('/:id', getArticleById);

// Generate explanation for an article
router.post('/:id/explanation', generateArticleExplanation);

// Fetch new articles from News API
// Route for fetching specific category (now uses path param)
router.post('/fetch/:category', fetchLatestNews);
// Fallback route if no category is provided in path
router.post('/fetch', fetchLatestNews); // Defaults to 'top' in controller

// Fetch all articles at once from all categories - separate endpoint
router.post('/fetch-all', fetchAllArticles);

// Transform a single article
router.post('/transform/:id', transformArticle);

// Dynamically rewrite an article with extreme right bias
router.post('/:id/rewrite-extreme-right', rewriteArticleExtremeRight);

// Dynamically rewrite an article with extreme left bias
router.post('/:id/rewrite-extreme-left', rewriteArticleExtremeLeft);

// Process all pending articles
router.post('/process-all', processPendingArticles);

// Generate a full article from a headline
router.post('/:id/generate-full-article', generateFullArticle);

// Generate and stream biased headline audio for a SPECIFIC article ID
router.post('/:id/tts/biased-headline', generateSpecificBiasedHeadlineAudio);

// Generate and stream biased audio for the LATEST breaking news
router.get('/tts/biased-breaking-news', getBiasedBreakingNewsAudio);

export default router;