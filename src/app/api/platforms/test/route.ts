import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Platform } from '@/packages/types/database';

interface TestRequest {
  platform: Platform;
  credentials: Record<string, string>;
}

/**
 * Test platform credentials
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { platform, credentials } = (await request.json()) as TestRequest;

    if (!platform || !credentials) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Test the connection based on platform
    const result = await testPlatformCredentials(platform, credentials);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Platform test error:', error);
    return NextResponse.json({ valid: false, message: 'Internal server error' }, { status: 500 });
  }
}

async function testPlatformCredentials(
  platform: Platform,
  credentials: Record<string, string>
): Promise<{ valid: boolean; message: string }> {
  switch (platform) {
    case 'ga4':
      return testGA4(credentials);
    case 'meta':
      return testMeta(credentials);
    case 'tiktok':
      return testTikTok(credentials);
    case 'linkedin':
      return testLinkedIn(credentials);
    case 'google_ads':
      return testGoogleAds(credentials);
    default:
      return { valid: false, message: 'Unknown platform' };
  }
}

async function testGA4(credentials: Record<string, string>): Promise<{ valid: boolean; message: string }> {
  const { measurement_id, api_secret } = credentials;

  if (!measurement_id || !api_secret) {
    return { valid: false, message: 'Measurement ID and API Secret are required' };
  }

  if (!measurement_id.startsWith('G-')) {
    return { valid: false, message: 'Measurement ID must start with G-' };
  }

  try {
    // GA4 Measurement Protocol debug endpoint
    const response = await fetch(
      `https://www.google-analytics.com/debug/mp/collect?measurement_id=${measurement_id}&api_secret=${api_secret}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: 'test_client',
          events: [{ name: 'test_event', params: {} }],
        }),
      }
    );

    const data = await response.json();

    // Debug endpoint returns validation messages
    if (data.validationMessages && data.validationMessages.length === 0) {
      return { valid: true, message: 'GA4 credentials validated successfully' };
    }

    const errorMsg = data.validationMessages?.[0]?.description || 'Validation failed';
    return { valid: false, message: errorMsg };
  } catch (error) {
    return { valid: false, message: 'Failed to connect to GA4' };
  }
}

async function testMeta(credentials: Record<string, string>): Promise<{ valid: boolean; message: string }> {
  const { pixel_id, access_token } = credentials;

  if (!pixel_id || !access_token) {
    return { valid: false, message: 'Pixel ID and Access Token are required' };
  }

  try {
    // Test by checking if we can access the pixel
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pixel_id}?access_token=${access_token}`
    );

    if (response.ok) {
      return { valid: true, message: 'Meta credentials validated successfully' };
    }

    const data = await response.json();
    return { valid: false, message: data.error?.message || 'Invalid credentials' };
  } catch (error) {
    return { valid: false, message: 'Failed to connect to Meta' };
  }
}

async function testTikTok(credentials: Record<string, string>): Promise<{ valid: boolean; message: string }> {
  const { pixel_code, access_token } = credentials;

  if (!pixel_code || !access_token) {
    return { valid: false, message: 'Pixel Code and Access Token are required' };
  }

  // TikTok doesn't have a validation endpoint, so we just check format
  if (access_token.length < 10) {
    return { valid: false, message: 'Access Token appears to be invalid' };
  }

  return { valid: true, message: 'TikTok credentials saved (will validate on first event)' };
}

async function testLinkedIn(credentials: Record<string, string>): Promise<{ valid: boolean; message: string }> {
  const { conversion_id, access_token } = credentials;

  if (!conversion_id || !access_token) {
    return { valid: false, message: 'Conversion ID and Access Token are required' };
  }

  try {
    // Test by checking if we can access the user info
    const response = await fetch('https://api.linkedin.com/v2/me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (response.ok) {
      return { valid: true, message: 'LinkedIn credentials validated successfully' };
    }

    if (response.status === 401) {
      return { valid: false, message: 'Invalid or expired access token' };
    }

    return { valid: false, message: `LinkedIn returned status ${response.status}` };
  } catch (error) {
    return { valid: false, message: 'Failed to connect to LinkedIn' };
  }
}

async function testGoogleAds(credentials: Record<string, string>): Promise<{ valid: boolean; message: string }> {
  const { customer_id } = credentials;

  if (!customer_id) {
    return { valid: false, message: 'Customer ID is required' };
  }

  // Google Ads requires OAuth, so we can only validate format
  const cleanId = customer_id.replace(/-/g, '');
  if (!/^\d{10}$/.test(cleanId)) {
    return { valid: false, message: 'Customer ID must be 10 digits (XXX-XXX-XXXX)' };
  }

  return {
    valid: true,
    message: 'Customer ID format valid. OAuth connection required to complete setup.',
  };
}
