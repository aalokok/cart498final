import express from 'express';
import * as articleController from '../controllers/articleController';

const router = express.Router();

// Get all articles
router.get('/', articleController.getAllArticles);

// Get a single article by ID
router.get('/:id', articleController.getArticleById);

// Fetch new articles from News API
router.post('/fetch', articleController.fetchLatestNews);

// Transform a single article
router.post('/transform/:id', articleController.transformArticle);

// Process all pending articles
router.post('/process-all', articleController.processAllPendingArticles);

export default router; 