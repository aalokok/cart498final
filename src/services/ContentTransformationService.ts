import { OpenAIService } from './OpenAIService';
import Article, { IArticle, PoliticalBias } from '../models/Article';
import { ApiError } from '../utils/error';
import { Types } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import pdf from 'pdf-parse';

export class ContentTransformationService {
  private openaiService: OpenAIService;
  private leftDataset: string = '';
  private rightDataset: string = '';
  private datasetsLoaded: boolean = false;

  constructor() {
    this.openaiService = new OpenAIService();
  }

  private async ensureDatasetsLoaded() {
    if (!this.datasetsLoaded) {
      try {
        await this.loadDatasets();
        this.datasetsLoaded = true;
      } catch (error: any) {
        console.error('Error loading datasets:', error);
        // Don't throw here, we'll handle missing datasets in the transform method
      }
    }
  }

  private async loadDatasets() {
    const datasetPath = path.join(__dirname, '..', '..', 'DataSet');
    const leftPdfPath = path.join(datasetPath, 'left.pdf');
    const rightPdfPath = path.join(datasetPath, 'right.pdf');

    try {
      // Check if files exist
      await fs.promises.access(leftPdfPath);
      await fs.promises.access(rightPdfPath);

      // Load and extract text from PDFs
      this.leftDataset = await this.extractTextFromPDF(leftPdfPath);
      this.rightDataset = await this.extractTextFromPDF(rightPdfPath);
      
      console.log('Successfully loaded political bias datasets');
    } catch (error: any) {
      const message = `Failed to load political bias datasets: ${error.message}`;
      console.error(message);
      // Don't throw here, we'll handle missing datasets in the transform method
    }
  }

  private async extractTextFromPDF(pdfPath: string): Promise<string> {
    try {
      const dataBuffer = await fs.promises.readFile(pdfPath);
      const data = await pdf(dataBuffer);
      return data.text;
    } catch (error: any) {
      throw new Error(`Failed to extract text from PDF ${path.basename(pdfPath)}: ${error.message}`);
    }
  }

  /**
   * Transform article content with specified political bias using RAG
   */
  private async transformWithBias(content: string, title: string, bias: PoliticalBias): Promise<string> {
    await this.ensureDatasetsLoaded();
    
    const dataset = bias === 'left' ? this.leftDataset : this.rightDataset;
    
    // If datasets failed to load, fall back to basic transformation
    if (!dataset) {
      console.warn(`Political bias dataset not available for ${bias} bias, falling back to basic transformation`);
      return await this.openaiService.transformContent(content, title);
    }

    // Split dataset into examples for better context
    const examples = dataset.split('\n\n').slice(0, 5).join('\n\n');
    
    const prompt = `You are a ${bias === 'left' ? 'progressive' : 'conservative'} news outlet known for your distinct political perspective. Your task is to rewrite the given news article to match your editorial style while maintaining the core facts.

Reference examples of your writing style:
${examples}

Original Title: ${title}
Original Content: ${content}

Instructions:
1. Maintain the same core facts and events
2. Use language, tone, and framing typical of ${bias === 'left' ? 'progressive' : 'conservative'} media
3. Emphasize aspects that align with ${bias === 'left' ? 'progressive' : 'conservative'} values
4. Add relevant context that supports your perspective
5. Make it engaging and shareable on social media
6. Keep the length similar to the original

Rewrite the article in your distinct political voice while ensuring it remains factual and professional.`;

    const transformedContent = await this.openaiService.transformContent(prompt, title);
    return transformedContent;
  }

  /**
   * Transform article title with specified political bias
   */
  private async transformTitleWithBias(title: string, bias: PoliticalBias): Promise<string> {
    await this.ensureDatasetsLoaded();
    
    const dataset = bias === 'left' ? this.leftDataset : this.rightDataset;
    
    if (!dataset) {
      console.warn(`Political bias dataset not available for ${bias} bias, falling back to basic title transformation`);
      return await this.openaiService.transformTitle(title);
    }

    // Extract headlines from dataset for reference
    const headlines = dataset
      .split('\n')
      .filter(line => line.trim().length > 0)
      .slice(0, 5)
      .join('\n');

    const prompt = `You are a ${bias === 'left' ? 'progressive' : 'conservative'} news editor crafting headlines. Transform this headline to match your editorial style while maintaining accuracy.

Reference headlines from your outlet:
${headlines}

Original headline: ${title}

Create a new headline that:
1. Reflects ${bias === 'left' ? 'progressive' : 'conservative'} values and perspectives
2. Uses engaging language typical of your outlet
3. Maintains factual accuracy
4. Is attention-grabbing and shareable
5. Keeps a similar length to the original`;

    const transformedTitle = await this.openaiService.transformTitle(prompt);
    return transformedTitle;
  }

