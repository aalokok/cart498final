import express from 'express';
import cors from 'cors';
import { connectDatabase } from './config/database';
import { env, validateEnv } from './config/env';
import { errorHandler } from './utils/error';
import { scheduleJobs } from './utils/scheduler';
import articleRoutes from './routes/articleRoutes';

// Validate environment variables first
// If required variables (like MONGODB_URI) are missing on Render, this will exit
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
});

// Determine the port - Trust Render's environment variable
const PORT: number = parseInt(process.env.PORT || '3000', 10); // Use Render's PORT or default to 3000
console.log(`[Server Startup] Render process.env.PORT: '${process.env.PORT}'`);
console.log(`[Server Startup] Using PORT: ${PORT}`);

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server Startup] Successfully listening on port ${PORT}`);
  console.log(`Server running in ${env.NODE_ENV} mode`);

  // Start scheduled tasks
  // console.log(`[Server Startup] Starting scheduled jobs...`); // Keep disabled for now
  // scheduleJobs(); // Keep disabled for now
  // console.log(`[Server Startup] Scheduled jobs initiated.`); // Keep disabled for now
});

// Log any potential unhandled errors during startup
app.on('error', (error) => {
  console.error('[Server Startup] Express app error event:', error);
});

// Export for serverless environments (Vercel)
export default app; 