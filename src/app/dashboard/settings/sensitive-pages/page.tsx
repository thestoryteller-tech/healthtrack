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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import type { SensitivePage, SensitivePageAction, User } from '@/packages/types/database';

const PRESET_PATTERNS = [
  { pattern: '**/intake*', description: 'Patient intake forms' },
  { pattern: '**/appointment*', description: 'Appointment scheduling' },
  { pattern: '**/patient*', description: 'Patient information pages' },
  { pattern: '**/medical*', description: 'Medical records pages' },
  { pattern: '**/health*', description: 'Health-related forms' },
  { pattern: '**/prescription*', description: 'Prescription pages' },
  { pattern: '**/billing*', description: 'Billing information' },
  { pattern: '**/checkout*', description: 'Checkout/payment pages' },
];

export default function SensitivePagesPage() {
  const [patterns, setPatterns] = useState<SensitivePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editingPattern, setEditingPattern] = useState<SensitivePage | null>(null);
  const [deletePattern, setDeletePattern] = useState<SensitivePage | null>(null);
  const [urlPattern, setUrlPattern] = useState('');
  const [action, setAction] = useState<SensitivePageAction>('strip');
  const [testUrl, setTestUrl] = useState('');
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
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

      const { data: patternsData } = await supabase
        .from('sensitive_pages')
        .select('*')
        .eq('org_id', (userData as User).org_id)
        .order('created_at', { ascending: false });

      if (patternsData) {
        setPatterns(patternsData as SensitivePage[]);
      }
    } catch (error) {
      console.error('Error loading patterns:', error);
    } finally {
      setLoading(false);
    }
  }

  function globToRegex(glob: string): RegExp {
    const escaped = glob
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.');
    return new RegExp(`^${escaped}$`, 'i');
  }

  function testPattern() {
    if (!testUrl || !urlPattern) {
      setTestResult(null);
      return;
    }

    try {
      const regex = globToRegex(urlPattern);
      const matches = regex.test(testUrl);
      setTestResult(matches);
    } catch {
      setTestResult(false);
    }
  }

  async function savePattern() {
    if (!urlPattern.trim() || !currentUser) return;
    setSaving(true);

    try {
      if (editingPattern) {
        // Update existing
        const { error } = await supabase
          .from('sensitive_pages')
          .update({
            url_pattern: urlPattern.trim(),
            action: action,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingPattern.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('sensitive_pages')
          .insert({
            org_id: currentUser.org_id,
            url_pattern: urlPattern.trim(),
            action: action,
          });

        if (error) throw error;
      }

      // Log to audit
      await supabase.from('audit_log').insert({
        org_id: currentUser.org_id,
        user_id: currentUser.id,
        action: editingPattern ? 'update_sensitive_pattern' : 'create_sensitive_pattern',
        details: { pattern: urlPattern.trim(), action },
      });

      await loadData();
      closeModal();
    } catch (error) {
      console.error('Error saving pattern:', error);
    } finally {
      setSaving(false);
    }
  }

  async function deletePatternConfirm() {
    if (!deletePattern || !currentUser) return;

    try {
      const { error } = await supabase
        .from('sensitive_pages')
        .delete()
        .eq('id', deletePattern.id);

      if (error) throw error;

      // Log to audit
      await supabase.from('audit_log').insert({
        org_id: currentUser.org_id,
        user_id: currentUser.id,
        action: 'delete_sensitive_pattern',
        details: { pattern: deletePattern.url_pattern },
      });

      await loadData();
    } catch (error) {
      console.error('Error deleting pattern:', error);
    } finally {
      setDeletePattern(null);
    }
  }

  function openEditModal(pattern: SensitivePage) {
    setEditingPattern(pattern);
    setUrlPattern(pattern.url_pattern);
    setAction(pattern.action);
    setTestUrl('');
    setTestResult(null);
    setAddOpen(true);
  }

  function closeModal() {
    setAddOpen(false);
    setEditingPattern(null);
    setUrlPattern('');
    setAction('strip');
    setTestUrl('');
    setTestResult(null);
  }

  function addPresetPattern(preset: { pattern: string }) {
    setUrlPattern(preset.pattern);
  }

  async function importFromCSV(file: File) {
    if (!currentUser) return;

    try {
      const text = await file.text();
      const lines = text.split('\n').slice(1); // Skip header

      for (const line of lines) {
        const [pattern, actionValue] = line.split(',').map(s => s.trim().replace(/"/g, ''));
        if (!pattern) continue;

        const validAction: SensitivePageAction = actionValue === 'block' ? 'block' : 'strip';

        await supabase.from('sensitive_pages').insert({
          org_id: currentUser.org_id,
          url_pattern: pattern,
          action: validAction,
        });
      }

      await loadData();
    } catch (error) {
      console.error('Import error:', error);
    }
  }

  function exportToCSV() {
    const header = 'url_pattern,action,created_at\n';
    const rows = patterns.map(p =>
      `"${p.url_pattern}","${p.action}","${p.created_at}"`
    ).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sensitive-pages.csv';
    a.click();
    URL.revokeObjectURL(url);
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
            Sensitive Pages
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configure URL patterns for enhanced PHI protection
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            id="csv-import"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importFromCSV(file);
            }}
          />
          <Button variant="outline" onClick={() => document.getElementById('csv-import')?.click()}>
            Import CSV
          </Button>
          <Button variant="outline" onClick={exportToCSV} disabled={patterns.length === 0}>
            Export CSV
          </Button>
          <Dialog open={addOpen} onOpenChange={(open) => !open && closeModal()}>
            <DialogTrigger asChild>
              <Button onClick={() => setAddOpen(true)}>Add Pattern</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingPattern ? 'Edit Pattern' : 'Add Sensitive Page Pattern'}</DialogTitle>
                <DialogDescription>
                  URLs matching this pattern will have enhanced PHI protection
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="url-pattern">URL Pattern</Label>
                  <Input
                    id="url-pattern"
                    placeholder="**/patient/**"
                    value={urlPattern}
                    onChange={(e) => setUrlPattern(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    Use ** for any path, * for single segment. Example: **/intake* matches /forms/intake-new
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Presets</Label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_PATTERNS.slice(0, 4).map((preset) => (
                      <Button
                        key={preset.pattern}
                        variant="outline"
                        size="sm"
                        onClick={() => addPresetPattern(preset)}
                      >
                        {preset.description}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="action">Action</Label>
                  <Select value={action} onValueChange={(v) => setAction(v as SensitivePageAction)}>
                    <SelectTrigger id="action">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="strip">Strip PHI (recommended)</SelectItem>
                      <SelectItem value="block">Block tracking entirely</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    {action === 'strip'
                      ? 'Removes all PHI from events before sending'
                      : 'Completely blocks event tracking on matching pages'}
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <Label htmlFor="test-url">Test URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="test-url"
                      placeholder="https://clinic.com/patient/intake"
                      value={testUrl}
                      onChange={(e) => setTestUrl(e.target.value)}
                    />
                    <Button variant="outline" onClick={testPattern}>
                      Test
                    </Button>
                  </div>
                  {testResult !== null && (
                    <p className={`text-sm ${testResult ? 'text-green-600' : 'text-red-600'}`}>
                      {testResult ? 'URL matches pattern' : 'URL does not match'}
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeModal}>
                  Cancel
                </Button>
                <Button onClick={savePattern} disabled={saving || !urlPattern.trim()}>
                  {saving ? 'Saving...' : editingPattern ? 'Update' : 'Add Pattern'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <svg
              className="h-5 w-5 text-blue-500 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
              />
            </svg>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                What are sensitive pages?
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Sensitive pages are URLs where PHI (Protected Health Information) is likely to be present,
                such as patient intake forms, appointment scheduling, and medical records.
                You can choose to either strip all PHI from events or block tracking entirely on these pages.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patterns Table */}
      <Card>
        <CardHeader>
          <CardTitle>URL Patterns</CardTitle>
          <CardDescription>
            {patterns.length} pattern{patterns.length !== 1 ? 's' : ''} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {patterns.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL Pattern</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patterns.map((pattern) => (
                  <TableRow key={pattern.id}>
                    <TableCell>
                      <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        {pattern.url_pattern}
                      </code>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        pattern.action === 'block'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                      }`}>
                        {pattern.action === 'block' ? 'Block' : 'Strip PHI'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(pattern.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(pattern)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => setDeletePattern(pattern)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-2">No patterns configured</p>
              <p className="text-sm">Add URL patterns to protect sensitive pages</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletePattern} onOpenChange={(open) => !open && setDeletePattern(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pattern</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the pattern &quot;{deletePattern?.url_pattern}&quot;?
              Pages matching this pattern will no longer have enhanced PHI protection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deletePatternConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
