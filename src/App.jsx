// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from '@shopify/polaris';
import { Provider as AppBridgeProvider } from '@shopify/app-bridge-react';
import '@shopify/polaris/build/esm/styles.css';
import Dashboard from './pages/Dashboard';
import SetupWizard from './pages/SetupWizard';
import { useEffect, useState } from 'react';
import { EnvironmentConfig, ShopifyAppConfig } from './services/api';

export default function App() {
  const [appContext, setAppContext] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check environment and Shopify context
    EnvironmentConfig.logEnvironment();
    const context = ShopifyAppConfig.validateAppContext();
    setAppContext(context);
    setLoading(false);

    console.log('🔧 App Configuration:', {
      shop: context.shop,
      host: context.host,
      hasApiKey: !!import.meta.env.VITE_SHOPIFY_API_KEY
    });
  }, []);

  // Get shop and host using the validated context
  const shop = appContext?.shop;
  const host = appContext?.host;

  // App Bridge configuration
  const config = {
    apiKey: import.meta.env.VITE_SHOPIFY_API_KEY,
    host: host,
    forceRedirect: false,
  };

  // Show loading state
  if (loading) {
    return (
      <AppProvider i18n={{}}>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h1>Loading App...</h1>
          <p>Checking Shopify configuration...</p>
        </div>
      </AppProvider>
    );
  }

  // If no shop parameter, show error
  if (!shop) {
    return (
      <AppProvider i18n={{}}>
        <div style={{ 
          padding: '40px', 
          textAlign: 'center',
          maxWidth: '600px',
          margin: '50px auto',
          border: '1px solid #e1e5e9',
          borderRadius: '8px'
        }}>
          <h1>⚠️ App Not Properly Loaded</h1>
          <p>This app must be accessed through the Shopify Admin.</p>
          <div style={{ 
            background: '#f6f6f7', 
            padding: '15px', 
            borderRadius: '4px', 
            margin: '20px 0',
            textAlign: 'left',
            fontSize: '14px'
          }}>
            <p><strong>How to access correctly:</strong></p>
            <ol style={{ textAlign: 'left', paddingLeft: '20px' }}>
              <li>Install the app from the Shopify App Store</li>
              <li>Open your Shopify Admin</li>
              <li>Click on the app from your Apps list</li>
            </ol>
          </div>
          <p style={{ fontSize: '14px', color: '#637381', marginTop: '20px' }}>
            Current URL: {window.location.href}
          </p>
        </div>
      </AppProvider>
    );
  }

  console.log('🚀 Starting App with config:', {
    shop,
    host: host ? `${host.substring(0, 20)}...` : 'missing',
    apiKey: import.meta.env.VITE_SHOPIFY_API_KEY ? 'present' : 'missing'
  });

  return (
    <AppBridgeProvider config={config}>
      <AppProvider i18n={{}}>
        <Router>
          <Routes>
            <Route path="/setup-wizard" element={<SetupWizard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AppProvider>
    </AppBridgeProvider>
  );
}