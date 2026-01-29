import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const PLAN_LIMITS = {
  free: {
    events_per_month: 1000,
    platforms: 1,
    team_members: 2,
  },
  pro: {
    events_per_month: 100000,
    platforms: -1, // unlimited
    team_members: 10,
  },
  enterprise: {
    events_per_month: -1, // unlimited
    platforms: -1,
    team_members: -1,
  },
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;

export interface UsageStatus {
  events: {
    used: number;
    limit: number;
    percentage: number;
    exceeded: boolean;
  };
  platforms: {
    used: number;
    limit: number;
    exceeded: boolean;
  };
  teamMembers: {
    used: number;
    limit: number;
    exceeded: boolean;
  };
}

export async function getUsageStatus(orgId: string): Promise<UsageStatus | null> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get organization plan
  const { data: org } = await supabase
    .from('organizations')
    .select('subscription_tier')
    .eq('id', orgId)
    .single();

  if (!org) return null;

  const plan = (org.subscription_tier as PlanType) || 'free';
  const limits = PLAN_LIMITS[plan];

  // Get current month start
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Count events this month
  const { count: eventsCount } = await supabase
    .from('events_log')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .gte('created_at', monthStart.toISOString());

  // Count connected platforms
  const { count: platformsCount } = await supabase
    .from('tracking_configs')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('enabled', true);

  // Count team members
  const { count: membersCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId);

  const eventsUsed = eventsCount || 0;
  const eventsLimit = limits.events_per_month;
  const eventsPercentage = eventsLimit === -1 ? 0 : Math.round((eventsUsed / eventsLimit) * 100);

  return {
    events: {
      used: eventsUsed,
      limit: eventsLimit,
      percentage: eventsPercentage,
      exceeded: eventsLimit !== -1 && eventsUsed >= eventsLimit,
    },
    platforms: {
      used: platformsCount || 0,
      limit: limits.platforms,
      exceeded: limits.platforms !== -1 && (platformsCount || 0) >= limits.platforms,
    },
    teamMembers: {
      used: membersCount || 0,
      limit: limits.team_members,
      exceeded: limits.team_members !== -1 && (membersCount || 0) >= limits.team_members,
    },
  };
}

export async function checkEventLimit(orgId: string): Promise<{ allowed: boolean; reason?: string }> {
  const usage = await getUsageStatus(orgId);

  if (!usage) {
    return { allowed: false, reason: 'Organization not found' };
  }

  if (usage.events.exceeded) {
    return {
      allowed: false,
      reason: `Monthly event limit (${usage.events.limit.toLocaleString()}) exceeded`,
    };
  }

  // Warn at 90%
  if (usage.events.percentage >= 90) {
    console.warn(`Organization ${orgId} is at ${usage.events.percentage}% of event limit`);
  }

  return { allowed: true };
}
