'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import type { User, Platform } from '@/packages/types/database';

interface EventMapping {
  id: string;
  source_event: string;
  platform: Platform;
  destination_event: string;
  enabled: boolean;
  is_custom: boolean;
}

const DEFAULT_MAPPINGS: Omit<EventMapping, 'id'>[] = [
  { source_event: 'page_view', platform: 'ga4', destination_event: 'page_view', enabled: true, is_custom: false },
  { source_event: 'page_view', platform: 'meta', destination_event: 'PageView', enabled: true, is_custom: false },
  { source_event: 'page_view', platform: 'tiktok', destination_event: 'PageView', enabled: true, is_custom: false },
  { source_event: 'form_submit', platform: 'ga4', destination_event: 'generate_lead', enabled: true, is_custom: false },
  { source_event: 'form_submit', platform: 'meta', destination_event: 'Lead', enabled: true, is_custom: false },
  { source_event: 'form_submit', platform: 'tiktok', destination_event: 'SubmitForm', enabled: true, is_custom: false },
  { source_event: 'form_submit', platform: 'linkedin', destination_event: 'conversion', enabled: true, is_custom: false },
  { source_event: 'purchase', platform: 'ga4', destination_event: 'purchase', enabled: true, is_custom: false },
  { source_event: 'purchase', platform: 'meta', destination_event: 'Purchase', enabled: true, is_custom: false },
  { source_event: 'purchase', platform: 'tiktok', destination_event: 'CompletePayment', enabled: true, is_custom: false },
  { source_event: 'purchase', platform: 'linkedin', destination_event: 'conversion', enabled: true, is_custom: false },
];

