import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { EventLog } from '@/packages/types/database';

export async function POST(request: NextRequest) {
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

    // Create a test event
    const testEvent = {
      org_id: userData.org_id,
      event_type: 'test_event',
      event_name: 'Installation Verification Test',
      created_at: new Date().toISOString(),
      scrubbed_fields: [],
      platforms_sent: [],
      raw_payload: {
        source: 'dashboard_verification',
        timestamp: Date.now(),
        test: true,
      },
    };

    const { data: insertedEvent, error: insertError } = await supabase
      .from('events_log')
      .insert(testEvent)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting test event:', insertError);
      return NextResponse.json({ error: 'Failed to create test event' }, { status: 500 });
    }

    const eventRecord = insertedEvent as EventLog | null;

    // Also log to audit log
    await supabase
      .from('audit_log')
      .insert({
        org_id: userData.org_id,
        user_id: user.id,
        action: 'test_event_sent',
        details: {
          event_id: eventRecord?.id,
          source: 'dashboard_verification',
        },
      });

    return NextResponse.json({
      success: true,
      event_id: eventRecord?.id,
      message: 'Test event sent successfully'
    });
  } catch (error) {
    console.error('Test event error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
