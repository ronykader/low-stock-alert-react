// src/services/api.js
import axios from 'axios';
import { getSessionToken } from '@shopify/app-bridge/utilities';
import { createApp } from '@shopify/app-bridge';

// Environment configuration
class EnvironmentConfig {
  static isProduction() {
    return import.meta.env.PROD || window.location.hostname !== 'localhost';
  }

  static getApiBaseUrl() {
    if (this.isProduction()) {
      return import.meta.env.VITE_API_BASE_URL || 'https://lsa-shopify.w3zones.com/api';
    }
    return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
  }

  static getShopifyApiKey() {
    return import.meta.env.VITE_SHOPIFY_API_KEY;
  }

  static logEnvironment() {
    console.group('🌍 Environment Configuration');
    console.log('Mode:', import.meta.env.MODE);
    console.log('Production:', this.isProduction());
    console.log('Development:', this.isDevelopment());
    console.log('API Base URL:', this.getApiBaseUrl());
    console.log('Hostname:', window.location.hostname);
    console.log('Shopify API Key Present:', !!this.getShopifyApiKey());
    console.groupEnd();
  }

  static isDevelopment() {
    return import.meta.env.DEV || window.location.hostname === 'localhost';
  }
}

// Shopify App Configuration
class ShopifyAppConfig {
  static getShopDomain() {
    const params = new URLSearchParams(window.location.search);
    return params.get('shop');
  }

  static getHost() {
    const params = new URLSearchParams(window.location.search);
    return params.get('host');
  }

  static validateAppContext() {
    const shop = this.getShopDomain();
    const host = this.getHost();
    const isEmbedded = !!(shop && host);

    console.group('🛍️ Shopify App Context');
    console.log('Shop:', shop);
    console.log('Host:', host ? `${host.substring(0, 20)}...` : 'missing');
    console.log('Is Embedded:', isEmbedded);
    console.log('Full URL:', window.location.href);
    console.groupEnd();

    return { shop, host, isEmbedded };
  }
}

// App Bridge Service
class AppBridgeService {
  static instance = null;

  static getInstance() {
    if (this.instance) return this.instance;

    const { shop, host } = ShopifyAppConfig.validateAppContext();
    const apiKey = EnvironmentConfig.getShopifyApiKey();

    if (!apiKey) {
      console.error('❌ Missing VITE_SHOPIFY_API_KEY');
      return null;
    }

    if (!shop || !host) {
      console.warn('⚠️ Cannot initialize App Bridge: Missing shop or host parameters');
      return null;
    }

    try {
      this.instance = createApp({
        apiKey: apiKey,
        host: host,
        forceRedirect: true,
      });
      
      console.log('✅ App Bridge initialized');
      return this.instance;
    } catch (error) {
      console.error('❌ App Bridge creation failed:', error);
      return null;
    }
  }

  static async getSessionToken() {
    try {
      const app = this.getInstance();
      if (!app) {
        throw new Error('App Bridge not available');
      }
      
      const token = await getSessionToken(app);
      return token;
    } catch (error) {
      console.error('❌ Failed to get session token:', error);
      throw error;
    }
  }
}

// API Service
class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: EnvironmentConfig.getApiBaseUrl(),
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    this.setupInterceptors();
  }

  setupInterceptors() {
    this.client.interceptors.request.use(
      async (config) => {
        const shop = ShopifyAppConfig.getShopDomain();
        
        if (shop) {
          config.headers['X-Shopify-Shop-Domain'] = shop;
        }

        if (shop && !config.url?.includes('/public')) {
          try {
            const token = await AppBridgeService.getSessionToken();
            config.headers['Authorization'] = `Bearer ${token}`;
          } catch (error) {
            console.warn('⚠️ Proceeding without session token');
          }
        }

        console.log(`➡️ ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ Request setup failed:', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        if (error.response) {
          console.error(`❌ ${error.response.status} ${error.config?.url}:`, error.response.data);
        } else if (error.request) {
          console.error('❌ No response received:', error.config?.url);
        } else {
          console.error('❌ Request error:', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  // API methods
  getStore() {
    return this.client.get('/store');
  }

  saveSetup(data) {
    return this.client.post('/setup', data);
  }

  getSettings() {
    return this.client.get('/settings');
  }

  updateSettings(data) {
    return this.client.put('/settings', data);
  }

  getLowStock() {
    return this.client.get('/dashboard/low-stock');
  }

  getStats() {
    return this.client.get('/dashboard/stats');
  }

  getTrend(days = 30) {
    return this.client.get(`/dashboard/trend?days=${days}`);
  }

  healthCheck() {
    return this.client.get('/health');
  }
}

// Create and export the service instance
const apiService = new ApiService();

// Export everything that should be available to other files
export { 
  EnvironmentConfig, 
  ShopifyAppConfig, 
  AppBridgeService 
};

export default apiService;