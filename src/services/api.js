import axios from 'axios';
import { getSessionToken } from '@shopify/app-bridge/utilities';
import { createApp } from '@shopify/app-bridge';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Get shop from URL
const getShopFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('shop');
};

// Get host from URL
const getHostFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('host');
};

// Create App Bridge instance
let app = null;
const getAppBridge = () => {
  if (!app) {
    const shop = getShopFromUrl();
    const host = getHostFromUrl();
    
    if (shop) {
      try {
         app = createApp({
        apiKey: import.meta.env.VITE_SHOPIFY_API_KEY || 'your_api_key_here',
        host: host || btoa(`${shop}/admin`),
        forceRedirect: false,
      });
      console.log('App Bridge initialized', { shop, host } );
      
      } catch (error) {
        console.error('App Bridge initialization failed - no shop parameter in URL', error);
      }
    } else {
      console.error('No shop parameter in URL - App Bridge not initialized');
    }
  }
  return app;
};

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add request interceptor to include session token
api.interceptors.request.use(async (config) => {
  try {
    const appBridge = getAppBridge();
    
    if (appBridge) {
        console.log('Getting session token for request to', config.url);
      // Get session token from Shopify App Bridge
      const sessionToken = await getSessionToken(appBridge);
        console.log('Session token obtained', sessionToken.substring(0, 10) + '...');
  
      // Add token to Authorization header
      config.headers['Authorization'] = `Bearer ${sessionToken}`;
    } else {
      console.warn('App Bridge not initialized - skipping session token');
    }
    
    // Add shop domain header (for debugging)
    const shop = getShopFromUrl();
    if (shop) {
      config.headers['X-Shopify-Shop-Domain'] = shop;
    }
  } catch (error) {
    console.error('Error getting session token:', error);
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});



// Add response interceptor for debugging
api.interceptors.response.use((response) => {
  console.log('API response:', response.config.url, response.status, response.data);
  return response;
}, (error) => {
  console.error('API error response:', error.response?.config?.url, error.response?.status, error.response?.data);
  return Promise.reject(error);
}); 


// API methods - NO MORE STORE_ID NEEDED!
// Authentication is handled by session token
export const apiService = {
  // Store - authenticated by session token
  getStore: () => api.get('/store'),

  // Setup Wizard - authenticated by session token
  saveSetup: (data) => api.post('/setup', data),

  getSettings: () => api.get('/settings'),

  updateSettings: (data) => api.put('/settings', data),

  // Dashboard - authenticated by session token
  getLowStock: () => api.get('/dashboard/low-stock'),

  getStats: () => api.get('/dashboard/stats'),

  getTrend: (days = 30) => api.get(`/dashboard/trend?days=${days}`),
};

export default apiService;