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
    console.log('Scheduled task: Fetching latest news articles...');
    
    // Fetch latest news
    await newsService.fetchLatestNews('general', 10);
    console.log('Fetched news articles successfully');
    
    // Process pending articles
    const processedCount = await contentTransformationService.processAllPendingArticles();
    console.log(`Processed ${processedCount} articles`);
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
  
  // Run once at startup
  fetchAndProcessNews();
  
  // Set interval for future runs
  setInterval(fetchAndProcessNews, intervalMs);
}; 