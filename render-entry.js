// Simple entry point for Render.com deployment
const http = require('http');

// Create a basic HTTP server that responds to all requests
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Server is running');
});

// Get the port from the environment variable
const PORT = process.env.PORT || 10000;

// Start the server
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

// Start the main application in a separate process
try {
  console.log('Starting main application...');
  require('./dist/server');
  console.log('Main application started successfully');
} catch (error) {
  console.error('Error starting main application:', error);
} 