import axios from 'axios';
import { ApiError } from '../utils/error';
import mongoose from 'mongoose';
import ArticleModel, { IArticle } from '../models/Article';

interface ArticleWithUrlAndTitle {
  url?: string; // IArticle uses url
  link?: string; // NewsDataArticle uses link
  title: string;
}

export interface NewsDataArticle {
  title: string;
  link: string;
  description?: string;
  content?: string;
  pubDate: string;
  image_url?: string;
  source_id: string;
  source_priority?: number;
  country?: string[];
  category?: string[];
  creator?: string[];
}

export interface NewsDataResponse {
  status: 'success' | 'error';
  totalResults: number;
  results?: NewsDataArticle[];
  nextPage?: string;
  message?: string;
}

export class NewsService {
  private baseUrl: string;
  private apiKey: string | undefined;
  private lastRequestTime: number = 0;
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours cache TTL (daily refresh)
  private readonly MIN_REQUEST_INTERVAL = 1200; // Minimum 1.2 seconds between requests
  private readonly DEFAULT_ARTICLE_LIMIT = 20; // Default limit for article results
  private lastFetchDate: string = '';

  constructor() {
    this.baseUrl = 'https://newsdata.io/api/1';
    this.apiKey = process.env.NEWS_API_KEY;
    // Create an exponential backoff delay for rate limits
    this.lastFetchDate = this.getTodayDate();
  }

  /**
   * Get today's date in YYYY-MM-DD format
   */
  private getTodayDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  /**
   * Check if we already have articles for today for a specific category
   */
  async hasTodayArticles(category: string): Promise<boolean> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const count = await ArticleModel.countDocuments({
        category,
        createdAt: { $gte: today }
      });
      
