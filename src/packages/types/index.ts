// Core types for HealthTrack Pro

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  subscription_tier: 'free' | 'pro' | 'enterprise';
}

export interface User {
  id: string;
  email: string;
  org_id: string;
  role: 'admin' | 'member';
  created_at: string;
}

export interface ApiKey {
  id: string;
  org_id: string;
  key_hash: string;
  name: string;
  created_at: string;
  revoked_at: string | null;
}

export interface TrackingConfig {
  id: string;
  org_id: string;
  platform: 'ga4' | 'meta' | 'tiktok' | 'google_ads' | 'linkedin';
  credentials_encrypted: string;
  enabled: boolean;
  created_at: string;
}

export interface SensitivePage {
  id: string;
  org_id: string;
  url_pattern: string;
  action: 'block' | 'strip';
  created_at: string;
}

export interface EventLog {
  id: string;
  org_id: string;
  event_type: string;
  platform: string;
  scrubbed_fields: string[];
  created_at: string;
}

export interface AuditLog {
  id: string;
  org_id: string;
  user_id: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

// SDK Types
export interface TrackingEvent {
  event_type: 'page_view' | 'custom_event' | 'conversion';
  event_name: string;
  properties?: Record<string, unknown>;
  timestamp: string;
  session_id: string;
  page_url: string;
  referrer?: string;
  consent_state?: ConsentState;
}

export interface ConsentState {
  analytics: boolean;
  marketing: boolean;
}

export interface SDKConfig {
  apiKey: string;
  serverUrl?: string;
  debug?: boolean;
}
