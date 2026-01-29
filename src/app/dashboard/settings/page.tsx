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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { Organization, User } from '@/packages/types/database';

type TeamMember = User;

export default function SettingsPage() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviting, setInviting] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user record with org
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!userData) return;
      const userRecord = userData as User;
      setCurrentUser(userRecord);

      // Get organization
      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', userRecord.org_id)
        .single();

      if (orgData) {
        const org = orgData as Organization;
        setOrganization(org);
        setOrgName(org.name);
      }

      // Get team members
      const { data: membersData } = await supabase
        .from('users')
        .select('*')
        .eq('org_id', userRecord.org_id)
        .order('created_at', { ascending: true });

      if (membersData) {
        setTeamMembers(membersData as TeamMember[]);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function saveOrganization() {
    if (!organization) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('organizations')
        .update({ name: orgName })
        .eq('id', organization.id);

      if (error) throw error;
      setOrganization({ ...organization, name: orgName });
    } catch (error) {
      console.error('Error saving organization:', error);
    } finally {
      setSaving(false);
    }
  }

  async function inviteMember() {
    if (!organization || !inviteEmail) return;
    setInviting(true);

    try {
      // Call invite API endpoint
      const response = await fetch('/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          orgId: organization.id,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to invite member');
      }

      // Reset and close modal
      setInviteEmail('');
      setInviteRole('member');
      setInviteOpen(false);

      // Reload team members
      await loadData();
    } catch (error) {
      console.error('Error inviting member:', error);
    } finally {
      setInviting(false);
    }
  }

  async function removeMember(userId: string) {
    if (!organization) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)
        .eq('org_id', organization.id);

      if (error) throw error;

      // Remove from local state
      setTeamMembers(members => members.filter(m => m.id !== userId));
    } catch (error) {
      console.error('Error removing member:', error);
    }
  }

  async function updateMemberRole(userId: string, newRole: 'admin' | 'member') {
    if (!organization) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId)
        .eq('org_id', organization.id);

      if (error) throw error;

      // Update local state
      setTeamMembers(members =>
        members.map(m => m.id === userId ? { ...m, role: newRole } : m)
      );
    } catch (error) {
      console.error('Error updating role:', error);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded" />
        </div>
      </div>
    );
  }

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Organization Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your organization profile and team members
        </p>
      </div>

      {/* Organization Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Profile</CardTitle>
          <CardDescription>
            Basic information about your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization Name</Label>
              <Input
                id="org-name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-slug">Organization Slug</Label>
              <Input
                id="org-slug"
                value={organization?.slug || ''}
                disabled
                className="bg-gray-50 dark:bg-gray-900"
              />
              <p className="text-xs text-gray-500">Cannot be changed</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Created</Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {organization?.created_at
                  ? new Date(organization.created_at).toLocaleDateString()
                  : '-'}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Subscription</Label>
              <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                {organization?.subscription_tier || 'free'} Plan
              </p>
            </div>
          </div>
          {isAdmin && (
            <div className="flex justify-end">
              <Button onClick={saveOrganization} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              Manage who has access to this organization
            </CardDescription>
          </div>
          {isAdmin && (
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button>Invite Member</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join your organization
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email Address</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="colleague@clinic.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-role">Role</Label>
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'admin' | 'member')}>
                      <SelectTrigger id="invite-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      Admins can manage team members and settings
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setInviteOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={inviteMember} disabled={inviting || !inviteEmail}>
                    {inviting ? 'Sending...' : 'Send Invitation'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.email}</TableCell>
                  <TableCell>
                    {isAdmin && member.id !== currentUser?.id ? (
                      <Select
                        value={member.role}
                        onValueChange={(v) => updateMemberRole(member.id, v as 'admin' | 'member')}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="capitalize">{member.role}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {member.created_at
                      ? new Date(member.created_at).toLocaleDateString()
                      : '-'}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      {member.id !== currentUser?.id && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                              Remove
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove {member.email} from your organization?
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => removeMember(member.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {teamMembers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No team members found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscription Status */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>
            Your current plan and billing information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold capitalize">
                {organization?.subscription_tier || 'Free'} Plan
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {organization?.subscription_tier === 'free'
                  ? '1,000 events/month'
                  : organization?.subscription_tier === 'pro'
                  ? '100,000 events/month'
                  : 'Unlimited events/month'}
              </p>
            </div>
            {isAdmin && (
              <Button variant="outline">
                {organization?.subscription_tier === 'free'
                  ? 'Upgrade Plan'
                  : 'Manage Subscription'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
