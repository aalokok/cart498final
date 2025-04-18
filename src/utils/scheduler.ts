import { NewsService } from '../services/NewsService';
import logger from '../config/logger';
import { env } from '../config/env';
import cron from 'node-cron';

const newsService = new NewsService();

/**
 * Fetch latest news and process them
 */
// REMOVED unused fetchAndProcessNews function

/**
 * Start scheduled tasks
 */
// REMOVED unused startScheduledTasks function

// Function to process pending articles - This functionality is now removed
// async function processPendingArticlesJob() {
//   logger.info('Scheduler running: Processing pending articles...');
//   try {
//     // The logic for processing pending articles is removed as the service is gone
//     // If similar functionality is needed, it would need to be reimplemented 
//     // possibly by directly finding unprocessed articles and calling relevant OpenAI functions.
//     // For now, we log that this job is inactive.
//     // const processedCount = await contentTransformationService.processPendingArticles(); 
//     // logger.info(`Scheduler finished: Processed ${processedCount} pending articles.`);
//     logger.info('processPendingArticlesJob is currently inactive as ContentTransformationService was removed.');
//   } catch (error) {
//     logger.error('Scheduler error processing pending articles:', error);
//   }
// }

// Function to fetch latest news
async function fetchLatestNewsJob() {
  logger.info('Scheduler running: Fetching latest news...');
  try {
    // Fetch news for the 'top' category (or adjust if needed)
    // The fetchAllArticlesAtOnce method is more suitable for a scheduled full refresh.
    // Using a smaller page size for a frequent job.
    const articles = await newsService.fetchAllArticlesAtOnce(20, 'en', '1h'); 
    logger.info(`Scheduler finished: Fetched ${articles.length} new articles.`);
  } catch (error) {
    logger.error('Scheduler error fetching latest news:', error);
  }
};

// Function to run the daily fetch and clean job
async function dailyFetchAndCleanJob() {
  logger.info('Scheduler running: Daily Fetch and Clean Job...');
  try {
    await newsService.fetchAndCleanDailyArticles(50); // Keep 50 articles
  } catch (error) {
    logger.error('Scheduler error running daily fetch and clean job:', error);
  }
};

export const scheduleJobs = () => {
  // Schedule fetching latest news every hour (Can be removed if daily job is sufficient)
  // cron.schedule('0 * * * *', fetchLatestNewsJob);
  // logger.info('Scheduled job: Fetch latest news every hour (at minute 0).');

  // Schedule the daily fetch and clean job at midnight
  cron.schedule('0 0 * * *', dailyFetchAndCleanJob);
  logger.info('Scheduled job: Daily fetch and clean articles at midnight.');

  // Schedule processing pending articles every 3 hours (Job is inactive)
  // cron.schedule('0 */3 * * *', processPendingArticlesJob);
  // logger.info('Scheduled job: Process pending articles every 3 hours (at minute 0) - Currently inactive.');
};