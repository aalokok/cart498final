import { NewsService } from '../services/NewsService';
import logger from '../config/logger';
import { env } from '../config/env';
import cron from 'node-cron';

const newsService = new NewsService();

/**
 * Fetch latest news and process them
 */
export const fetchAndProcessNews = async () => {
  try {
    console.log('Article fetching disabled per user request');
    /*
    console.log('Scheduled task: Fetching all news articles at once...');
    
    // Use our new method to fetch all articles at once and categorize them
    // Pass a larger number for pageSize to get more articles
    await newsService.fetchAllArticlesAtOnce(100, 'en', '24h');
    console.log('Successfully fetched and stored articles in MongoDB');
    
    // Process pending articles
    const processedCount = await contentTransformationService.processPendingArticles();
    console.log(`Processed ${processedCount} articles`);
    */
  } catch (error) {
    console.error('Error in scheduled news fetch:', error);
  }
};

/**
 * Start scheduled tasks
 */
export const startScheduledTasks = () => {
  // Get interval from environment variable (in minutes)
  const intervalMinutes = env.NEWS_REFRESH_INTERVAL_MINUTES;
  const intervalMs = intervalMinutes * 60 * 1000;
  
  console.log(`Starting scheduled tasks. News refresh interval: ${intervalMinutes} minutes`);
  
  // Do not run article fetching at startup
  console.log('Article fetching disabled per user request');
  // fetchAndProcessNews();
  
  // Do not set interval for future runs
  console.log(`Automatic article fetching disabled per user request`);
  // setInterval(fetchAndProcessNews, intervalMs);
  
  return;
};

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

export const scheduleJobs = () => {
  // Schedule fetching latest news every hour
  cron.schedule('0 * * * *', fetchLatestNewsJob);
  logger.info('Scheduled job: Fetch latest news every hour (at minute 0).');

  // Schedule processing pending articles every 3 hours (Job is inactive)
  // cron.schedule('0 */3 * * *', processPendingArticlesJob);
  // logger.info('Scheduled job: Process pending articles every 3 hours (at minute 0) - Currently inactive.');
};