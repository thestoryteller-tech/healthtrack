import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Event schema validation
const eventSchema = z.object({
  event_type: z.enum(['page_view', 'custom_event', 'conversion']),
  event_name: z.string().min(1).max(255),
  properties: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.iso.datetime(),
  anonymized_session_id: z.string().min(1).max(255),
  page_url: z.string().max(2048),
  referrer: z.string().max(2048),
  sdk_version: z.string().max(50),
  phi_scrubbed: z.array(z.string()).optional(),
});

const consentSchema = z.object({
  analytics: z.boolean(),
  marketing: z.boolean(),
});

const requestSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  events: z.array(eventSchema).min(1, 'At least one event is required').max(100),
  consent: consentSchema.optional(),
});

// Simple in-memory rate limiter (in production, use Redis/Upstash)
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 1000; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute in ms

function checkRateLimit(apiKey: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const limit = rateLimits.get(apiKey);

  if (!limit || now > limit.resetAt) {
    rateLimits.set(apiKey, { count: 1, resetAt: now + RATE_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT - 1, resetIn: RATE_WINDOW };
  }

  if (limit.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0, resetIn: limit.resetAt - now };
  }

  limit.count++;
  return { allowed: true, remaining: RATE_LIMIT - limit.count, resetIn: limit.resetAt - now };
}

// CORS headers for cross-origin SDK requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate request schema
    const parseResult = requestSchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues || [];
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: issues.map((e) => ({
            path: e.path.map(String).join('.'),
            message: e.message,
          })),
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const { apiKey, events, consent } = parseResult.data;

    // Check rate limit before database operations
    const rateLimit = checkRateLimit(apiKey);
    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil(rateLimit.resetIn / 1000);
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter },
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': RATE_LIMIT.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(Date.now() / 1000 + retryAfter).toString(),
          },
        }
      );
    }

    // Validate API key against database
    const supabase = createServiceClient();

    // Hash the API key for lookup (in production, use proper hashing)
    const keyHash = await hashApiKey(apiKey);

    const { data: apiKeyRecord, error: keyError } = await supabase
      .from('api_keys')
      .select('id, org_id, revoked_at')
      .eq('key_hash', keyHash)
      .single();

    if (keyError || !apiKeyRecord) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401, headers: corsHeaders });
    }

    if (apiKeyRecord.revoked_at) {
      return NextResponse.json(
        { error: 'API key has been revoked' },
        { status: 401, headers: corsHeaders }
      );
    }

    const orgId = apiKeyRecord.org_id;

    // Update API key last used timestamp
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKeyRecord.id);

    // Store events in database
    const eventIds: string[] = [];
    const eventsToInsert = events.map((event) => {
      const eventId = crypto.randomUUID();
      eventIds.push(eventId);

      return {
        id: eventId,
        org_id: orgId,
        event_type: event.event_type,
        event_name: event.event_name,
        properties: event.properties || {},
        session_id: event.anonymized_session_id,
        page_url: event.page_url,
        referrer: event.referrer,
        sdk_version: event.sdk_version,
        scrubbed_fields: event.phi_scrubbed || [],
        consent_state: {
          analytics: consent?.analytics ?? true,
          marketing: consent?.marketing ?? true,
        },
        status: 'pending',
        created_at: event.timestamp,
      };
    });

    const { error: insertError } = await supabase.from('events_log').insert(eventsToInsert);

    if (insertError) {
      console.error('Error inserting events:', insertError);
      return NextResponse.json(
        { error: 'Failed to store events' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Log to audit log
    await supabase.from('audit_log').insert({
      org_id: orgId,
      action: 'events_received',
      details: {
        count: events.length,
        event_ids: eventIds,
        sdk_version: events[0]?.sdk_version,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent'),
      },
    });

    // Return success response
    return NextResponse.json(
      {
        success: true,
        eventIds,
        received: events.length,
      },
      {
        status: 202,
        headers: {
          ...corsHeaders,
          'X-RateLimit-Limit': RATE_LIMIT.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        },
      }
    );
  } catch (error) {
    console.error('Unexpected error in events endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Simple hash function for API key (in production, use proper crypto)
async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
