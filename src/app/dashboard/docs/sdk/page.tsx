'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ApiKey, User } from '@/packages/types/database';

interface CodeBlockProps {
  code: string;
  language?: string;
}

function CodeBlock({ code, language = 'javascript' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative group">
      <pre className={`p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm language-${language}`}>
        <code>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white"
        onClick={copyCode}
      >
        {copied ? 'Copied!' : 'Copy'}
      </Button>
    </div>
  );
}

export default function SDKDocsPage() {
  const [apiKey, setApiKey] = useState<string>('YOUR_API_KEY');
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    loadApiKey();
  }, []);

  async function loadApiKey() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!userData) return;

      // Get first active API key
      const { data: keysData } = await supabase
        .from('api_keys')
        .select('key_prefix')
        .eq('org_id', (userData as User).org_id)
        .is('revoked_at', null)
        .limit(1);

      if (keysData && keysData.length > 0) {
        setApiKey((keysData[0] as ApiKey).key_prefix + '...');
      }
    } catch (error) {
      console.error('Error loading API key:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          SDK Integration Guide
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Add HIPAA-compliant tracking to your website in minutes
        </p>
      </div>

      {/* Quick Start */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Start</CardTitle>
          <CardDescription>
            Add this script to your website to start tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock code={`<!-- HealthTrack Pro SDK -->
<script src="https://cdn.healthtrack.io/sdk/v1/healthtrack.min.js"></script>
<script>
  HealthTrack.init({
    apiKey: '${apiKey}'
  });
</script>`} language="html" />
          <p className="text-sm text-gray-500 mt-4">
            Add this code before the closing <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">&lt;/body&gt;</code> tag on every page.
          </p>
        </CardContent>
      </Card>

      {/* Initialization */}
      <Card>
        <CardHeader>
          <CardTitle>Initialization Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CodeBlock code={`HealthTrack.init({
  apiKey: '${apiKey}',        // Required: Your API key
  serverUrl: '/api/v1/events', // Optional: Custom endpoint
  debug: false,                // Optional: Enable console logging
  batchSize: 10,               // Optional: Events per batch (default: 10)
  batchInterval: 5000          // Optional: Batch interval ms (default: 5000)
});`} />
          <div className="grid gap-2 text-sm">
            <div className="flex gap-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">apiKey</code>
              <span className="text-gray-600 dark:text-gray-400">Required. Your organization&apos;s API key.</span>
            </div>
            <div className="flex gap-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">serverUrl</code>
              <span className="text-gray-600 dark:text-gray-400">Custom server URL if self-hosting.</span>
            </div>
            <div className="flex gap-2">
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">debug</code>
              <span className="text-gray-600 dark:text-gray-400">Enable console logging for debugging.</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Page Views */}
      <Card>
        <CardHeader>
          <CardTitle>Page Views</CardTitle>
          <CardDescription>
            Page views are tracked automatically on init. You can also track manually:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock code={`// Track page view (automatic on init)
HealthTrack.trackPageView();

// Track with custom properties
HealthTrack.trackPageView({
  category: 'services',
  section: 'dental'
});`} />
        </CardContent>
      </Card>

      {/* Custom Events */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Events</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CodeBlock code={`// Track custom event
HealthTrack.trackEvent('button_click', {
  button_id: 'cta-main',
  button_text: 'Schedule Appointment'
});

// Track form interaction
HealthTrack.trackEvent('form_started', {
  form_name: 'contact'
});`} />
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-900 rounded-lg text-sm">
            <p className="font-medium text-yellow-800 dark:text-yellow-200">PHI Protection</p>
            <p className="text-yellow-700 dark:text-yellow-300 mt-1">
              The SDK automatically detects and removes PHI (emails, phone numbers, SSNs, etc.) from event properties.
              You don&apos;t need to sanitize data before tracking.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Conversions */}
      <Card>
        <CardHeader>
          <CardTitle>Conversions</CardTitle>
          <CardDescription>
            Track conversions with optional value for revenue attribution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock code={`// Track conversion without value
HealthTrack.trackConversion('form_submit');

// Track conversion with value
HealthTrack.trackConversion('appointment_booked', 150, {
  appointment_type: 'consultation',
  currency: 'USD'
});`} />
        </CardContent>
      </Card>

      {/* User Identity */}
      <Card>
        <CardHeader>
          <CardTitle>User Identity</CardTitle>
          <CardDescription>
            Associate events with a user ID (hashed client-side for privacy)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CodeBlock code={`// Set user identity (automatically hashed)
HealthTrack.identify('user_12345');

// Clear identity (e.g., on logout)
HealthTrack.identify(null);`} />
          <p className="text-sm text-gray-500">
            The user ID is hashed client-side before being sent. The original ID is never transmitted.
          </p>
        </CardContent>
      </Card>

      {/* Consent Management */}
      <Card>
        <CardHeader>
          <CardTitle>Consent Management</CardTitle>
          <CardDescription>
            Integrate with your CMP or manually manage consent
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CodeBlock code={`// Set consent manually
HealthTrack.setConsent({
  analytics: true,
  marketing: false
});

// Get current consent state
const consent = HealthTrack.getConsent();
console.log(consent); // { analytics: true, marketing: false }

// Register custom CMP adapter
HealthTrack.registerCMPAdapter({
  name: 'my-cmp',
  detectConsent: () => {
    // Return consent state from your CMP
    return { analytics: true, marketing: window.myConsent?.marketing };
  }
});`} />
          <p className="text-sm text-gray-500">
            The SDK automatically detects Google Consent Mode v2, OneTrust, and Cookiebot.
          </p>
        </CardContent>
      </Card>

      {/* React Integration */}
      <Card>
        <CardHeader>
          <CardTitle>React Integration</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock code={`// hooks/useHealthTrack.ts
import { useEffect } from 'react';

declare global {
  interface Window {
    HealthTrack: {
      init: (config: { apiKey: string }) => void;
      trackPageView: (props?: Record<string, unknown>) => void;
      trackEvent: (name: string, props?: Record<string, unknown>) => void;
      trackConversion: (name: string, value?: number, props?: Record<string, unknown>) => void;
    };
  }
}

export function useHealthTrack() {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.HealthTrack) {
      window.HealthTrack.init({ apiKey: process.env.NEXT_PUBLIC_HEALTHTRACK_KEY! });
    }
  }, []);

  return {
    trackEvent: (name: string, props?: Record<string, unknown>) => {
      window.HealthTrack?.trackEvent(name, props);
    },
    trackConversion: (name: string, value?: number, props?: Record<string, unknown>) => {
      window.HealthTrack?.trackConversion(name, value, props);
    }
  };
}`} />
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium">Events not appearing in dashboard?</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 mt-1 space-y-1">
                <li>Verify your API key is correct</li>
                <li>Check browser console for errors (enable <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">debug: true</code>)</li>
                <li>Ensure the script is loaded before calling init</li>
                <li>Check if consent is blocking events</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium">Script blocked by ad blocker?</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 mt-1 space-y-1">
                <li>Self-host the SDK file on your domain</li>
                <li>Use a custom endpoint via <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">serverUrl</code></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium">Need help?</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Contact support at support@healthtrack.io
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