  /**
   * Process an article through the entire AI transformation pipeline
   */
  async transformArticle(articleId: string, bias: PoliticalBias = 'neutral'): Promise<IArticle> {
    try {
      // Get article from database
      const article = await Article.findById<IArticle>(articleId);
      if (!article) {
        throw new ApiError(404, `Article with ID ${articleId} not found`);
      }

      // Skip if already processed with same bias
      if (article.isProcessed && article.politicalBias === bias) {
        return article;
      }

      try {
        // Step 1: Transform content with political bias
        if (bias !== 'neutral') {
          const transformedContent = await this.transformWithBias(article.content, article.title, bias);
          const transformedTitle = await this.transformTitleWithBias(article.title, bias);
          article.transformedContent = transformedContent;
          article.transformedTitle = transformedTitle;
          article.politicalBias = bias;
        } else {
          // Use original OpenAI transformation for neutral bias
          const transformedContent = await this.openaiService.transformContent(article.content, article.title);
          const transformedTitle = await this.openaiService.transformTitle(article.title);
          article.transformedContent = transformedContent;
          article.transformedTitle = transformedTitle;
          article.politicalBias = 'neutral';
        }
        
        // Save progress
        article.processingStatus = 'text_completed';
        await article.save();

        // Step 2: Generate image based on transformed content
        const imagePrompt = await this.openaiService.generateImagePrompt(
          article.transformedTitle || article.title,
          article.transformedContent || article.content
        );
        const imageUrl = await this.openaiService.generateImage(imagePrompt);
        article.generatedImageUrl = imageUrl;
        article.processingStatus = 'image_completed';
        await article.save();

        article.isProcessed = true;
        await article.save();

        return article;
      } catch (error: any) {
        article.processingStatus = 'error';
        article.processingError = error.message || 'Unknown error occurred';
        await article.save();
        throw error;
      }
    } catch (error: any) {
      throw new ApiError(500, `Failed to transform article: ${error.message || 'Unknown error occurred'}`);
    }
  }

  /**
   * Process all pending articles in the database
   */
  async processPendingArticles(bias: PoliticalBias = 'neutral'): Promise<number> {
    try {
      const pendingArticles = await Article.find<IArticle>({ isProcessed: false });
      let processedCount = 0;

      for (const article of pendingArticles) {
        try {
          await this.transformArticle(article._id.toString(), bias);
          processedCount++;
        } catch (error) {
          console.error(`Error processing article ${article._id.toString()}: ${error}`);
          // Continue with next article even if one fails
          continue;
        }
      }

      return processedCount;
    } catch (error: any) {
      throw new ApiError(500, `Failed to process pending articles: ${error.message}`);
    }
  }

  /**
   * Generate a full article based on an article headline
   */
  async generateFullArticleFromHeadline(articleId: string): Promise<IArticle> {
    try {
      // Get article from database
      const article = await Article.findById<IArticle>(articleId);
      if (!article) {
        throw new ApiError(404, `Article with ID ${articleId} not found`);
      }

      try {
        // Generate a full article from the headline using OpenAI
        const fullArticle = await this.openaiService.generateFullArticleFromHeadline(article.title);
        
        // Update the article with the generated content
        article.content = fullArticle;
        
        // Mark as updated with AI-generated content
        article.isAiGenerated = true;
        
        // Save changes
        await article.save();

        return article;
      } catch (error: any) {
        console.error(`Error generating full article for ${articleId}:`, error);
        throw new ApiError(500, `Failed to generate full article: ${error.message}`);
      }
    } catch (error: any) {
      throw new ApiError(500, `Failed to generate full article: ${error.message || 'Unknown error occurred'}`);
    }
  }

