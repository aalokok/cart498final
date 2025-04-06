import mongoose, { Document, Schema } from 'mongoose';

// Interface to define the Article document structure
export interface IArticle extends Document {
  sourceId: string;
  sourceName: string;
  author: string;
  title: string;
  description: string;
  url: string;
  urlToImage: string;
  publishedAt: Date;
  content: string;
  // Transformed content
  transformedTitle: string;
  transformedContent: string;
  generatedImageUrl: string;
  audioUrl: string;
  // Metadata
  category: string;
  isProcessed: boolean;
  processingStatus: 'pending' | 'text_completed' | 'image_completed' | 'audio_completed' | 'completed' | 'error';
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Schema definition
const ArticleSchema: Schema = new Schema(
  {
    // Original article data
    sourceId: { type: String, required: true },
    sourceName: { type: String, required: true },
    author: { type: String, default: 'Unknown' },
    title: { type: String, required: true },
    description: { type: String },
    url: { type: String, required: true, unique: true },
    urlToImage: { type: String },
    publishedAt: { type: Date, required: true },
    content: { type: String, required: true },
    
    // Transformed content
    transformedTitle: { type: String },
    transformedContent: { type: String },
    generatedImageUrl: { type: String },
    audioUrl: { type: String },
    
    // Metadata
    category: { type: String, default: 'general' },
    isProcessed: { type: Boolean, default: false },
    processingStatus: { 
      type: String, 
      enum: ['pending', 'text_completed', 'image_completed', 'audio_completed', 'completed', 'error'],
      default: 'pending'
    },
    errorMessage: { type: String },
  },
  { timestamps: true }
);

// Create and export the model
export default mongoose.model<IArticle>('Article', ArticleSchema); 