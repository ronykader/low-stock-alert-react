
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from '@shopify/polaris';
import { Provider as AppBridgeProvider } from '@shopify/app-bridge-react';
import '@shopify/polaris/build/esm/styles.css';
import Dashboard from './pages/Dashboard';
import SetupWizard from './pages/SetupWizard';
import { useEffect } from 'react';

export default function App() {
    useEffect(() => {
  if (window.parent) {
    const parentOrigin = document.referrer || "*"; // referrer is usually Shopify admin origin
    window.parent.postMessage({ type: "APP_LOADED" }, parentOrigin);
  }
}, []);

    // Get shop domain and host from URL parameters
  const params = new URLSearchParams(window.location.search);
  const shop = params.get('shop');
  const host = params.get('host');

   // App Bridge configuration for Shopify authentication
  const config = {
    apiKey: import.meta.env.VITE_SHOPIFY_API_KEY || 'your_api_key_here',
    host: host || (shop ? btoa(`${shop}/admin`) : ''),
    forceRedirect: false,
  };

  // If no shop parameter, show error (app must be accessed through Shopify)
  if (!shop) {
    return (
      <AppProvider i18n={{}} config={config}>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h1>⚠️ Invalid Access</h1>
          <p>This app must be accessed through Shopify Admin.</p>
          <p style={{ fontSize: '14px', color: '#637381', marginTop: '20px' }}>
            Please install the app from your Shopify store.
          </p>
        </div>
      </AppProvider>
    );
  }


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