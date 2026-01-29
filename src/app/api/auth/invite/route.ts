import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';
import type { User } from '@/packages/types/database';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's org and check if admin
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userRecord = userData as User;

    if (userRecord.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can invite members' }, { status: 403 });
    }

    const { email, role, orgId } = await request.json();

    if (!email || !role || !orgId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify orgId matches user's org
    if (orgId !== userRecord.org_id) {
      return NextResponse.json({ error: 'Invalid organization' }, { status: 403 });
    }

    // Use service client to invite user via Supabase Auth
    const { data: inviteData, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          org_id: orgId,
          role: role,
          invited_by: user.id,
        },
      }
    );

    if (inviteError) {
      console.error('Invite error:', inviteError);
      return NextResponse.json({ error: inviteError.message }, { status: 400 });
    }

    // Create user record for the invited user
    if (inviteData.user) {
      const { error: userError } = await serviceClient
        .from('users')
        .insert({
          id: inviteData.user.id,
          email: email,
          org_id: orgId,
          role: role,
        });

      if (userError) {
        console.error('User record error:', userError);
      }
    }

    // Log to audit
    await supabase.from('audit_log').insert({
      org_id: orgId,
      user_id: user.id,
      action: 'invite_member',
      details: { invited_email: email, role },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
