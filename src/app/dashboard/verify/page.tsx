'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { User, ApiKey, EventLog } from '@/packages/types/database';

type VerificationStep = 'api_key' | 'test_event' | 'sdk_event' | 'complete';

interface StepStatus {
  step: VerificationStep;
  status: 'pending' | 'in_progress' | 'success' | 'error';
  message?: string;
}

export default function VerifyInstallationPage() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [steps, setSteps] = useState<StepStatus[]>([
    { step: 'api_key', status: 'pending' },
    { step: 'test_event', status: 'pending' },
    { step: 'sdk_event', status: 'pending' },
  ]);
  const [recentEvents, setRecentEvents] = useState<EventLog[]>([]);
  const [testEventSending, setTestEventSending] = useState(false);
  const [pollingSdkEvent, setPollingSdkEvent] = useState(false);

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

      // Check API keys
      const { data: keysData } = await supabase
        .from('api_keys')
        .select('*')
        .eq('org_id', (userData as User).org_id)
        .is('revoked_at', null);

      const keys = (keysData || []) as ApiKey[];
      setApiKeys(keys);

      // Update API key step status
      if (keys.length > 0) {
        updateStepStatus('api_key', 'success', `${keys.length} active API key(s) found`);
      } else {
        updateStepStatus('api_key', 'error', 'No API keys found');
      }

      // Check for recent events
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: eventsData } = await supabase
        .from('events_log')
        .select('*')
        .eq('org_id', (userData as User).org_id)
        .gte('created_at', fiveMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(10);

      if (eventsData) {
        const events = eventsData as EventLog[];
        setRecentEvents(events);
        const hasTestEvent = events.some((e) => e.event_type === 'test_event');
        const hasSdkEvent = events.some((e) => e.event_type !== 'test_event');

        if (hasTestEvent) {
          updateStepStatus('test_event', 'success', 'Test event received');
        }
        if (hasSdkEvent) {
          updateStepStatus('sdk_event', 'success', 'SDK events are being received');
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function updateStepStatus(step: VerificationStep, status: StepStatus['status'], message?: string) {
    setSteps(prev => prev.map(s =>
      s.step === step ? { ...s, status, message } : s
    ));
  }

  async function sendTestEvent() {
    setTestEventSending(true);
    updateStepStatus('test_event', 'in_progress', 'Sending test event...');

    try {
      const response = await fetch('/api/test-event', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        updateStepStatus('test_event', 'success', `Test event created (ID: ${data.event_id?.slice(0, 8)}...)`);
        await loadData(); // Refresh events list
      } else {
        updateStepStatus('test_event', 'error', data.error || 'Failed to send test event');
      }
    } catch (error) {
      updateStepStatus('test_event', 'error', 'Network error sending test event');
    } finally {
      setTestEventSending(false);
    }
  }

  async function pollForSdkEvent() {
    setPollingSdkEvent(true);
    updateStepStatus('sdk_event', 'in_progress', 'Waiting for SDK event...');

    // Poll every 2 seconds for 30 seconds
    let attempts = 0;
    const maxAttempts = 15;

    const poll = async () => {
      if (!currentUser) return;

      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: eventsData } = await supabase
        .from('events_log')
        .select('*')
        .eq('org_id', currentUser.org_id)
        .gte('created_at', fiveMinutesAgo)
        .neq('event_type', 'test_event')
        .order('created_at', { ascending: false })
        .limit(5);

      if (eventsData && eventsData.length > 0) {
        setRecentEvents(prev => {
          const newEvents = eventsData as EventLog[];
          const ids = new Set(prev.map(e => e.id));
          const filtered = newEvents.filter(e => !ids.has(e.id));
          return [...filtered, ...prev].slice(0, 10);
        });
        updateStepStatus('sdk_event', 'success', `SDK event received: ${(eventsData[0] as EventLog).event_type}`);
        setPollingSdkEvent(false);
        return;
      }

      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, 2000);
      } else {
        updateStepStatus('sdk_event', 'pending', 'No SDK events detected yet');
        setPollingSdkEvent(false);
      }
    };

    poll();
  }

  const allStepsComplete = steps.every(s => s.status === 'success');

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
          Verify Installation
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Test your HealthTrack integration step by step
        </p>
      </div>

      {/* Overall Status */}
      <Card className={allStepsComplete
        ? 'border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950'
        : 'border-gray-200 dark:border-gray-800'
      }>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              allStepsComplete
                ? 'bg-green-200 dark:bg-green-800'
                : 'bg-gray-200 dark:bg-gray-700'
            }`}>
              {allStepsComplete ? (
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div>
              <p className={`text-lg font-medium ${
                allStepsComplete
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-gray-900 dark:text-white'
              }`}>
                {allStepsComplete ? 'Installation Complete!' : 'Verification In Progress'}
              </p>
              <p className={`text-sm ${
                allStepsComplete
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                {steps.filter(s => s.status === 'success').length} of {steps.length} steps complete
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Verification Steps</CardTitle>
          <CardDescription>Complete each step to verify your installation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: API Key */}
          <div className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              steps[0].status === 'success'
                ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                : steps[0].status === 'error'
                ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}>
              {steps[0].status === 'success' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : steps[0].status === 'error' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : '1'}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white">Create API Key</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {steps[0].message || 'Generate an API key to authenticate SDK requests'}
              </p>
              {steps[0].status === 'error' && (
                <Button size="sm" className="mt-3" asChild>
                  <a href="/dashboard/settings/api-keys">Create API Key</a>
                </Button>
              )}
            </div>
          </div>

          {/* Step 2: Test Event */}
          <div className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              steps[1].status === 'success'
                ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                : steps[1].status === 'in_progress'
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                : steps[1].status === 'error'
                ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}>
              {steps[1].status === 'success' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : steps[1].status === 'in_progress' ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : '2'}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white">Send Test Event</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {steps[1].message || 'Send a test event from the dashboard to verify the connection'}
              </p>
              {steps[0].status === 'success' && steps[1].status !== 'success' && (
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={sendTestEvent}
                  disabled={testEventSending}
                >
                  {testEventSending ? 'Sending...' : 'Send Test Event'}
                </Button>
              )}
            </div>
          </div>

          {/* Step 3: SDK Event */}
          <div className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              steps[2].status === 'success'
                ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                : steps[2].status === 'in_progress'
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}>
              {steps[2].status === 'success' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : steps[2].status === 'in_progress' ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : '3'}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white">Receive SDK Event</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {steps[2].message || 'Install the SDK on your website and visit a page to send an event'}
              </p>
              {steps[1].status === 'success' && steps[2].status !== 'success' && (
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={pollForSdkEvent}
                    disabled={pollingSdkEvent}
                  >
                    {pollingSdkEvent ? 'Listening...' : 'Listen for Events'}
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <a href="/dashboard/docs/sdk">View SDK Setup Guide</a>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Events */}
      {recentEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Events (Last 5 Minutes)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentEvents.map(event => (
                <div
                  key={event.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-900"
                >
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    event.event_type === 'test_event'
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  }`}>
                    {event.event_type}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400 flex-1">
                    {event.event_name || event.event_type}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(event.created_at).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
