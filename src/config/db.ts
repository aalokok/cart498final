import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// MongoDB Connection URI - use local MongoDB by default if no URI is provided
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/the-actual-informer';

const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB Connected Successfully');
    
    // Optional: Log additional connection info
    const connection = mongoose.connection;
    connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    connection.once('open', () => {
      console.log('MongoDB connection established');
    });
    
  } catch (error) {
    console.error('MongoDB connection error:', error);
    // Exit process with failure
    process.exit(1);
  }
};

export default connectDB;
