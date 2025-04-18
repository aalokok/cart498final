import express from 'express';
import cors from 'cors';
import { connectDatabase } from './config/database';
import { env, validateEnv } from './config/env';
import { errorHandler } from './utils/error';
// import { scheduleJobs } from './utils/scheduler'; // Removed scheduler import
import articleRoutes from './routes/articleRoutes';

// Validate environment variables
validateEnv();

// Create Express application
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/articles', articleRoutes);

// Base route (Optional for API, good for testing)
app.get('/api', (req, res) => { // Changed route slightly for clarity
  res.json({ message: 'Welcome to The Actual Informer API' });
});

// !! Important: Connect Database before exporting app !!
// Vercel handles startup differently. Consider connecting on the first request
// or using connection pooling suitable for serverless environments.
// Ensure Mongoose connection logic handles this.
connectDatabase(); // Assuming this handles pooling or connects early

// Error handling middleware - Keep this AFTER your routes
app.use(errorHandler);

// REMOVED scheduleJobs() call

// Export the app instance for Vercel
export default app;

// REMOVED startServer function and app.listen() 