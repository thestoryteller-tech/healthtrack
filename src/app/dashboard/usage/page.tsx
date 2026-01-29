'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { User, Organization } from '@/packages/types/database';

interface UsageData {
  plan: string;
  limits: {
    events_per_month: number;
    platforms: number;
    team_members: number;
  };
  usage: {
    events: {
      used: number;
      limit: number;
      percentage: number;
      exceeded: boolean;
    };
    platforms: {
      used: number;
      limit: number;
      exceeded: boolean;
    };
    teamMembers: {
      used: number;
      limit: number;
      exceeded: boolean;
    };
  };
}

export default function UsagePage() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [usageData, setUsageData] = useState<UsageData | null>(null);

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

      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', (userData as User).org_id)
        .single();

      if (orgData) {
        setOrganization(orgData as Organization);
      }

      // Fetch usage data
      const response = await fetch('/api/usage');
      if (response.ok) {
        const data = await response.json();
        setUsageData(data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatLimit(limit: number): string {
    if (limit === -1) return 'Unlimited';
    return limit.toLocaleString();
  }

  function getProgressColor(percentage: number, exceeded: boolean): string {
    if (exceeded) return 'bg-red-500';
    if (percentage >= 90) return 'bg-yellow-500';
    if (percentage >= 75) return 'bg-yellow-400';
    return 'bg-green-500';
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Usage & Limits
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor your resource usage across the platform
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/settings/billing">Manage Plan</Link>
        </Button>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            {organization?.name || 'Your organization'} is on the{' '}
            <span className="font-medium capitalize">{usageData?.plan || 'free'}</span> plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usageData?.usage.events.exceeded && (
            <div className="p-4 mb-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="font-medium text-red-800 dark:text-red-200">Event limit exceeded</p>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                New events will be rejected until the next billing cycle or you upgrade your plan.
              </p>
            </div>
          )}

          {usageData && usageData.usage.events.percentage >= 90 && !usageData.usage.events.exceeded && (
            <div className="p-4 mb-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-900 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">Approaching event limit</p>
              </div>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                You&apos;ve used {usageData.usage.events.percentage}% of your monthly event allowance.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Events */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Events This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold">
                  {usageData?.usage.events.used.toLocaleString() || '0'}
                </span>
                <span className="text-sm text-gray-500">
                  / {formatLimit(usageData?.usage.events.limit || 1000)}
                </span>
              </div>
              {usageData?.usage.events.limit !== -1 && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${getProgressColor(
                      usageData?.usage.events.percentage || 0,
                      usageData?.usage.events.exceeded || false
                    )}`}
                    style={{ width: `${Math.min(usageData?.usage.events.percentage || 0, 100)}%` }}
                  />
                </div>
              )}
              <p className="text-sm text-gray-500">
                {usageData?.usage.events.limit === -1
                  ? 'Unlimited events'
                  : `${usageData?.usage.events.percentage || 0}% of limit used`}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Platforms */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Connected Platforms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold">
                  {usageData?.usage.platforms.used || 0}
                </span>
                <span className="text-sm text-gray-500">
                  / {formatLimit(usageData?.usage.platforms.limit || 1)}
                </span>
              </div>
              {usageData?.usage.platforms.limit !== -1 && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      usageData?.usage.platforms.exceeded ? 'bg-red-500' : 'bg-green-500'
                    }`}
                    style={{
                      width: `${Math.min(
                        ((usageData?.usage.platforms.used || 0) / (usageData?.usage.platforms.limit || 1)) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              )}
              <p className="text-sm text-gray-500">
                {usageData?.usage.platforms.limit === -1
                  ? 'Unlimited platforms'
                  : usageData?.usage.platforms.exceeded
                  ? 'Limit reached'
                  : `${(usageData?.usage.platforms.limit || 1) - (usageData?.usage.platforms.used || 0)} remaining`}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold">
                  {usageData?.usage.teamMembers.used || 0}
                </span>
                <span className="text-sm text-gray-500">
                  / {formatLimit(usageData?.usage.teamMembers.limit || 2)}
                </span>
              </div>
              {usageData?.usage.teamMembers.limit !== -1 && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      usageData?.usage.teamMembers.exceeded ? 'bg-red-500' : 'bg-green-500'
                    }`}
                    style={{
                      width: `${Math.min(
                        ((usageData?.usage.teamMembers.used || 0) / (usageData?.usage.teamMembers.limit || 2)) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              )}
              <p className="text-sm text-gray-500">
                {usageData?.usage.teamMembers.limit === -1
                  ? 'Unlimited team members'
                  : usageData?.usage.teamMembers.exceeded
                  ? 'Limit reached'
                  : `${(usageData?.usage.teamMembers.limit || 2) - (usageData?.usage.teamMembers.used || 0)} seats available`}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Billing Cycle Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-gray-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Billing Cycle</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Usage resets on the 1st of each month at 00:00 UTC.
                Current period: {new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString()} - {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
