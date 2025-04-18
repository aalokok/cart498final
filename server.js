// This is a simple wrapper to load the compiled TypeScript server
// It ensures that Vercel can find the entry point more reliably

// Load the compiled TypeScript server
const app = require('./dist/server').default;
 
// Export the Express app for Vercel
module.exports = app; 