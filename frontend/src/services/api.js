import axios from 'axios';

// Create a configurable axios instance
const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Add request interceptor for any preprocessing
api.interceptors.request.use(
  (config) => {
    // You can modify the request here before it's sent
    return config;
  },
  (error) => {
    // Handle request errors
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for global error handling
api.interceptors.response.use(
  (response) => {
    // Any status code within the range of 2xx
    return response;
  },
  (error) => {
    // Handle specific error cases
    if (error.response) {
      // Server responded with error status
      console.error('API Response Error:', error.response.status, error.response.data);
    } else if (error.request) {
      // Request made but no response received
      console.error('API No Response Error:', error.request);
    } else {
      // Error in setting up the request
      console.error('API Setup Error:', error.message);
    }
    
    // Reject the promise so it can be caught by the caller
    return Promise.reject(error);
  }
);

// API service methods
export default {
  // Articles endpoints
  articles: {
    getAll(params = {}) {
      return api.get('/articles', { params });
    },
    
    getById(id) {
      return api.get(`/articles/${id}`);
    },
    
    rewriteArticleExtremeRight(id) {
      console.log(`[api.js] Calling rewrite extreme right for ID: ${id}`);
      return api.post(`/articles/${id}/rewrite-extreme-right`);
    },
    
    rewriteArticleExtremeLeft(id) {
      console.log(`[api.js] Calling rewrite extreme left for ID: ${id}`);
      return api.post(`/articles/${id}/rewrite-extreme-left`);
    }
  }
};
