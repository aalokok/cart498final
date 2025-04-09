import mongoose, { Document, Schema, Types } from 'mongoose';

export type PoliticalBias = 'left' | 'right' | 'neutral';

// Interface to define the Article document structure
export interface IArticle extends Document {
  _id: Types.ObjectId;
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
  explanation: string; // AI-generated explanation
  // Metadata
  category: string;
  isProcessed: boolean;
  isAiGenerated: boolean;
  politicalBias: PoliticalBias;
  processingStatus: 'pending' | 'text_completed' | 'image_completed' | 'audio_completed' | 'completed' | 'error';
  processingError?: string;
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
    explanation: { type: String }, // AI-generated explanation
    
    // Metadata
    category: { type: String, required: true },
    isProcessed: { type: Boolean, default: false },
    isAiGenerated: { type: Boolean, default: false },
    politicalBias: { 
      type: String,
      enum: ['left', 'right', 'neutral'],
      default: 'neutral'
    },
    processingStatus: {
      type: String,
      enum: ['pending', 'text_completed', 'image_completed', 'audio_completed', 'completed', 'error'],
      default: 'pending'
    },
    processingError: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IArticle>('Article', ArticleSchema);