export default function EventMappingPage() {
  const [mappings, setMappings] = useState<EventMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMapping, setEditMapping] = useState<EventMapping | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newSourceEvent, setNewSourceEvent] = useState('');
  const [newMappings, setNewMappings] = useState<Record<Platform, { event: string; enabled: boolean }>>({
    ga4: { event: '', enabled: true },
    meta: { event: '', enabled: true },
    tiktok: { event: '', enabled: true },
    linkedin: { event: '', enabled: true },
    google_ads: { event: '', enabled: false },
  });
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

      // For now, use default mappings + local storage overrides
      // In production, these would be stored in a database table
      const storedMappings = localStorage.getItem(`event_mappings_${(userData as User).org_id}`);
      if (storedMappings) {
        setMappings(JSON.parse(storedMappings));
      } else {
        const initialMappings = DEFAULT_MAPPINGS.map((m, i) => ({
          ...m,
          id: `default-${i}`,
        }));
        setMappings(initialMappings);
      }
    } catch (error) {
      console.error('Error loading mappings:', error);
    } finally {
      setLoading(false);
    }
  }

  function saveMappings(newMappings: EventMapping[]) {
    if (!currentUser) return;
    localStorage.setItem(`event_mappings_${currentUser.org_id}`, JSON.stringify(newMappings));
    setMappings(newMappings);
  }

  function toggleMapping(id: string) {
    const updated = mappings.map(m =>
      m.id === id ? { ...m, enabled: !m.enabled } : m
    );
    saveMappings(updated);
  }

  function updateDestinationEvent(id: string, newDestination: string) {
    const updated = mappings.map(m =>
      m.id === id ? { ...m, destination_event: newDestination } : m
    );
    saveMappings(updated);
    setEditMapping(null);
  }

  function addCustomMapping() {
    if (!newSourceEvent.trim()) return;

    const newMappingsToAdd: EventMapping[] = [];
    const platforms: Platform[] = ['ga4', 'meta', 'tiktok', 'linkedin', 'google_ads'];

    platforms.forEach(platform => {
      const config = newMappings[platform];
      if (config.event && config.enabled) {
        newMappingsToAdd.push({
          id: `custom-${Date.now()}-${platform}`,
          source_event: newSourceEvent.trim(),
          platform,
          destination_event: config.event,
          enabled: true,
          is_custom: true,
        });
      }
    });

    if (newMappingsToAdd.length > 0) {
      saveMappings([...mappings, ...newMappingsToAdd]);
    }

    // Reset form
    setNewSourceEvent('');
    setNewMappings({
      ga4: { event: '', enabled: true },
      meta: { event: '', enabled: true },
      tiktok: { event: '', enabled: true },
      linkedin: { event: '', enabled: true },
      google_ads: { event: '', enabled: false },
    });
    setAddOpen(false);
  }

  function deleteCustomMapping(id: string) {
    const updated = mappings.filter(m => m.id !== id);
    saveMappings(updated);
  }

  function resetToDefaults() {
    const initialMappings = DEFAULT_MAPPINGS.map((m, i) => ({
      ...m,
      id: `default-${i}`,
    }));
    saveMappings(initialMappings);
  }

  // Group mappings by source event
  const groupedMappings = mappings.reduce((acc, m) => {
    if (!acc[m.source_event]) acc[m.source_event] = [];
    acc[m.source_event].push(m);
    return acc;
  }, {} as Record<string, EventMapping[]>);

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
            Event Mapping
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configure how SDK events are mapped to platform events
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetToDefaults}>
            Reset to Defaults
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            Add Custom Event
          </Button>
        </div>
      </div>

      {/* Event Groups */}
      {Object.entries(groupedMappings).map(([sourceEvent, eventMappings]) => {
        const isCustom = eventMappings.some(m => m.is_custom);
        return (
          <Card key={sourceEvent}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                      {sourceEvent}
                    </code>
                    {isCustom && (
                      <span className="text-xs font-normal text-blue-600 dark:text-blue-400">
                        Custom
                      </span>
                    )}
                  </CardTitle>
                </div>
                {isCustom && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => {
                      eventMappings.forEach(m => deleteCustomMapping(m.id));
                    }}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Platform</TableHead>
                    <TableHead>Destination Event</TableHead>
                    <TableHead className="w-24">Enabled</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventMappings.map((mapping) => (
                    <TableRow key={mapping.id}>
                      <TableCell className="font-medium capitalize">
                        {mapping.platform === 'ga4' ? 'GA4' : mapping.platform}
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          {mapping.destination_event}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={mapping.enabled}
                          onCheckedChange={() => toggleMapping(mapping.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditMapping(mapping)}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}

      {/* Edit Mapping Dialog */}
      <Dialog open={!!editMapping} onOpenChange={(open) => !open && setEditMapping(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Event Mapping</DialogTitle>
            <DialogDescription>
              Change the destination event name for {editMapping?.platform.toUpperCase()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Source Event</Label>
              <Input value={editMapping?.source_event || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination">Destination Event</Label>
              <Input
                id="destination"
                value={editMapping?.destination_event || ''}
                onChange={(e) => setEditMapping(prev => prev ? { ...prev, destination_event: e.target.value } : null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMapping(null)}>
              Cancel
            </Button>
            <Button onClick={() => editMapping && updateDestinationEvent(editMapping.id, editMapping.destination_event)}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Custom Event Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Custom Event Mapping</DialogTitle>
            <DialogDescription>
              Map a custom SDK event to platform-specific events
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="source-event">Source Event Name</Label>
              <Input
                id="source-event"
                placeholder="appointment_booked"
                value={newSourceEvent}
                onChange={(e) => setNewSourceEvent(e.target.value)}
              />
            </div>
            <div className="space-y-3">
              <Label>Platform Mappings</Label>
              {(['ga4', 'meta', 'tiktok', 'linkedin'] as Platform[]).map((platform) => (
                <div key={platform} className="flex items-center gap-3">
                  <Switch
                    checked={newMappings[platform].enabled}
                    onCheckedChange={(checked) =>
                      setNewMappings(prev => ({
                        ...prev,
                        [platform]: { ...prev[platform], enabled: checked },
                      }))
                    }
                  />
                  <span className="w-20 text-sm capitalize">
                    {platform === 'ga4' ? 'GA4' : platform}
                  </span>
                  <Input
                    placeholder="Destination event"
                    value={newMappings[platform].event}
                    onChange={(e) =>
                      setNewMappings(prev => ({
                        ...prev,
                        [platform]: { ...prev[platform], event: e.target.value },
                      }))
                    }
                    disabled={!newMappings[platform].enabled}
                    className="flex-1"
                  />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addCustomMapping} disabled={!newSourceEvent.trim()}>
              Add Mapping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
