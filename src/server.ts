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

// Base route for API testing
app.get('/api', (req, res) => {
  res.json({ 
    message: 'Welcome to The Actual Informer API',
    version: '1.0.0',
    time: new Date().toISOString()
  });
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

// Connect to database
connectDatabase().catch(err => {
  console.error('Database connection error:', err);
});

// Error handling middleware - must be after routes
app.use(errorHandler);

// REMOVED scheduleJobs() call

// --- Local Development Server Start --- 
// (Vercel ignores this block because it uses the exported app)
if (process.env.NODE_ENV !== 'production') {
  const PORT = env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`LOCAL Server running in ${env.NODE_ENV} mode on port ${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
  });
}
// --- End Local Development Server Start ---

// Export the app instance for Vercel
export default app;

// REMOVED old startServer function structure 