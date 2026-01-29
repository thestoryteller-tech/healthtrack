import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createHash, randomBytes } from 'crypto';
import type { User } from '@/packages/types/database';

/**
 * Generate a secure API key
 * Format: ht_live_XXXXXXXX (32 random hex chars)
 */
function generateApiKey(): string {
  const randomPart = randomBytes(16).toString('hex');
  return `ht_live_${randomPart}`;
}

/**
 * Hash an API key for storage
 */
function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Get the prefix of an API key (for display)
 */
function getKeyPrefix(key: string): string {
  return key.substring(0, 16);
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's org
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userRecord = userData as User;

    const { name, orgId } = await request.json();

    if (!name || !orgId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify orgId matches user's org
    if (orgId !== userRecord.org_id) {
      return NextResponse.json({ error: 'Invalid organization' }, { status: 403 });
    }

    // Generate the API key
    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);
    const keyPrefix = getKeyPrefix(apiKey);

    // Store the key hash in database
    const { error: insertError } = await supabase.from('api_keys').insert({
      org_id: orgId,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      name: name,
    });

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
    }

    // Log to audit
    await supabase.from('audit_log').insert({
      org_id: orgId,
      user_id: user.id,
      action: 'create_api_key',
      details: { key_prefix: keyPrefix, name },
    });

    // Return the actual key (only time it's ever shown)
    return NextResponse.json({
      key: apiKey,
      prefix: keyPrefix,
    });
  } catch (error) {
    console.error('Create key error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's org
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userRecord = userData as User;

    // Get all API keys for the org
    const { data: keysData, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('org_id', userRecord.org_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get keys error:', error);
      return NextResponse.json({ error: 'Failed to get API keys' }, { status: 500 });
    }

    return NextResponse.json({ keys: keysData });
  } catch (error) {
    console.error('Get keys error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
