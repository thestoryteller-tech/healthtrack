import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import type { User, Organization } from '@/packages/types/database';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
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

  if (userRecord?.org_id) {
    const { data: orgData } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', userRecord.org_id)
      .single();
    organization = orgData as Organization | null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar organizationName={organization?.name} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header userEmail={user.email} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
