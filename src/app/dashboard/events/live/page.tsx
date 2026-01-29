'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { EventLog, User } from '@/packages/types/database';

interface EventWithDetails extends EventLog {
  expanded?: boolean;
}

export default function LiveEventsPage() {
  const [events, setEvents] = useState<EventWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterEventType, setFilterEventType] = useState<string>('all');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (paused || !currentUser) return;

    const interval = setInterval(() => {
      fetchNewEvents();
    }, 5000);

    return () => clearInterval(interval);
  }, [paused, currentUser, events]);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [events, autoScroll]);

  async function loadInitialData() {
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

      await fetchEvents((userData as User).org_id);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchEvents(orgId: string) {
    const { data } = await supabase
      .from('events_log')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (data) {
      setEvents(data as EventWithDetails[]);
    }
  }

  async function fetchNewEvents() {
    if (!currentUser) return;

    const lastEventTime = events[0]?.created_at;
    let query = supabase
      .from('events_log')
      .select('*')
      .eq('org_id', currentUser.org_id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (lastEventTime) {
      query = query.gt('created_at', lastEventTime);
    }

    const { data } = await query;

    if (data && data.length > 0) {
      setEvents(prev => {
        const newEvents = [...(data as EventWithDetails[]), ...prev].slice(0, 100);
        return newEvents;
      });
    }
  }

  function toggleExpand(id: string) {
    setEvents(prev =>
      prev.map(e => e.id === id ? { ...e, expanded: !e.expanded } : e)
    );
  }

  const filteredEvents = events.filter(e => {
    if (filterEventType !== 'all' && e.event_type !== filterEventType) return false;
    if (filterPlatform !== 'all' && !e.platforms_sent?.includes(filterPlatform)) return false;
    return true;
  });

  const eventCount = filteredEvents.length;
  const uniqueEventTypes = [...new Set(events.map(e => e.event_type))];
  const uniquePlatforms = [...new Set(events.flatMap(e => e.platforms_sent || []))];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="h-96 bg-gray-200 dark:bg-gray-800 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Live Event Monitor
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time view of incoming events ({eventCount} events)
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="auto-scroll"
              checked={autoScroll}
              onCheckedChange={setAutoScroll}
            />
            <Label htmlFor="auto-scroll" className="text-sm">Auto-scroll</Label>
          </div>
          <Button
            variant={paused ? 'default' : 'outline'}
            onClick={() => setPaused(!paused)}
          >
            {paused ? 'Resume' : 'Pause'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="space-y-2">
              <Label>Event Type</Label>
              <Select value={filterEventType} onValueChange={setFilterEventType}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {uniqueEventTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  {uniquePlatforms.map(platform => (
                    <SelectItem key={platform} value={platform} className="capitalize">
                      {platform === 'ga4' ? 'GA4' : platform}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Event Feed */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Event Feed</CardTitle>
            {!paused && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-gray-500">Live</span>
              </div>
            )}
          </div>
          <CardDescription>
            Events refresh every 5 seconds
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            ref={containerRef}
            className="space-y-2 max-h-[600px] overflow-y-auto"
          >
            {filteredEvents.length > 0 ? (
              filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className="border rounded-lg overflow-hidden"
                >
                  <button
                    className="w-full px-4 py-3 flex items-center gap-4 text-left hover:bg-gray-50 dark:hover:bg-gray-900"
                    onClick={() => toggleExpand(event.id)}
                  >
                    <span className="text-xs text-gray-500 w-20">
                      {new Date(event.created_at).toLocaleTimeString()}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      event.event_type === 'page_view'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        : event.event_type === 'conversion'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                      {event.event_type}
                    </span>
                    <span className="flex-1 font-medium text-sm truncate">
                      {event.event_name || event.event_type}
                    </span>
                    <div className="flex items-center gap-2">
                      {event.platforms_sent?.map(p => (
                        <span
                          key={p}
                          className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded"
                        >
                          {p === 'ga4' ? 'GA4' : p}
                        </span>
                      ))}
                    </div>
                    {event.scrubbed_fields && event.scrubbed_fields.length > 0 && (
                      <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300 rounded">
                        PHI scrubbed
                      </span>
                    )}
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${event.expanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {event.expanded && (
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-gray-500">Event ID:</span>
                          <span className="ml-2 font-mono text-xs">{event.id}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Timestamp:</span>
                          <span className="ml-2">{new Date(event.created_at).toISOString()}</span>
                        </div>
                        {event.scrubbed_fields && event.scrubbed_fields.length > 0 && (
                          <div className="col-span-2">
                            <span className="text-gray-500">PHI Fields Scrubbed:</span>
                            <span className="ml-2 text-yellow-600 dark:text-yellow-400">
                              {event.scrubbed_fields.join(', ')}
                            </span>
                          </div>
                        )}
                        {event.error_message && (
                          <div className="col-span-2">
                            <span className="text-gray-500">Error:</span>
                            <span className="ml-2 text-red-600 dark:text-red-400">
                              {event.error_message}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p className="mb-2">No events yet</p>
                <p className="text-sm">Events will appear here as they come in</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
