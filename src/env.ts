import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export interface Environment {
  NODE_ENV: string;
  PORT: number;
  NEWS_API_KEY: string | undefined;
  MONGODB_URI: string | undefined;
}

export const env: Environment = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  NEWS_API_KEY: process.env.NEWS_API_KEY,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/actual-informer'
};

// Validate that required environment variables are set
export const validateEnv = (): void => {
  const requiredVars: Array<keyof Environment> = ['NEWS_API_KEY'];
  
  for (const varName of requiredVars) {
    if (!env[varName]) {
      console.warn(`Warning: Environment variable ${varName} is not set.`);
    }
  }
  
  // Check if MongoDB URI is set
  if (!env.MONGODB_URI) {
    console.log('MongoDB URI not provided, using default local connection');
  }
};
