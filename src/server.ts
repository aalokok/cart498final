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

// Start server
const PORT = env.PORT;

// Connect to database immediately for Vercel serverless environment
connectDatabase().catch(error => {
  console.error('Error connecting to database:', error);
  process.exit(1);
});

// Only start the server in development mode
if (env.NODE_ENV === 'development') {
  app.listen(PORT, () => {
    console.log(`Server running in ${env.NODE_ENV} mode on port ${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api/articles`);
    
    // Start scheduled tasks using the new cron-based scheduler
    scheduleJobs();
  });
} else {
  // In production (Vercel), we're in a serverless environment
  // The scheduler will need to be handled differently (e.g., with Vercel Cron)
  console.log('Running in serverless mode');
}

// Export for serverless
export default app; 