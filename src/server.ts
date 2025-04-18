import express from 'express';
import cors from 'cors';
import { connectDatabase } from './config/database';
import { env, validateEnv } from './config/env';
import { errorHandler } from './utils/error';
import { scheduleJobs } from './utils/scheduler';
import articleRoutes from './routes/articleRoutes';

// Validate environment variables
validateEnv();

// Create Express application
const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:8080', 'https://theactualinformer.vercel.app', 'https://the-actual-informer.onrender.com'],
  credentials: true
}));
app.use(express.json());

// API Routes
app.use('/api/articles', articleRoutes);

// Base route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to The Actual Informer API' });
});

// Not found middleware
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Error handling middleware
app.use(errorHandler);

// Connect to database immediately for Vercel serverless environment
connectDatabase().catch(error => {
  console.error('Error connecting to database:', error);
  process.exit(1);
});

// Get the port
const PORT = process.env.PORT || env.PORT || 3000;

// Start the server in both development and production
app.listen(PORT, () => {
  console.log(`Server running in ${env.NODE_ENV} mode on port ${PORT}`);
  
  // Only log the API URL in development
  if (env.NODE_ENV === 'development') {
    console.log(`API available at http://localhost:${PORT}/api/articles`);
  }
  
  // Start scheduled tasks in both environments
  scheduleJobs();
});

// Also export for serverless environments (Vercel)
export default app; 