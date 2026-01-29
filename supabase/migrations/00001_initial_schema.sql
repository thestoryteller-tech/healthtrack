-- HealthTrack Pro Initial Schema
-- Multi-tenant HIPAA-compliant tracking platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    subscription_tier VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
    stripe_customer_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    key_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of the API key
    key_prefix VARCHAR(8) NOT NULL, -- First 8 chars for identification
    name VARCHAR(100) NOT NULL,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

-- Create index for API key lookup
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_org_id ON api_keys(org_id);

-- Tracking configurations table
CREATE TABLE IF NOT EXISTS tracking_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('ga4', 'meta', 'tiktok', 'google_ads', 'linkedin')),
    credentials_encrypted TEXT NOT NULL, -- AES-256 encrypted credentials
    enabled BOOLEAN NOT NULL DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(org_id, platform)
);

-- Sensitive pages table
CREATE TABLE IF NOT EXISTS sensitive_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    url_pattern VARCHAR(500) NOT NULL,
    action VARCHAR(10) NOT NULL DEFAULT 'strip' CHECK (action IN ('block', 'strip')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sensitive_pages_org_id ON sensitive_pages(org_id);

-- Events log table (for tracking processed events)
-- Partitioned by month for better performance
CREATE TABLE IF NOT EXISTS events_log (
    id UUID DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_name VARCHAR(100),
    platforms_sent TEXT[], -- Array of platforms event was sent to
    scrubbed_fields TEXT[], -- Array of field names that were scrubbed
    consent_state JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create partitions for the current and next month
CREATE TABLE IF NOT EXISTS events_log_2026_01 PARTITION OF events_log
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE IF NOT EXISTS events_log_2026_02 PARTITION OF events_log
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE IF NOT EXISTS events_log_2026_03 PARTITION OF events_log
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE INDEX IF NOT EXISTS idx_events_log_org_id ON events_log(org_id, created_at);
CREATE INDEX IF NOT EXISTS idx_events_log_event_type ON events_log(event_type, created_at);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB NOT NULL DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_org_id ON audit_log(org_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

-- Usage tracking table (for billing)
CREATE TABLE IF NOT EXISTS usage_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    event_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(org_id, period_start)
);

-- Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensitive_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE events_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;

-- Organizations: users can only see their own org
CREATE POLICY "Users can view their own organization" ON organizations
    FOR SELECT USING (
        id IN (SELECT org_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Admins can update their organization" ON organizations
    FOR UPDATE USING (
        id IN (SELECT org_id FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- Users: users can see members of their org
CREATE POLICY "Users can view org members" ON users
    FOR SELECT USING (
        org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can manage org members" ON users
    FOR ALL USING (
        org_id IN (SELECT org_id FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- API Keys: users can see their org's keys
CREATE POLICY "Users can view org API keys" ON api_keys
    FOR SELECT USING (
        org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Admins can manage API keys" ON api_keys
    FOR ALL USING (
        org_id IN (SELECT org_id FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- Tracking configs: users can see, admins can manage
CREATE POLICY "Users can view tracking configs" ON tracking_configs
    FOR SELECT USING (
        org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Admins can manage tracking configs" ON tracking_configs
    FOR ALL USING (
        org_id IN (SELECT org_id FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- Sensitive pages: same pattern
CREATE POLICY "Users can view sensitive pages" ON sensitive_pages
    FOR SELECT USING (
        org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Admins can manage sensitive pages" ON sensitive_pages
    FOR ALL USING (
        org_id IN (SELECT org_id FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- Events log: users can view their org's events
CREATE POLICY "Users can view org events" ON events_log
    FOR SELECT USING (
        org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
    );

-- Audit log: users can view their org's audit log
CREATE POLICY "Users can view org audit log" ON audit_log
    FOR SELECT USING (
        org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
    );

-- Usage metrics: users can view their org's usage
CREATE POLICY "Users can view org usage" ON usage_metrics
    FOR SELECT USING (
        org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
    );

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tracking_configs_updated_at BEFORE UPDATE ON tracking_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sensitive_pages_updated_at BEFORE UPDATE ON sensitive_pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_metrics_updated_at BEFORE UPDATE ON usage_metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
