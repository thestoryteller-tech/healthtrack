'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { TrackingConfig, User, Platform } from '@/packages/types/database';

interface PlatformInfo {
  id: Platform;
  name: string;
  description: string;
  logo: string;
  fields: { key: string; label: string; type: string; placeholder: string }[];
}

const PLATFORMS: PlatformInfo[] = [
  {
    id: 'ga4',
    name: 'Google Analytics 4',
    description: 'Server-side tracking via GA4 Measurement Protocol',
    logo: '/platforms/ga4.svg',
    fields: [
      { key: 'measurement_id', label: 'Measurement ID', type: 'text', placeholder: 'G-XXXXXXXXXX' },
      { key: 'api_secret', label: 'API Secret', type: 'password', placeholder: 'Your API secret' },
    ],
  },
  {
    id: 'meta',
    name: 'Meta (Facebook)',
    description: 'Conversions API for privacy-safe event tracking',
    logo: '/platforms/meta.svg',
    fields: [
      { key: 'pixel_id', label: 'Pixel ID', type: 'text', placeholder: '1234567890' },
      { key: 'access_token', label: 'Access Token', type: 'password', placeholder: 'Your access token' },
    ],
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    description: 'Events API for TikTok Ads attribution',
    logo: '/platforms/tiktok.svg',
    fields: [
      { key: 'pixel_code', label: 'Pixel Code', type: 'text', placeholder: 'XXXXXXXXXX' },
      { key: 'access_token', label: 'Access Token', type: 'password', placeholder: 'Your access token' },
    ],
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Conversions API for B2B marketing attribution',
    logo: '/platforms/linkedin.svg',
    fields: [
      { key: 'conversion_id', label: 'Conversion ID', type: 'text', placeholder: '12345678' },
      { key: 'access_token', label: 'Access Token', type: 'password', placeholder: 'Your access token' },
    ],
  },
  {
    id: 'google_ads',
    name: 'Google Ads',
    description: 'Offline conversion tracking (requires OAuth)',
    logo: '/platforms/google-ads.svg',
    fields: [
      { key: 'customer_id', label: 'Customer ID', type: 'text', placeholder: '123-456-7890' },
    ],
  },
];

