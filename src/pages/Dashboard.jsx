import { useState, useEffect } from 'react';
import {
  Page,
  Layout,
  Card,
  DataTable,
  Text,
  Button,
  Banner,
  BlockStack,
  InlineGrid,
  EmptyState,
  Spinner,
  Badge,
  Link
} from '@shopify/polaris';
import { apiService } from '../services/api';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [store, setStore] = useState(null);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [stats, setStats] = useState({});

  console.log(store);
  

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');

    try {
      // No store_id needed - authenticated via session token
      const [storeRes, lowStockRes, statsRes] = await Promise.all([
        apiService.getStore(),
        apiService.getLowStock(),
        apiService.getStats(),
      ]);

      setStore(storeRes.data.store);
      setLowStockItems(lowStockRes.data.low_stock_items);
      setStats(lowStockRes.data.stats);
    } catch (err) {
      console.error('Dashboard error:', err);
      setError(err.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsClick = () => {
    // Keep shop and host parameters for App Bridge
    const params = new URLSearchParams(window.location.search);
    window.location.href = `/setup-wizard?${params.toString()}`;
  };

  const rows = lowStockItems.map((item) => [
    item.product_name,
    item.variant_name || '-',
    item.sku || '-',
    <Badge tone={item.stock_quantity <= stats.threshold / 2 ? 'critical' : 'warning'}>
      {item.stock_quantity} units
    </Badge>,
    <Link url={item.shopify_admin_url} external>
      View in Shopify
    </Link>
  ]);

  if (loading) {
    return (
      <Page title="Dashboard">
        <Card>
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <Spinner size="large" />
            <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
              Loading dashboard...
            </Text>
          </div>
        </Card>
      </Page>
    );
  }

  return (
    <Page
      title="Low Stock Dashboard"
      subtitle={store ? `${store.name}` : ''}
      primaryAction={{
        content: 'Refresh',
        onAction: fetchDashboardData,
      }}
      secondaryActions={[
        {
          content: 'Settings',
          onAction: handleSettingsClick
        }
      ]}
    >
      <BlockStack gap="500">
        {error && (
          <Banner status="critical" onDismiss={() => setError('')}>
            {error}
          </Banner>
        )}

        {/* Stats Cards */}
        <Layout>
          <Layout.Section>
            <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
              <Card>
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Low Stock Items
                  </Text>
                  <Text as="h2" variant="heading2xl">
                    {stats.total_low_stock || 0}
                  </Text>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Critically Low
                  </Text>
                  <Text as="h2" variant="heading2xl" tone="critical">
                    {stats.critically_low || 0}
                  </Text>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Your Threshold
                  </Text>
                  <Text as="h2" variant="heading2xl">
                    {stats.threshold || 10}
                  </Text>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Last Check
                  </Text>
                  <Text as="h2" variant="headingLg">
                    {stats.last_check || 'N/A'}
                  </Text>
                </BlockStack>
              </Card>
            </InlineGrid>
          </Layout.Section>
        </Layout>

        {/* Coming Soon Banner */}
        <Banner status="info">
          <BlockStack gap="200">
            <Text as="p" variant="bodyMd" fontWeight="semibold">
              🚀 Premium Features Coming Soon
            </Text>
            <Text as="p" variant="bodyMd">
              Slack/SMS notifications, inventory forecasting, automated reordering, and more!
            </Text>
          </BlockStack>
        </Banner>

        {/* Low Stock Table */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Low Stock Products
            </Text>

            {lowStockItems.length === 0 ? (
              <EmptyState
                heading="No low stock items"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>All your products are well-stocked! 🎉</p>
              </EmptyState>
            ) : (
              <DataTable
                columnContentTypes={['text', 'text', 'text', 'text', 'text']}
                headings={['Product', 'Variant', 'SKU', 'Stock', 'Action']}
                rows={rows}
              />
            )}
          </BlockStack>
        </Card>

        {/* Help Text */}
        <Card>
          <BlockStack gap="200">
            <Text as="h3" variant="headingSm">
              💡 Tips
            </Text>
            <Text as="p" variant="bodyMd" tone="subdued">
              • Click "View in Shopify" to update inventory directly
            </Text>
            <Text as="p" variant="bodyMd" tone="subdued">
              • You'll receive a daily email summary at 9 AM
            </Text>
            <Text as="p" variant="bodyMd" tone="subdued">
              • Adjust your threshold in Settings if needed
            </Text>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}