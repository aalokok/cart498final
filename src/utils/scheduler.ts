import { NewsService } from '../services/NewsService';
import { ContentTransformationService } from '../services/ContentTransformationService';
import { env } from '../config/env';

const newsService = new NewsService();
const contentTransformationService = new ContentTransformationService();

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