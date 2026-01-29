import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { User, Organization, TrackingConfig, EventLog, ApiKey } from '@/packages/types/database';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user's organization
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  const userRecord = userData as User | null;
  let organization: Organization | null = null;
  let connectedPlatforms: TrackingConfig[] = [];
  let eventsToday = 0;
  let eventsThisMonth = 0;
  let phiScrubRate = 0;
  let apiKeys: ApiKey[] = [];

  if (userRecord?.org_id) {
    // Get organization
    const { data: orgData } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', userRecord.org_id)
      .single();
    organization = orgData as Organization | null;

    // Get connected platforms
    const { data: platformsData } = await supabase
      .from('tracking_configs')
      .select('*')
      .eq('org_id', userRecord.org_id)
      .eq('enabled', true);
    connectedPlatforms = (platformsData || []) as TrackingConfig[];

    // Get events count for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: todayCount } = await supabase
      .from('events_log')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', userRecord.org_id)
      .gte('created_at', today.toISOString());
    eventsToday = todayCount || 0;

    // Get events count for this month
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const { count: monthCount } = await supabase
      .from('events_log')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', userRecord.org_id)
      .gte('created_at', monthStart.toISOString());
    eventsThisMonth = monthCount || 0;

    // Calculate PHI scrub rate
    const { data: recentEvents } = await supabase
      .from('events_log')
      .select('scrubbed_fields')
      .eq('org_id', userRecord.org_id)
      .limit(100);
    if (recentEvents && recentEvents.length > 0) {
      const scrubbedCount = recentEvents.filter(
        (e: { scrubbed_fields: string[] | null }) => e.scrubbed_fields && e.scrubbed_fields.length > 0
      ).length;
      phiScrubRate = Math.round((scrubbedCount / recentEvents.length) * 100);
    }

    // Get API keys
    const { data: keysData } = await supabase
      .from('api_keys')
      .select('*')
      .eq('org_id', userRecord.org_id)
      .is('revoked_at', null);
    apiKeys = (keysData || []) as ApiKey[];
  }

  // Determine installation status
  const hasApiKey = apiKeys.length > 0;
  const hasPlatform = connectedPlatforms.length > 0;
  const hasEvents = eventsToday > 0;
  const installationStatus = hasEvents
    ? 'verified'
    : hasApiKey
    ? 'pending'
    : 'not_installed';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Overview
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {organization?.name || 'Your organization'} dashboard
        </p>
      </div>

      {/* Installation Verification Widget */}
      <Card className={
        installationStatus === 'verified'
          ? 'border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950'
          : installationStatus === 'pending'
          ? 'border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950'
          : 'border-gray-200 dark:border-gray-800'
      }>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                installationStatus === 'verified'
                  ? 'bg-green-200 dark:bg-green-800'
                  : installationStatus === 'pending'
                  ? 'bg-yellow-200 dark:bg-yellow-800'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}>
                {installationStatus === 'verified' ? (
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : installationStatus === 'pending' ? (
                  <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
              </div>
              <div>
                <p className={`font-medium ${
                  installationStatus === 'verified'
                    ? 'text-green-800 dark:text-green-200'
                    : installationStatus === 'pending'
                    ? 'text-yellow-800 dark:text-yellow-200'
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {installationStatus === 'verified'
                    ? 'Installation Verified'
                    : installationStatus === 'pending'
                    ? 'Awaiting First Event'
                    : 'SDK Not Installed'}
                </p>
                <p className={`text-sm ${
                  installationStatus === 'verified'
                    ? 'text-green-700 dark:text-green-300'
                    : installationStatus === 'pending'
                    ? 'text-yellow-700 dark:text-yellow-300'
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {installationStatus === 'verified'
                    ? 'Events are being received successfully'
                    : installationStatus === 'pending'
                    ? 'API key created, waiting for first event'
                    : 'Create an API key to get started'}
                </p>
              </div>
            </div>
            {installationStatus !== 'verified' && (
              <Button asChild variant={installationStatus === 'not_installed' ? 'default' : 'outline'}>
                <Link href={installationStatus === 'not_installed' ? '/dashboard/settings/api-keys' : '/dashboard/docs/sdk'}>
                  {installationStatus === 'not_installed' ? 'Create API Key' : 'View Setup Guide'}
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Events Today</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{eventsToday.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Events This Month</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{eventsThisMonth.toLocaleString()}</p>
            {organization?.subscription_tier && (
              <p className="text-sm text-gray-500 mt-1">
                {organization.subscription_tier === 'free' ? '/ 1,000' :
                 organization.subscription_tier === 'pro' ? '/ 100,000' : 'Unlimited'}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Connected Platforms</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{connectedPlatforms.length}</p>
            <div className="flex gap-1 mt-2">
              {connectedPlatforms.map(p => (
                <span key={p.id} className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded capitalize">
                  {p.platform === 'ga4' ? 'GA4' : p.platform}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>PHI Scrub Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{phiScrubRate}%</p>
            <p className="text-sm text-gray-500 mt-1">of events had PHI removed</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/dashboard/events/live">
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                View Live Events
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/dashboard/platforms">
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Connect a Platform
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/dashboard/settings/sensitive-pages">
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Configure Sensitive Pages
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Getting Started</CardTitle>
            <CardDescription>Complete these steps to start tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  hasApiKey
                    ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}>
                  {hasApiKey ? '✓' : '1'}
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${hasApiKey ? 'text-gray-500' : ''}`}>Create an API Key</p>
                  <p className="text-sm text-gray-500">Required to authenticate SDK requests</p>
                </div>
                {!hasApiKey && (
                  <Button asChild size="sm">
                    <Link href="/dashboard/settings/api-keys">Create</Link>
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  hasEvents
                    ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}>
                  {hasEvents ? '✓' : '2'}
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${hasEvents ? 'text-gray-500' : ''}`}>Install the SDK</p>
                  <p className="text-sm text-gray-500">Add the tracking script to your website</p>
                </div>
                {!hasEvents && (
                  <Button asChild size="sm" variant="outline">
                    <Link href="/dashboard/docs/sdk">View Guide</Link>
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  hasPlatform
                    ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}>
                  {hasPlatform ? '✓' : '3'}
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${hasPlatform ? 'text-gray-500' : ''}`}>Connect a Platform</p>
                  <p className="text-sm text-gray-500">Forward events to GA4, Meta, TikTok, etc.</p>
                </div>
                {!hasPlatform && (
                  <Button asChild size="sm" variant="outline">
                    <Link href="/dashboard/platforms">Connect</Link>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
