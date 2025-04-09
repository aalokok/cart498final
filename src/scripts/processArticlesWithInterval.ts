import mongoose from 'mongoose';
import { env } from '../config/env';
import { OpenAIService } from '../services/OpenAIService';
import ArticleModel from '../models/Article';

// Initialize OpenAI service
const openAIService = new OpenAIService();

// Connect to MongoDB
async function connectDatabase() {
  try {
    await mongoose.connect(env.MONGODB_URI as string);
    console.log('MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return false;
  }
}

// Process one article at a time with right-wing bias
async function processNextArticle(): Promise<boolean> {
  try {
    // Find the next unprocessed article
    const article = await ArticleModel.findOne({
      content: { $exists: true, $ne: '' },
      transformedContent: { $exists: false },
      processingStatus: { $ne: 'error' }
    }).sort({ publishedAt: -1 });

    if (!article) {
      console.log('No more unprocessed articles found');
      return false;
    }

    console.log(`Processing article: ${article.title}`);
    
    try {
      // Rewrite the article with right-wing bias
      const rewrittenContent = await openAIService.rewriteWithRightWingBias(
        article.title,
        article.content
      );
      
      // Update the article in MongoDB
      article.transformedContent = rewrittenContent;
      article.politicalBias = 'right';
      article.isProcessed = true;
      article.processingStatus = 'text_completed';
      await article.save();
      
      console.log(`Successfully processed article ID: ${article._id}`);
      return true;
    } catch (error) {
      console.error(`Error processing article ${article._id}:`, error);
      
      // Mark as error but don't stop the process
      article.processingStatus = 'error';
      article.processingError = error instanceof Error ? error.message : String(error);
      await article.save();
      
      return true; // Continue to next article despite error
    }
  } catch (error) {
    console.error('Error in processNextArticle:', error);
    return false;
  }
}

// Main function that processes articles with interval
async function processArticlesWithInterval() {
  console.log('Starting article processing with one-minute intervals');
  
  // Connect to database
  const connected = await connectDatabase();
  if (!connected) {
    console.error('Failed to connect to database, exiting');
    process.exit(1);
  }
  
  // Count total unprocessed articles
  const totalUnprocessed = await ArticleModel.countDocuments({
    content: { $exists: true, $ne: '' },
    transformedContent: { $exists: false },
    processingStatus: { $ne: 'error' }
  });
  
  console.log(`Found ${totalUnprocessed} unprocessed articles`);
  
  // Process articles one by one with one-minute intervals
  let processed = 0;
  let continueProcessing = true;
  
  while (continueProcessing) {
    // Process one article
    const success = await processNextArticle();
    
    if (success) {
      processed++;
      console.log(`Processed ${processed}/${totalUnprocessed} articles`);
      
      // Check if we've processed all articles
      if (processed >= totalUnprocessed) {
        const remaining = await ArticleModel.countDocuments({
          content: { $exists: true, $ne: '' },
          transformedContent: { $exists: false },
          processingStatus: { $ne: 'error' }
        });
        
        if (remaining === 0) {
          console.log('All articles have been processed!');
          continueProcessing = false;
        } else {
          console.log(`Still ${remaining} articles to process`);
        }
      }
      
      if (continueProcessing) {
        // Wait for one minute before processing the next article
        console.log('Waiting 60 seconds before processing next article...');
        await new Promise(resolve => setTimeout(resolve, 60000));
      }
    } else {
      console.log('No more articles to process or an error occurred');
      continueProcessing = false;
    }
  }
  
  console.log('Article processing completed');
  process.exit(0);
}

// Run the main function
processArticlesWithInterval().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