      return count > 0;
    } catch (error) {
      console.error('Error checking for today articles:', error);
      return false;
    }
  }

  /**
   * Get the count of articles for today for a specific category
   */
  async getTodayArticleCount(category: string): Promise<number> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const count = await ArticleModel.countDocuments({
        category,
        createdAt: { $gte: today }
      });
      
      return count;
    } catch (error) {
      console.error('Error getting today article count:', error);
      return 0;
    }
  }

  /**
   * Safely call the News API with backoff retry logic
   */
  private async safeApiCall<T>(url: string, params: Record<string, any>, retries = 3): Promise<T> {
    let lastError: any = null;
    const baseDelay = 2000; // Start with a 2-second delay
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // Apply rate limiting - we need at minimum 1.2s between requests to avoid hitting rate limits
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
          const delayNeeded = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
          console.log(`Rate limiting: Waiting ${delayNeeded}ms before next request`);
          await new Promise(resolve => setTimeout(resolve, delayNeeded));
        }
        
        // Update last request time
        this.lastRequestTime = Date.now();
        
        // Make the API call with an increased timeout to avoid timeout errors
        const response = await axios.get<T>(url, {
          params,
          timeout: 30000 // Increase timeout to 30 seconds
        });
        
        return response.data;
      } catch (error: any) {
        lastError = error;
        
        // Specific handling for timeout errors
        if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
          console.error(`API timeout on attempt ${attempt + 1}/${retries}`);
          // For timeouts, use a shorter delay but still retry
          await new Promise(resolve => setTimeout(resolve, 1500));
          continue;
        }
        
        // If we get a 429 rate limit error, apply exponential backoff
        if (axios.isAxiosError(error) && error.response?.status === 429) {
          const delay = baseDelay * Math.pow(2, attempt);
          console.log(`Rate limit hit. Retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // For other errors, don't retry
          break;
        }
      }
    }
    
    // If we got here, we've exhausted retries or hit a non-retryable error
    throw lastError;
  }

  /**
   * Fetch latest news articles from NewsData.io API
   * Prioritizes fetching from MongoDB if articles exist for today.
   */
  async fetchLatestNews(category: string = 'top', pageSize: number = 5, language: string = 'en', timeframe: string = '24h', priorityDomain: string = 'top'): Promise<IArticle[]> {
    try {
      if (!this.apiKey) {
        throw new ApiError(500, 'News API key is not configured');
      }

      // Validate and normalize category
      const validCategories = ['top', 'world', 'politics', 'business', 'technology', 'sports', 'entertainment', 'health', 'science', 'food', 'tourism'];
      if (!validCategories.includes(category)) {
        console.warn(`Invalid category '${category}', defaulting to 'top'`);
        category = 'top';
      }

      // Check MongoDB first for articles from today for this category
      const todayArticles = await this.getAllArticles(pageSize, category); // Use consolidated DB method
      if (todayArticles.length > 0) {
        console.log(`Found ${todayArticles.length} articles for today in MongoDB for category: ${category}. Returning directly.`);
        return todayArticles; // Return IArticle[] directly
      }

      // If not in DB, proceed with API logic
      console.log(`Fetching news from API for category: ${category}, language: ${language}`);

      // Use the safe API call method with retry logic
      try {
        const response = await this.safeApiCall<NewsDataResponse>(
          `${this.baseUrl}/news`,
          {
            apikey: this.apiKey,
            category,
            language,
            country: 'us,ca', // Only fetch news from US and Canada
            domain_priority: priorityDomain,
            timeframe,
            size: pageSize
          }
        );

        if (response.status === 'error') {
          throw new ApiError(500, `News API error: ${response.message}`);
        }

        // Store articles in MongoDB right here to reduce API calls
        if (response.results && response.results.length > 0) {
          let savedArticles: IArticle[] = [];
          try {
            const articlesToSave = response.results.map(article => ({
              title: article.title || 'No Title',
              description: article.description || '',
              content: article.content || article.description || '',
              url: article.link,
              urlToImage: article.image_url || '',
              publishedAt: new Date(article.pubDate),
              sourceName: article.source_id,
              sourceId: article.source_id,
              author: article.creator?.[0] || 'Unknown',
              category: category,
              isProcessed: false,
              processingStatus: 'pending',
              politicalBias: 'neutral',
              createdAt: new Date() // Explicitly set createdAt to ensure it's today
            }));

            const articleUrls = articlesToSave.map(a => a.url);

            // Use insertMany with ordered: false to skip duplicates but continue insertion
            await ArticleModel.insertMany(articlesToSave, { ordered: false })
              .catch(err => {
                // Even if there are errors (like duplicates), we still want to fetch what was saved.
                // Log error but don't throw it - we want to continue even if some inserts fail
                if (!err.message.includes('duplicate key error')) {
                  console.error('Error saving articles to MongoDB:', err);
                }
              });

            // Fetch the articles that were just attempted to be saved (including ones that might have failed due to duplication)
            savedArticles = await ArticleModel.find({ url: { $in: articleUrls } }).lean();
            console.log(`Attempted to save ${articlesToSave.length}, retrieved ${savedArticles.length} articles from MongoDB for category: ${category}`);

          } catch (err) {
            console.error('Error saving articles to MongoDB:', err);
            // Don't throw the error - we still want to return the API results
            // Return empty array if save fails
            return [];
          }

          // Return the articles that were successfully saved/found in the DB
          this.lastFetchDate = this.getTodayDate(); 
          return savedArticles;

        } else {
          // No results from API
          return [];
        }
      } catch (error: any) {
        // Special handling for rate limit errors - try to provide from DB anyway
        if (error.message && error.message.includes('429')) { // Check if error message exists
          console.warn(`Rate limit hit for category ${category}, falling back to existing data`);
          
          // Return whatever we have in MongoDB even if it's less than requested
          const fallbackArticles = await ArticleModel.find({ category })
            .sort({ publishedAt: -1 })
            .lean();
            
          if (fallbackArticles.length > 0) {
            console.log(`Returning ${fallbackArticles.length} fallback articles from MongoDB`);
            
            // Remove duplicates and limit to 20
            const uniqueArticles = this._removeDuplicateArticlesGeneric(fallbackArticles, a => a.url, a => a.title);
            const limitedArticles = uniqueArticles.slice(0, this.DEFAULT_ARTICLE_LIMIT);
            
            return limitedArticles;
          }
        }

        // For other errors, return empty array or re-throw based on desired behavior
        console.error('Unhandled error fetching latest news:', error);
        return []; // Return empty array on other errors
      }
    } catch (error: any) {
      // Catch errors from initial setup (e.g., API key missing)
      console.error('General error in fetchLatestNews:', error.message);
      return []; // Return empty array on general errors
    }
  }

  /**
   * Fetch all articles at once regardless of category and store them in MongoDB
   * This approach avoids multiple API calls and rate limits
   */
  async fetchAllArticlesAtOnce(pageSize: number = 20, language: string = 'en', timeframe: string = '24h'): Promise<IArticle[]> {
    try {
      if (!this.apiKey) {
        throw new ApiError(500, 'News API key is not configured');
      }

      // First check if we already fetched today (within 24 hours)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Count how many articles we have from today
      const todayArticleCount = await ArticleModel.countDocuments({
        createdAt: { $gte: today }
      });
      
      // Only skip API fetch if we have ANY articles from today (removed magic number 30)
      if (todayArticleCount > 0) {
        console.log(`Articles already fetched today (${todayArticleCount} articles), using from MongoDB`);
        
        // Get all articles from MongoDB that were fetched today
        const articles = await ArticleModel.find({
          createdAt: { $gte: today }
        }).sort({ publishedAt: -1 });
        
        // Remove duplicates and limit to the default limit
        const uniqueArticles = this._removeDuplicateArticlesGeneric(articles, a => a.url, a => a.title);
        const limitedArticles = uniqueArticles.slice(0, this.DEFAULT_ARTICLE_LIMIT);
        
        return limitedArticles; // Return IArticle[] directly
      }
      
      console.log('Fetching articles from API...');
      
      // Initialize articles array
      let allArticles: NewsDataArticle[] = [];
      
      // Categories to fetch articles for
      const categories = ['top', 'world', 'politics', 'business', 'technology', 'entertainment', 'sports', 'health'];
      
      // Fetch articles for each category sequentially to avoid rate limits
      for (const category of categories) {
        try {
          console.log(`Fetching articles for category: ${category}`);
          
          // Wait a bit between requests to avoid rate limits
          if (allArticles.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
          
          const response = await this.safeApiCall<NewsDataResponse>(
            `${this.baseUrl}/news`,
            {
              apikey: this.apiKey,
              language,
              category,
              country: 'us,ca', // Only fetch news from US and Canada
              size: Math.min(pageSize, 10) // The API might limit size, so keep it conservative
            }
          );
          
          if (response.results && response.results.length > 0) {
            console.log(`Got ${response.results.length} articles for category ${category}`);
            allArticles = [...allArticles, ...response.results];
          }
        } catch (categoryError) {
          console.error(`Error fetching category ${category}:`, categoryError);
          // Continue with other categories even if one fails
        }
      }
      
      // If API calls yielded results, save them
      if (allArticles.length > 0) {
        let savedArticles: IArticle[] = [];
        try {
          const articlesToSave = allArticles.map(article => ({
            title: article.title || 'No Title',
            description: article.description || '',
            content: article.content || article.description || '', // Use description as fallback content
            url: article.link,
            urlToImage: article.image_url || '',
            publishedAt: new Date(article.pubDate),
            sourceName: article.source_id,
            sourceId: article.source_id,
            author: article.creator?.[0] || 'Unknown',
            // Assign category based on the original fetch, default to 'general' if missing
            category: article.category?.[0] || 'general', 
            isProcessed: false,
            processingStatus: 'pending',
            politicalBias: 'neutral',
            createdAt: new Date() // Set creation timestamp
          }));

          // Remove duplicates before attempting to save
          const uniqueArticlesToSave = this._removeDuplicateArticlesGeneric(articlesToSave, a => a.url, a => a.title);
          const articleUrls = uniqueArticlesToSave.map(a => a.url);

          console.log(`Attempting to save ${uniqueArticlesToSave.length} unique articles to MongoDB...`);
          
          // Insert new unique articles
          await ArticleModel.insertMany(uniqueArticlesToSave, { ordered: false })
            .catch(err => {
              if (!err.message.includes('duplicate key error')) {
                console.error('Error saving articles from fetchAll:', err);
              }
            });

          // Fetch back the articles that were just attempted to be saved (including ones that might have failed due to duplication)
          savedArticles = await ArticleModel.find({ url: { $in: articleUrls } }).sort({ publishedAt: -1 }).lean();
          console.log(`Retrieved ${savedArticles.length} articles after saving.`);
          
          this.lastFetchDate = this.getTodayDate(); 
          // Return the saved articles, limited to the default limit
          return savedArticles.slice(0, this.DEFAULT_ARTICLE_LIMIT);

        } catch (dbError) {
          console.error('Database error during fetchAllArticlesAtOnce save:', dbError);
          // Fallback: return empty array if DB operation fails
          return [];
        }
      } else {
         // No articles fetched from API (including fallback attempt within loop)
         console.warn('No articles were fetched from the News API after trying all categories.');
         return []; // Return empty if API yielded nothing
      }

    } catch (error: any) {
      console.error('General error in fetchAllArticlesAtOnce:', error.message);
      // Fallback: Try to return some articles from the DB on general error
      try {
        const fallbackArticles = await this.getAllArticles(this.DEFAULT_ARTICLE_LIMIT); // Use existing method
        if (fallbackArticles.length > 0) {
          console.warn('Returning existing articles from DB due to error in fetchAllArticlesAtOnce.');
          return fallbackArticles;
        }
      } catch (dbFallbackError) {
        console.error('DB fallback also failed in fetchAllArticlesAtOnce:', dbFallbackError);
      }
      return []; // Return empty if everything fails
    }
  }

  /**
   * Get all articles from MongoDB with optional category filter
   * This is the consolidated method.
   */
  async getAllArticles(limit: number = this.DEFAULT_ARTICLE_LIMIT, category?: string): Promise<IArticle[]> {
    try {
      let query: mongoose.FilterQuery<IArticle> = {};
      
      // Add category filter if provided and not 'general'
      if (category && category !== 'general') {
        query = { category };
      } else if (!category) {
        // If no category is specified, fetch all articles (no filter)
      } else {
        // If category is 'general', we might want special logic or fetch all?
        // For now, let's assume 'general' means no specific category filter is applied
        // This matches the previous behavior of getAllArticlesFromDatabase
      }
      
      // Get articles from MongoDB
      const articles = await ArticleModel.find(query)
        .sort({ publishedAt: -1 })
        .lean(); // Use lean for performance if not modifying docs
      
      // Remove duplicates using the generic helper and limit
      const uniqueArticles = this._removeDuplicateArticlesGeneric(articles, a => a.url, a => a.title);
      return uniqueArticles.slice(0, limit); // Use the provided limit parameter
    } catch (error: any) {
      console.error('Error getting articles from MongoDB:', error.message);
      throw new ApiError(500, `Failed to retrieve articles from database: ${error.message}`);
    }
  }

  /**
   * Get article by ID
   */
  async getArticleById(id: string): Promise<IArticle | null> {
    try {
      const article = await ArticleModel.findById(id);
      return article;
    } catch (error: any) {
      console.error(`Error fetching article ${id}:`, error.message);
      throw new ApiError(500, `Failed to fetch article: ${error.message}`);
    }
  }

  /**
   * Get pending articles that need processing
   */
  async getPendingArticles(): Promise<IArticle[]> {
    try {
      const articles = await ArticleModel.find({ isProcessed: false })
        .sort({ publishedAt: -1 });
      return articles;
    } catch (error: any) {
      console.error('Error fetching pending articles:', error.message);
      throw new ApiError(500, `Failed to fetch pending articles: ${error.message}`);
    }
  }

  /**
   * Retrieves the title of a single random article from the database.
   * Uses MongoDB aggregation with $sample for efficiency.
   * @returns The title of a random article, or a default message if none found.
   */
  async getRandomArticleHeadline(): Promise<string> {
    try {
      console.log('[NewsService] Attempting to fetch a random article headline...');
      // Use aggregation pipeline with $sample to get 1 random document efficiently
      const randomArticles = await ArticleModel.aggregate([
        { $match: { title: { $ne: null, $ne: "" } } }, // Ensure title exists and is not empty
        { $sample: { size: 1 } }, // Get 1 random document
        { $project: { title: 1, _id: 0 } } // Only project the title field
      ]).exec();

      if (randomArticles.length > 0 && randomArticles[0].title) {
        console.log(`[NewsService] Found random headline: "${randomArticles[0].title}"`);
        return randomArticles[0].title;
      } else {
        console.warn('[NewsService] No articles found or random article has no title.');
        return "No headlines available at the moment."; // Default message
      }
    } catch (error) {
      console.error('[NewsService] Error fetching random article headline:', error);
      // Optionally rethrow or return a specific error message
      throw new ApiError(500, 'Failed to fetch random article headline from database.');
    }
  }

  /**
   * Generic helper to remove duplicate articles based on URL/link and title similarity.
   * Works for both IArticle and NewsDataArticle types.
   */
  private _removeDuplicateArticlesGeneric<T extends ArticleWithUrlAndTitle>(
    articles: T[],
    getUrl: (article: T) => string | undefined,
    getTitle: (article: T) => string
  ): T[] {
    const urlMap = new Map<string, boolean>();
    const titleMap = new Map<string, boolean>();
    const uniqueArticles: T[] = [];
    
    for (const article of articles) {
      const rawUrl = getUrl(article);
      const rawTitle = getTitle(article);

      // Handle potential undefined URL/link
      const normalizedUrl = rawUrl ? rawUrl.split('?')[0] : ''; 
      const normalizedTitle = rawTitle ? rawTitle.toLowerCase().replace(/[^\w\s]/g, '') : '';
      
      // Check if we've seen this URL (if valid) or a very similar title (if valid)
      const isDuplicateUrl = normalizedUrl && urlMap.has(normalizedUrl);
      const isDuplicateTitle = normalizedTitle && titleMap.has(normalizedTitle);
      
      if (!isDuplicateUrl && !isDuplicateTitle) {
        // Add to our unique articles array
        uniqueArticles.push(article);
        
        // Mark this URL and title as seen (only if they are valid)
        if (normalizedUrl) urlMap.set(normalizedUrl, true);
        if (normalizedTitle) titleMap.set(normalizedTitle, true);
      }
    }
    
    console.log(`Filtered ${articles.length} articles down to ${uniqueArticles.length} unique articles (generic)`);
    return uniqueArticles;
  }

  /**
   * Categorize articles based on content
   * Analyzes title, description and content to assign categories
   */
  private categorizeArticles(articles: NewsDataArticle[]): (NewsDataArticle & { category: string[] })[] {
    const categoryKeywords: Record<string, string[]> = {
      'politics': ['president', 'government', 'election', 'democratic', 'republican', 'senator', 'congress', 'vote', 'campaign', 'political', 'policy', 'biden', 'trump', 'administration', 'legislation'],
      'business': ['market', 'economy', 'stock', 'investment', 'company', 'financial', 'business', 'trade', 'economic', 'industry', 'corporate', 'bank', 'finance', 'profit', 'revenue'],
      'technology': ['tech', 'technology', 'software', 'hardware', 'app', 'digital', 'internet', 'computer', 'ai', 'artificial intelligence', 'cyber', 'smartphone', 'device', 'innovation', 'robot'],
      'health': ['health', 'medical', 'doctor', 'hospital', 'disease', 'patient', 'treatment', 'vaccine', 'medicine', 'healthcare', 'virus', 'covid', 'pandemic', 'clinic', 'symptom'],
      'sports': ['sport', 'team', 'game', 'player', 'championship', 'athlete', 'tournament', 'match', 'league', 'football', 'soccer', 'basketball', 'baseball', 'hockey', 'tennis'],
      'entertainment': ['movie', 'film', 'actor', 'actress', 'celebrity', 'music', 'star', 'hollywood', 'tv', 'television', 'entertainment', 'show', 'award', 'singer', 'performance'],
      'world': ['world', 'international', 'global', 'foreign', 'country', 'nation', 'europe', 'asia', 'africa', 'middle east', 'latin america', 'united nations', 'diplomat', 'treaty', 'overseas']
    };
    
    return articles.map(article => {
      // Combine title, description and content for keyword matching
      const text = [
        article.title || '', 
        article.description || '', 
        article.content || ''
      ].join(' ').toLowerCase();
      
      // Score each category based on keyword matches
      const scores: Record<string, number> = {};
      
      Object.entries(categoryKeywords).forEach(([category, keywords]) => {
        scores[category] = keywords.reduce((score, keyword) => {
          // Count occurrences of each keyword
          const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
          const matches = (text.match(regex) || []).length;
          return score + matches;
        }, 0);
      });
      
      // Sort categories by score (highest first)
      const sortedCategories = Object.entries(scores)
        .filter(([_, score]) => score > 0) // Only include categories with matches
        .sort((a, b) => b[1] - a[1])
        .map(([category]) => category);
      
      // If no categories matched, use 'general'
      const assignedCategories = sortedCategories.length > 0 ? sortedCategories : ['general'];
      
      // Return article with assigned categories
      return {
        ...article,
        category: assignedCategories
      };
    });
  }
}