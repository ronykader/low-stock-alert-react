import axios from 'axios';
import { getSessionToken } from '@shopify/app-bridge/utilities';
import { createApp } from '@shopify/app-bridge';

// Environment-aware configuration
class EnvironmentConfig {
  static isProduction() {
    return import.meta.env.PROD || 
           import.meta.env.MODE === 'production' ||
           window.location.hostname !== 'localhost';
  }

  static isDevelopment() {
    return import.meta.env.DEV || 
           import.meta.env.MODE === 'development' ||
           window.location.hostname === 'localhost';
  }

  static getApiBaseUrl() {
    // Priority: .env.production > .env.local > default
    if (this.isProduction()) {
      return import.meta.env.VITE_API_BASE_URL || 'https://lsa-shopify.w3zones.com/api';
    }
    return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
  }

  static getShopifyApiKey() {
    // Use production API key from .env.production on VPS
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
}

// Shopify App Standards
class ShopifyAppConfig {
  static isEmbedded() {
    // Check if app is running in Shopify Admin (embedded in iframe)
    return window.self !== window.top || 
           document.referrer.includes('myshopify.com') ||
           window.location.search.includes('embedded=1');
  }

  static getShopDomain() {
    const params = new URLSearchParams(window.location.search);
    const shop = params.get('shop');
    
    // Validate shop domain format
    if (shop && shop.endsWith('.myshopify.com')) {
      return shop;
    }
    
    // For development, allow localhost with shop parameter
    if (EnvironmentConfig.isDevelopment() && shop) {
      console.warn('Development mode: Using shop parameter without validation');
      return shop;
    }
    
    return null;
  }

  static getHost() {
    const params = new URLSearchParams(window.location.search);
    const host = params.get('host');
    
    // Host is required for App Bridge in production
    if (host) {
      return host;
    }
    
    // In development, generate host from shop
    if (EnvironmentConfig.isDevelopment()) {
      const shop = this.getShopDomain();
      if (shop) {
        const generatedHost = btoa(`${shop}/admin`);
        console.warn('Development: Generated host parameter', generatedHost);
        return generatedHost;
      }
    }
    
    return null;
  }

  static validateAppContext() {
    const shop = this.getShopDomain();
    const host = this.getHost();
    const isEmbedded = this.isEmbedded();

    console.group('🔍 Shopify App Context');
    console.log('Environment:', EnvironmentConfig.isProduction() ? 'Production' : 'Development');
    console.log('Shop:', shop);
    console.log('Host:', host);
    console.log('Is Embedded:', isEmbedded);
    console.log('Full URL:', window.location.href);
    console.groupEnd();

    return { shop, host, isEmbedded };
  }
}

// App Bridge Singleton
class AppBridgeService {
  static instance = null;

  static getInstance() {
    if (!this.instance) {
      const { shop, host, isEmbedded } = ShopifyAppConfig.validateAppContext();
      const apiKey = EnvironmentConfig.getShopifyApiKey();
      
      if (!apiKey) {
        console.error('🚫 Cannot initialize App Bridge: Missing VITE_SHOPIFY_API_KEY in environment variables');
        return null;
      }

      if (!shop) {
        console.error('🚫 Cannot initialize App Bridge: Missing shop parameter');
        return null;
      }

      if (!host && EnvironmentConfig.isProduction()) {
        console.error('🚫 Cannot initialize App Bridge: Missing host parameter in production');
        return null;
      }

      try {
        this.instance = createApp({
          apiKey: apiKey,
          host: host,
          forceRedirect: true,
        });
        
        console.log('✅ App Bridge initialized successfully');
      } catch (error) {
        console.error('❌ App Bridge initialization failed:', error);
        this.instance = null;
      }
    }

    return this.instance;
  }

  static async getSessionToken() {
    const app = this.getInstance();
    if (!app) {
      throw new Error('App Bridge not initialized - check shop and host parameters');
    }

    try {
      const token = await getSessionToken(app);
      console.log('🔑 Session token obtained');
      return token;
    } catch (error) {
      console.error('❌ Failed to get session token:', error);
      throw error;
    }
  }
}

// API Service with Environment Awareness
class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: EnvironmentConfig.getApiBaseUrl(),
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      timeout: 30000,
    });

    this.setupInterceptors();
    
    // Log environment on initialization
    EnvironmentConfig.logEnvironment();
  }

  setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        try {
          const shop = ShopifyAppConfig.getShopDomain();
          
          // Always add shop domain header when available
          if (shop) {
            config.headers['X-Shopify-Shop-Domain'] = shop;
          }

          // Add session token for authenticated requests
          if (this.requiresAuthentication(config)) {
            try {
              const token = await AppBridgeService.getSessionToken();
              config.headers['Authorization'] = `Bearer ${token}`;
            } catch (tokenError) {
              if (EnvironmentConfig.isProduction()) {
                console.error('🚫 Production: Cannot proceed without session token');
                throw tokenError;
              } else {
                console.warn('⚠️ Development: Continuing without session token');
              }
            }
          }

          console.log(`🚀 ${EnvironmentConfig.isProduction() ? 'Production' : 'Development'} API Request: ${config.method?.toUpperCase()} ${config.url}`);
          return config;
        } catch (error) {
          console.error('❌ Request interceptor error:', error);
          throw error;
        }
      },
      (error) => {
        console.error('❌ Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ API Success: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        const { status, data, config } = error.response || {};
        
        console.error(`❌ API Error: ${status} ${config?.url}`, {
          message: data?.message,
          code: data?.error,
          environment: EnvironmentConfig.isProduction() ? 'Production' : 'Development'
        });

        // Handle specific error cases
        if (status === 401) {
          console.warn('🔐 Authentication failed');
        } else if (status === 403) {
          console.error('🚫 Access forbidden - check app permissions');
        } else if (status === 404) {
          console.error('🔍 Endpoint not found - check API routes');
        } else if (status >= 500) {
          console.error('🔥 Server error - check backend services');
        }

        // In production, provide user-friendly error messages
        if (EnvironmentConfig.isProduction() && status >= 500) {
          // You could trigger a user notification here
          console.error('Please check your backend server configuration');
        }

        return Promise.reject(error);
      }
    );
  }

  requiresAuthentication(config) {
    // Public endpoints that don't require authentication
    const publicEndpoints = [
      '/health',
      '/public',
    ];
    
    return !publicEndpoints.some(endpoint => 
      config.url?.includes(endpoint)
    );
  }

  // Store operations
  getStore() {
    return this.client.get('/store');
  }

  // Setup operations
  saveSetup(data) {
    return this.client.post('/setup', data);
  }

  getSettings() {
    return this.client.get('/settings');
  }

  updateSettings(data) {
    return this.client.put('/settings', data);
  }

  // Dashboard operations
  getLowStock() {
    return this.client.get('/dashboard/low-stock');
  }

  getStats() {
    return this.client.get('/dashboard/stats');
  }

  getTrend(days = 30) {
    return this.client.get(`/dashboard/trend?days=${days}`);
  }

  // Health check (public endpoint example)
  healthCheck() {
    return this.client.get('/health');
  }
}

// Initialize and export
export const apiService = new ApiService();

// Export individual methods for convenience
export const { 
  getStore, 
  saveSetup, 
  getSettings, 
  updateSettings, 
  getLowStock, 
  getStats, 
  getTrend,
  healthCheck 
} = apiService;

// Export utilities for external use
export { ShopifyAppConfig, AppBridgeService, EnvironmentConfig };

export default apiService;