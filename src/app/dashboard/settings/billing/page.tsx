'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { User, Organization } from '@/packages/types/database';

const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    events: 1000,
    features: [
      '1,000 events/month',
      '1 connected platform',
      'PHI detection & scrubbing',
      'Basic audit log',
      'Email support',
    ],
  },
  pro: {
    name: 'Pro',
    price: 99,
    events: 100000,
    features: [
      '100,000 events/month',
      'Unlimited platforms',
      'PHI detection & scrubbing',
      'Full audit log with export',
      'Priority email support',
      'Custom event mapping',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    price: null,
    events: -1,
    features: [
      'Unlimited events',
      'Unlimited platforms',
      'PHI detection & scrubbing',
      'Full audit log with export',
      'Dedicated support',
      'Custom integrations',
      'BAA agreement',
      'On-premise option',
    ],
  },
} as const;

type PlanType = keyof typeof PLANS;

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCanceled, setShowCanceled] = useState(false);

  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setShowSuccess(true);
    }
    if (searchParams.get('canceled') === 'true') {
      setShowCanceled(true);
    }
    loadData();
  }, [searchParams]);

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
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpgrade(planId: string) {
    setUpgrading(planId);
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to start checkout');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      alert('Failed to start checkout');
    } finally {
      setUpgrading(null);
    }
  }

  async function handleManageBilling() {
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to open billing portal');
      }
    } catch (error) {
      console.error('Portal error:', error);
      alert('Failed to open billing portal');
    }
  }

  const currentPlan = (organization?.subscription_tier as PlanType) || 'free';

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Billing & Subscription
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your plan and billing settings
        </p>
      </div>

      {/* Success/Cancel Messages */}
      {showSuccess && (
        <Card className="border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">Subscription Updated!</p>
                <p className="text-sm text-green-700 dark:text-green-300">Your new plan is now active.</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => setShowSuccess(false)}
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showCanceled && (
        <Card className="border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">Checkout Canceled</p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">Your subscription remains unchanged.</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => setShowCanceled(false)}
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>Your organization is on the {PLANS[currentPlan].name} plan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold">
                {PLANS[currentPlan].price === null
                  ? 'Custom'
                  : PLANS[currentPlan].price === 0
                  ? 'Free'
                  : `$${PLANS[currentPlan].price}/mo`}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {PLANS[currentPlan].events === -1
                  ? 'Unlimited events'
                  : `${PLANS[currentPlan].events.toLocaleString()} events/month`}
              </p>
            </div>
            {organization?.stripe_customer_id && (
              <Button variant="outline" onClick={handleManageBilling}>
                Manage Billing
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plan Comparison */}
      <div className="grid gap-4 md:grid-cols-3">
        {(Object.entries(PLANS) as [PlanType, typeof PLANS[PlanType]][]).map(([planId, plan]) => {
          const isCurrent = planId === currentPlan;
          const isUpgrade = planId !== 'free' && currentPlan === 'free';

          return (
            <Card
              key={planId}
              className={isCurrent ? 'border-blue-500 dark:border-blue-400 ring-1 ring-blue-500' : ''}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.name}</CardTitle>
                  {isCurrent && (
                    <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                      Current
                    </span>
                  )}
                </div>
                <CardDescription>
                  {plan.price === null ? (
                    'Contact sales'
                  ) : plan.price === 0 ? (
                    'Free forever'
                  ) : (
                    <>
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">
                        ${plan.price}
                      </span>
                      /month
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <svg className="w-4 h-4 text-green-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600 dark:text-gray-400">{feature}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button disabled className="w-full">
                    Current Plan
                  </Button>
                ) : planId === 'enterprise' ? (
                  <Button variant="outline" className="w-full" asChild>
                    <a href="mailto:sales@healthtrack.io">Contact Sales</a>
                  </Button>
                ) : planId === 'free' ? (
                  <Button variant="outline" className="w-full" disabled>
                    {currentPlan === 'free' ? 'Current Plan' : 'Downgrade'}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handleUpgrade(planId)}
                    disabled={upgrading === planId}
                  >
                    {upgrading === planId ? 'Loading...' : isUpgrade ? 'Upgrade' : 'Change Plan'}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* HIPAA BAA Notice */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Business Associate Agreement (BAA)
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                For HIPAA compliance, a BAA is required. Enterprise plans include a signed BAA.
                Pro plan customers can request a BAA by contacting{' '}
                <a href="mailto:compliance@healthtrack.io" className="text-blue-600 dark:text-blue-400 hover:underline">
                  compliance@healthtrack.io
                </a>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
