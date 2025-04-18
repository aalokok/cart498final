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

// Connect to database
connectDatabase().catch(error => {
  console.error('Error connecting to database:', error);
  process.exit(1);
});

// Always start the server regardless of environment
const PORT = process.env.PORT || env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running in ${env.NODE_ENV} mode on port ${PORT}`);
  
  if (env.NODE_ENV === 'development') {
    console.log(`API available at http://localhost:${PORT}/api/articles`);
  }
  
  // Start scheduled tasks
  scheduleJobs();
});

// Export the app for potential serverless environments
export default app; 