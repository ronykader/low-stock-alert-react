import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Page,
  Card,
  FormLayout,
  TextField,
  Button,
  Banner,
  ProgressBar,
  Text,
  BlockStack,
  InlineStack
} from '@shopify/polaris';
import { apiService } from '../services/api';

export default function SetupWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    threshold: '10',
    notify_email: '',
  });

  const progress = (step / 3) * 100;

  const handleThresholdChange = (value) => {
    setFormData({ ...formData, threshold: value });
  };

  const handleEmailChange = (value) => {
    setFormData({ ...formData, notify_email: value });
  };

  const handleNext = () => {
    if (step === 1 && (!formData.threshold || formData.threshold < 1)) {
      setError('Please enter a valid threshold (minimum 1)');
      return;
    }
    if (step === 2 && !formData.notify_email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    setError('');
    setStep(step + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  const handleFinish = async () => {
    setLoading(true);
    setError('');

    try {
      // No store_id needed - authenticated via session token
      await apiService.saveSetup(formData);
      
      // Redirect to dashboard with shop and host parameters
      const params = new URLSearchParams(window.location.search);
      console.log('Redirecting to dashboard with params:', params.toString());
      navigate(`/dashboard?${params.toString()}`);
    } catch (err) {
      console.error('Setup error:', err);
      setError(err.response?.data?.error || 'Setup failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Page title="Welcome to Low Stock Alert! 🎉">
      <BlockStack gap="500">
        <Card>
          <BlockStack gap="400">
            <Text as="p" variant="bodyMd">
              Let's get you set up in 3 simple steps
            </Text>
            <ProgressBar progress={progress} size="small" />
          </BlockStack>
        </Card>

        {error && (
          <Banner status="critical" onDismiss={() => setError('')}>
            {error}
          </Banner>
        )}

        {/* Step 1: Set Threshold */}
        {step === 1 && (
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Step 1: Set Your Low Stock Threshold
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                We'll notify you when products fall below this quantity
              </Text>
              <FormLayout>
                <TextField
                  type="number"
                  label="Threshold (units)"
                  value={formData.threshold}
                  onChange={handleThresholdChange}
                  autoComplete="off"
                  helpText="Products with inventory at or below this number will trigger alerts"
                  min={1}
                />
              </FormLayout>
              <InlineStack align="end">
                <Button primary onClick={handleNext}>
                  Next
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        )}

        {/* Step 2: Email Setup */}
        {step === 2 && (
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Step 2: Email Notifications
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                Where should we send your daily low stock alerts?
              </Text>
              <FormLayout>
                <TextField
                  type="email"
                  label="Notification Email"
                  value={formData.notify_email}
                  onChange={handleEmailChange}
                  autoComplete="email"
                  helpText="You'll receive a daily email summary at 9 AM"
                />
              </FormLayout>
              <InlineStack align="space-between">
                <Button onClick={handleBack}>Back</Button>
                <Button primary onClick={handleNext}>
                  Next
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        )}

        {/* Step 3: Finish */}
        {step === 3 && (
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Step 3: You're All Set! ✅
              </Text>
              <Text as="p" variant="bodyMd">
                Here's what will happen next:
              </Text>
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd">
                  📊 We'll check your inventory daily at 8 AM
                </Text>
                <Text as="p" variant="bodyMd">
                  📧 You'll get a daily email at 9 AM with low stock items
                </Text>
                <Text as="p" variant="bodyMd">
                  💡 View real-time data anytime on your dashboard
                </Text>
              </BlockStack>
              
              <Banner status="info">
                <Text as="p" variant="bodyMd">
                  <strong>Coming Soon:</strong> Slack notifications, SMS alerts, and inventory forecasting!
                </Text>
              </Banner>

              <InlineStack align="space-between">
                <Button onClick={handleBack}>Back</Button>
                <Button primary loading={loading} onClick={handleFinish}>
                  Go to Dashboard
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        )}
      </BlockStack>
    </Page>
  );
}
