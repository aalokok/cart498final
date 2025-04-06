import { OpenAIService } from './OpenAIService';
import { ElevenLabsService } from './ElevenLabsService';
import Article, { IArticle } from '../models/Article';
import { ApiError } from '../utils/error';
import { Types } from 'mongoose';

export class ContentTransformationService {
  private openaiService: OpenAIService;
  private elevenLabsService: ElevenLabsService;

  constructor() {
    this.openaiService = new OpenAIService();
    this.elevenLabsService = new ElevenLabsService();
  }

  /**
   * Process an article through the entire AI transformation pipeline
   */
  async transformArticle(articleId: string): Promise<IArticle> {
    try {
      // Get article from database
      const article = await Article.findById(articleId);
      if (!article) {
        throw new ApiError(404, `Article with ID ${articleId} not found`);
      }

      // Skip if already processed
      if (article.isProcessed) {
        return article;
      }

      try {
        // Step 1: Transform title
        const transformedTitle = await this.openaiService.transformTitle(article.title);
        article.transformedTitle = transformedTitle;
        article.processingStatus = 'text_completed';
        await article.save();

        // Step 2: Transform content
        const transformedContent = await this.openaiService.transformContent(article.content, transformedTitle);
        article.transformedContent = transformedContent;
        await article.save();

        // Step 3: Generate image
        const imagePrompt = await this.openaiService.generateImagePrompt(transformedTitle, transformedContent);
        const imageUrl = await this.openaiService.generateImage(imagePrompt);
        article.generatedImageUrl = imageUrl;
        article.processingStatus = 'image_completed';
        await article.save();

        // Step 4: Generate audio (placeholder for now)
        const audioUrl = await this.elevenLabsService.generateAudio(transformedContent.substring(0, 500));
        article.audioUrl = audioUrl;
        article.processingStatus = 'audio_completed';
        await article.save();

        // Mark as fully processed
        article.isProcessed = true;
        article.processingStatus = 'completed';
        await article.save();

        return article;
      } catch (error: any) {
        // Update article with error status
        article.processingStatus = 'error';
        article.errorMessage = error.message;
        await article.save();
        throw error;
      }
    } catch (error: any) {
      console.error('Error in content transformation pipeline:', error.message);
      throw new ApiError(500, `Content transformation failed: ${error.message}`);
    }
  }

  /**
   * Process all pending articles
   */
  async processAllPendingArticles(): Promise<number> {
    try {
      const pendingArticles = await Article.find<IArticle>({ 
        isProcessed: false,
        processingStatus: { $ne: 'error' }
      }).sort({ publishedAt: -1 });

      console.log(`Found ${pendingArticles.length} pending articles to process`);

      let processedCount = 0;
      for (const article of pendingArticles) {
        try {
          if (article._id) {
            await this.transformArticle(article._id.toString());
            processedCount++;
          }
        } catch (error: any) {
          console.error(`Error processing article:`, error.message);
          // Continue with next article
        }
      }

      return processedCount;
    } catch (error: any) {
      console.error('Error processing pending articles:', error.message);
      throw new ApiError(500, `Failed to process pending articles: ${error.message}`);
    }
  }
} 