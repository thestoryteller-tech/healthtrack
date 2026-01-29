import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUsageStatus, PLAN_LIMITS, type PlanType } from '@/lib/usage/check-limits';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userData } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (!userData?.org_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    // Get organization details
    const { data: org } = await supabase
      .from('organizations')
      .select('subscription_tier')
      .eq('id', userData.org_id)
      .single();

    const plan = (org?.subscription_tier as PlanType) || 'free';
    const usage = await getUsageStatus(userData.org_id);

    if (!usage) {
      return NextResponse.json({ error: 'Failed to get usage' }, { status: 500 });
    }

    return NextResponse.json({
      plan,
      limits: PLAN_LIMITS[plan],
      usage,
    });
  } catch (error) {
    console.error('Usage error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
