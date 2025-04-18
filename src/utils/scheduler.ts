import { NewsService } from '../services/NewsService';
import logger from '../config/logger';
import { env } from '../config/env';
// import cron from 'node-cron'; // No longer needed

const newsService = new NewsService();

// REMOVED fetchLatestNewsJob function

// REMOVED dailyFetchAndCleanJob function

// REMOVED scheduleJobs function

// This file might become empty or could be removed if no other utils are planned here.