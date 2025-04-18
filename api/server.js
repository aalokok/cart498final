// Import required to register TypeScript
require('ts-node').register();

// Import your backend server
const { default: app } = require('../src/server');
 
// Export the Express app for Vercel
module.exports = (req, res) => {
  // Forward the request to your Express app
  return app(req, res);
}; 