  /**
   * Rewrite an article with a right-wing bias and store it in MongoDB
   */
  async rewriteArticleWithRightWingBias(articleId: string): Promise<IArticle> {
    try {
      // Get article from database
      const article = await Article.findById<IArticle>(articleId);
      if (!article) {
        throw new ApiError(404, `Article with ID ${articleId} not found`);
      }

      try {
        // Skip if already processed with right bias
        if (article.isProcessed && article.politicalBias === 'right') {
          return article;
        }

        // Generate right-wing biased version of the article
        const rightWingContent = await this.openaiService.rewriteWithRightWingBias(
          article.title,
          article.content
        );
        
        // Update the article with the right-wing version
        article.transformedContent = rightWingContent;
        article.politicalBias = 'right';
        article.isProcessed = true;
        article.processingStatus = 'text_completed';
        
        // Save changes
        await article.save();
        
        return article;
      } catch (error: any) {
        article.processingStatus = 'error';
        article.processingError = error.message || 'Unknown error occurred';
        await article.save();
        throw error;
      }
    } catch (error: any) {
      throw new ApiError(500, `Failed to rewrite article with right-wing bias: ${error.message}`);
    }
  }

  /**
   * Process all articles with right-wing bias
   */
  async processAllArticlesWithRightWingBias(limit = 5): Promise<number> {
    try {
      // Find articles that haven't been processed with right-wing bias yet
      const articles = await Article.find({
        $or: [
          { politicalBias: { $ne: 'right' } },
          { politicalBias: null }
        ],
        content: { $exists: true, $ne: '' }
      }).limit(limit);
      
      console.log(`Processing ${articles.length} articles with right-wing bias`);
      
      // Process each article
      let processedCount = 0;
      for (const article of articles) {
        try {
          // Skip if article content is empty or null
          if (!article.content || article.content.trim() === '') {
            console.log(`Skipping article ${article._id} due to empty content.`);
            continue;
          }
          
          // Call the dedicated method to handle rewrite and saving
          await this.rewriteArticleWithRightWingBias(article._id.toString());
          processedCount++;
          console.log(`Successfully processed article ${article._id} with right-wing bias`);
          
          // Add a delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error: any) {
          // Error handling is now inside rewriteArticleWithRightWingBias,
          // but we catch here to log and continue the batch.
          console.error(`Error triggering rewrite for article ${article._id}:`, error.message);
          // No need to update status here, rewriteArticleWithRightWingBias handles it.
        }
        // Add a delay between requests to avoid rate limiting, even if an error occurred
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      return processedCount;
    } catch (error: any) {
      console.error('Error in processAllArticlesWithRightWingBias:', error.message);
      throw new ApiError(500, `Failed to process articles with right-wing bias: ${error.message}`);
    }
  }

  /**
   * Process the 20 articles currently displayed on the website with right-wing bias
   */
  async processDisplayedArticlesWithRightWingBias(): Promise<number> {
    try {
      // Get the same articles that are displayed on the website (20 most recent)
      const articles = await Article.find({
        content: { $exists: true, $ne: '' }
      })
      .sort({ publishedAt: -1 })
      .limit(20);
      
      console.log(`Processing ${articles.length} displayed articles with right-wing bias`);
      
      // Process each article
      let processedCount = 0;
      for (const article of articles) {
        const articleIdStr = article._id.toString();
        try {
          // Skip if article content is empty or null
          if (!article.content || article.content.trim() === '') {
            console.log(`Skipping article ${articleIdStr} due to empty content.`);
            continue;
          }
          
          // Call the dedicated method to handle rewrite and saving
          await this.rewriteArticleWithRightWingBias(articleIdStr);
          processedCount++;
          console.log(`Successfully processed article ${articleIdStr} with right-wing bias`);
        } catch (error: any) {
          // Error handling is now inside rewriteArticleWithRightWingBias,
          // but we catch here to log and continue the batch.
          console.error(`Error triggering rewrite for article ${articleIdStr}:`, error.message);
        }
        // Add a delay between requests to avoid rate limiting, even if an error occurred
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      return processedCount;
    } catch (error: any) {
      console.error('Error in processDisplayedArticlesWithRightWingBias:', error.message);
      throw new ApiError(500, `Failed to process displayed articles with right-wing bias: ${error.message}`);
    }
  }
}