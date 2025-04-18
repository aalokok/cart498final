import express from 'express';
import cors from 'cors';
import path from 'path';
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

// Debug route to check if API is responding
app.get('/api/debug', (req, res) => {
  res.json({
    message: 'API Debug Info',
    env: process.env.NODE_ENV,
    time: new Date().toISOString(),
    headers: req.headers,
    path: req.path
  });
});

// Serve static frontend files in production
if (process.env.NODE_ENV === 'production') {
  // In production, the frontend build is in a different location relative to the server
  const frontendBuildPath = path.join(__dirname, '../frontend/dist');
  console.log(`Serving frontend from: ${frontendBuildPath}`);
  
  // Serve static files from the frontend build
  app.use(express.static(frontendBuildPath));
  
  // Handle any routes not matched by API - serve the SPA's index.html
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendBuildPath, 'index.html'));
    }
  });
}

// !! Important: Connect Database before exporting app !!
// Vercel handles startup differently. Consider connecting on the first request
// or using connection pooling suitable for serverless environments.
// Ensure Mongoose connection logic handles this.
connectDatabase(); // Assuming this handles pooling or connects early

// Error handling middleware - Keep this AFTER your routes
app.use(errorHandler);

// REMOVED scheduleJobs() call

// --- Local Development Server Start --- 
// (Vercel ignores this block because it uses the exported app)
const PORT = env.PORT || 3000; // Ensure PORT is defined

const startLocalServer = async () => {
  try {
    // Ensure DB is connected before listening (redundant if connectDatabase() above awaits)
    // await connectDatabase(); 
    
    app.listen(PORT, () => {
      console.log(`LOCAL Server running in ${env.NODE_ENV} mode on port ${PORT}`);
      console.log(`API available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Error starting LOCAL server:', error);
    process.exit(1);
  }
};

// Only call startLocalServer if not in production (i.e., running locally)
if (process.env.NODE_ENV !== 'production') {
  startLocalServer();
}
// --- End Local Development Server Start ---

// Export the app instance for Vercel
export default app;

// REMOVED old startServer function structure 