import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import type { Organization } from '@/packages/types/database';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 100);
}

export async function POST(request: Request) {
  try {
    const { userId, email, organizationName } = await request.json();

    if (!userId || !email || !organizationName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Generate a unique slug
    let slug = generateSlug(organizationName);
    let slugSuffix = 0;

    // Check if slug exists and make it unique
    while (true) {
      const testSlug = slugSuffix === 0 ? slug : `${slug}-${slugSuffix}`;
      const { data: existing } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', testSlug)
        .single();

      if (!existing) {
        slug = testSlug;
        break;
      }
      slugSuffix++;
    }

    // Create the organization
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: organizationName,
        slug,
        subscription_tier: 'free',
      })
      .select()
      .single();

    if (orgError || !orgData) {
      console.error('Error creating organization:', orgError);
      return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
    }

    const org = orgData as Organization;

    // Create the user record
    const { error: userError } = await supabase.from('users').insert({
      id: userId,
      email,
      org_id: org.id,
      role: 'admin' as const,
    });

    if (userError) {
      console.error('Error creating user:', userError);
      // Clean up organization
      await supabase.from('organizations').delete().eq('id', org.id);
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // Log the signup in audit log
    await supabase.from('audit_log').insert({
      org_id: org.id,
      user_id: userId,
      action: 'organization.created',
      resource_type: 'organization',
      resource_id: org.id,
      details: { organization_name: organizationName },
    });

    return NextResponse.json({ success: true, organizationId: org.id });
  } catch (error) {
    console.error('Complete signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
