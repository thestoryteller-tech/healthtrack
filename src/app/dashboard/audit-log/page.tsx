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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AuditLog, User } from '@/packages/types/database';

interface AuditLogEntry extends AuditLog {
  expanded?: boolean;
}

const PAGE_SIZES = [10, 25, 50, 100];

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, [page, pageSize, actionFilter]);

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

      // Build query
      let query = supabase
        .from('audit_log')
        .select('*', { count: 'exact' })
        .eq('org_id', (userData as User).org_id)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      const { data, count } = await query;

      if (data) {
        setLogs(data as AuditLogEntry[]);
        setTotalCount(count || 0);
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleExpand(id: string) {
    setLogs(prev =>
      prev.map(l => l.id === id ? { ...l, expanded: !l.expanded } : l)
    );
  }

  function exportToCSV() {
    const header = 'timestamp,action,user_id,details\n';
    const rows = logs.map(l =>
      `"${l.created_at}","${l.action}","${l.user_id || 'system'}","${JSON.stringify(l.details).replace(/"/g, '""')}"`
    ).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Get unique actions for filter
  const uniqueActions = [...new Set(logs.map(l => l.action))];

  // Filter by search
  const filteredLogs = logs.filter(l => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      l.action.toLowerCase().includes(search) ||
      l.user_id?.toLowerCase().includes(search) ||
      JSON.stringify(l.details).toLowerCase().includes(search)
    );
  });

  const totalPages = Math.ceil(totalCount / pageSize);

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
            Audit Log
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Complete history of actions for compliance reporting
          </p>
        </div>
        <Button variant="outline" onClick={exportToCSV} disabled={logs.length === 0}>
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="search" className="sr-only">Search</Label>
              <Input
                id="search"
                placeholder="Search actions, users, details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-40">
              <Label htmlFor="action-filter" className="sr-only">Action</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger id="action-filter">
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {uniqueActions.map(action => (
                    <SelectItem key={action} value={action}>{action}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-24">
              <Label htmlFor="page-size" className="sr-only">Page Size</Label>
              <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(parseInt(v))}>
                <SelectTrigger id="page-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map(size => (
                    <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Entries</CardTitle>
          <CardDescription>
            {totalCount} total entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredLogs.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <>
                      <TableRow key={log.id} className="cursor-pointer" onClick={() => toggleExpand(log.id)}>
                        <TableCell className="text-sm">
                          {new Date(log.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800">
                            {log.action}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-md truncate text-sm text-gray-500">
                          {typeof log.details === 'object'
                            ? Object.entries(log.details as Record<string, unknown>)
                                .slice(0, 2)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(', ')
                            : String(log.details)}
                        </TableCell>
                        <TableCell>
                          <svg
                            className={`w-4 h-4 text-gray-400 transition-transform ${log.expanded ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </TableCell>
                      </TableRow>
                      {log.expanded && (
                        <TableRow key={`${log.id}-details`}>
                          <TableCell colSpan={4} className="bg-gray-50 dark:bg-gray-900">
                            <pre className="text-xs overflow-x-auto p-2 rounded bg-gray-100 dark:bg-gray-800">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                            {log.ip_address && (
                              <p className="text-xs text-gray-500 mt-2">
                                IP: {log.ip_address}
                              </p>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-500">
                  Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, totalCount)} of {totalCount}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p - 1)}
                    disabled={page === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= totalPages - 1}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No audit log entries found
            </div>
          )}
        </CardContent>
      </Card>

      {/* HIPAA Info */}
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
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
              />
            </svg>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                HIPAA Compliance Note
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                This audit log records all significant actions taken within your organization.
                PHI field names are logged (e.g., &quot;email was scrubbed&quot;) but actual PHI values are never recorded.
                Audit logs are retained for 6 years per HIPAA requirements.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