export default function PlatformsPage() {
  const [configs, setConfigs] = useState<TrackingConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformInfo | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [disconnectPlatform, setDisconnectPlatform] = useState<Platform | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!userData) return;
      setCurrentUser(userData as User);

      const { data: configsData } = await supabase
        .from('tracking_configs')
        .select('*')
        .eq('org_id', (userData as User).org_id);

      if (configsData) {
        setConfigs(configsData as TrackingConfig[]);
      }
    } catch (error) {
      console.error('Error loading platforms:', error);
    } finally {
      setLoading(false);
    }
  }

  function openConfigModal(platform: PlatformInfo) {
    const existingConfig = configs.find(c => c.platform === platform.id);
    if (existingConfig) {
      // Try to parse existing credentials (they're encrypted, so this might not work in practice)
      try {
        const creds = JSON.parse(existingConfig.credentials_encrypted);
        setFormValues(creds);
      } catch {
        setFormValues({});
      }
    } else {
      setFormValues({});
    }
    setSelectedPlatform(platform);
    setTestResult(null);
  }

  async function saveConfig() {
    if (!selectedPlatform || !currentUser) return;
    setSaving(true);

    try {
      const existingConfig = configs.find(c => c.platform === selectedPlatform.id);
      const credentialsJson = JSON.stringify(formValues);

      if (existingConfig) {
        // Update existing
        const { error } = await supabase
          .from('tracking_configs')
          .update({
            credentials_encrypted: credentialsJson,
            enabled: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingConfig.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('tracking_configs')
          .insert({
            org_id: currentUser.org_id,
            platform: selectedPlatform.id,
            credentials_encrypted: credentialsJson,
            enabled: true,
          });

        if (error) throw error;
      }

      // Log to audit
      await supabase.from('audit_log').insert({
        org_id: currentUser.org_id,
        user_id: currentUser.id,
        action: existingConfig ? 'update_platform_config' : 'create_platform_config',
        details: { platform: selectedPlatform.id },
      });

      await loadData();
      setSelectedPlatform(null);
    } catch (error) {
      console.error('Error saving config:', error);
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    if (!selectedPlatform) return;
    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/platforms/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: selectedPlatform.id,
          credentials: formValues,
        }),
      });

      const data = await response.json();
      setTestResult({
        success: data.valid,
        message: data.message,
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Failed to test connection',
      });
    } finally {
      setTesting(false);
    }
  }

  async function disconnectConfig() {
    if (!disconnectPlatform || !currentUser) return;

    try {
      const config = configs.find(c => c.platform === disconnectPlatform);
      if (!config) return;

      const { error } = await supabase
        .from('tracking_configs')
        .delete()
        .eq('id', config.id);

      if (error) throw error;

      // Log to audit
      await supabase.from('audit_log').insert({
        org_id: currentUser.org_id,
        user_id: currentUser.id,
        action: 'delete_platform_config',
        details: { platform: disconnectPlatform },
      });

      await loadData();
    } catch (error) {
      console.error('Error disconnecting:', error);
    } finally {
      setDisconnectPlatform(null);
    }
  }

  function getConfigForPlatform(platform: Platform): TrackingConfig | undefined {
    return configs.find(c => c.platform === platform);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-48 bg-gray-200 dark:bg-gray-800 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Platform Connections
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Connect advertising platforms for server-side event forwarding
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {PLATFORMS.map((platform) => {
          const config = getConfigForPlatform(platform.id);
          const isConnected = !!config && config.enabled;

          return (
            <Card key={platform.id} className={isConnected ? 'border-green-200 dark:border-green-900' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-lg font-bold text-gray-600 dark:text-gray-400">
                      {platform.name.charAt(0)}
                    </div>
                    <div>
                      <CardTitle className="text-base">{platform.name}</CardTitle>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                        <span className="text-xs text-gray-500">
                          {isConnected ? 'Connected' : 'Not connected'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="mb-4 text-sm">
                  {platform.description}
                </CardDescription>
                {config?.last_sync_at && (
                  <p className="text-xs text-gray-500 mb-3">
                    Last sync: {new Date(config.last_sync_at).toLocaleDateString()}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant={isConnected ? 'outline' : 'default'}
                    size="sm"
                    className="flex-1"
                    onClick={() => openConfigModal(platform)}
                  >
                    {isConnected ? 'Edit' : 'Connect'}
                  </Button>
                  {isConnected && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                      onClick={() => setDisconnectPlatform(platform.id)}
                    >
                      Disconnect
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Configuration Modal */}
      <Dialog open={!!selectedPlatform} onOpenChange={(open) => !open && setSelectedPlatform(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configure {selectedPlatform?.name}</DialogTitle>
            <DialogDescription>
              Enter your credentials to enable server-side tracking
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedPlatform?.fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  type={field.type}
                  placeholder={field.placeholder}
                  value={formValues[field.key] || ''}
                  onChange={(e) => setFormValues(prev => ({
                    ...prev,
                    [field.key]: e.target.value,
                  }))}
                />
              </div>
            ))}

            {testResult && (
              <div className={`p-3 rounded-lg text-sm ${
                testResult.success
                  ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300'
                  : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300'
              }`}>
                {testResult.message}
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={testConnection}
              disabled={testing}
              className="w-full sm:w-auto"
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </Button>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => setSelectedPlatform(null)}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>
              <Button
                onClick={saveConfig}
                disabled={saving}
                className="flex-1 sm:flex-none"
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect Confirmation */}
      <AlertDialog open={!!disconnectPlatform} onOpenChange={(open) => !open && setDisconnectPlatform(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Platform</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect {PLATFORMS.find(p => p.id === disconnectPlatform)?.name}?
              Events will no longer be forwarded to this platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={disconnectConfig}
              className="bg-red-600 hover:bg-red-700"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
