import dotenv from 'dotenv';

dotenv.config();

export const env = {
  // Server Configuration
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  LOG_LEVEL: process.env.LOG_LEVEL, // Optional log level (e.g., 'info', 'debug')

  // Database Configuration
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/actual-informer',
  
  // API Keys
  NEWS_API_KEY: process.env.NEWS_API_KEY || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY || '',
  
  // Settings
  NEWS_REFRESH_INTERVAL_MINUTES: parseInt(process.env.NEWS_REFRESH_INTERVAL_MINUTES || '60', 10),
} as const;

type EnvKeys = keyof typeof env;

// Validate environment variables
export const validateEnv = (): void => {
  const requiredEnvVars: EnvKeys[] = [
    'NEWS_API_KEY',
    'OPENAI_API_KEY',
    'ELEVENLABS_API_KEY',
  ];

  for (const envVar of requiredEnvVars) {
    if (typeof env[envVar] === 'string' && env[envVar].length === 0) {
      console.warn(`Environment variable ${envVar} is not set. Some features may not work properly.`);
    }
  }
};