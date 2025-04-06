import axios from 'axios';
import { env } from '../config/env';
import { ApiError } from '../utils/error';
import Article, { IArticle } from '../models/Article';

// Interface for News API response
interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: Array<{
    source: {
      id: string | null;
      name: string;
    };
    author: string | null;
    title: string;
    description: string | null;
    url: string;
    urlToImage: string | null;
    publishedAt: string;
    content: string | null;
  }>;
}

export class NewsService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = env.NEWS_API_KEY;
    this.baseUrl = 'https://newsapi.org/v2';
  }

  /**
   * Fetch latest news articles from News API
   */
  async fetchLatestNews(category: string = 'general', pageSize: number = 10): Promise<void> {
    try {
      if (!this.apiKey) {
        throw new ApiError(500, 'News API key is not configured');
      }

      const response = await axios.get<NewsApiResponse>(`${this.baseUrl}/top-headlines`, {
        params: {
          apiKey: this.apiKey,
          country: 'us',
          category,
          pageSize,
        },
      });

      const { articles } = response.data;

      // Process and save each article
      for (const article of articles) {
        // Skip articles without content
        if (!article.content) continue;

        // Check if article already exists
        const existingArticle = await Article.findOne({ url: article.url });
        if (existingArticle) continue;

        // Create new article
        await Article.create({
          sourceId: article.source.id || 'unknown',
          sourceName: article.source.name,
          author: article.author || 'Unknown',
          title: article.title,
          description: article.description || '',
          url: article.url,
          urlToImage: article.urlToImage || '',
          publishedAt: new Date(article.publishedAt),
          content: article.content,
          category,
          isProcessed: false,
          processingStatus: 'pending',
        });
      }

      console.log(`Fetched and saved ${articles.length} articles from News API`);
    } catch (error: any) {
      console.error('Error fetching news:', error.message);
      throw new ApiError(500, `Failed to fetch news: ${error.message}`);
    }
  }

  /**
   * Get all articles from database
   */
  async getAllArticles(limit: number = 50): Promise<IArticle[]> {
    return Article.find()
      .sort({ publishedAt: -1 })
      .limit(limit);
  }

  /**
   * Get article by ID
   */
  async getArticleById(id: string): Promise<IArticle | null> {
    return Article.findById(id);
  }

  /**
   * Get articles that need processing
   */
  async getPendingArticles(): Promise<IArticle[]> {
    return Article.find({ isProcessed: false })
      .sort({ publishedAt: -1 });
  }
} 