-- Extend events_log table with additional fields for SDK events
-- This migration adds fields needed by the /api/v1/events endpoint

-- Add new columns to events_log
ALTER TABLE events_log ADD COLUMN IF NOT EXISTS properties JSONB DEFAULT '{}';
ALTER TABLE events_log ADD COLUMN IF NOT EXISTS session_id VARCHAR(255);
ALTER TABLE events_log ADD COLUMN IF NOT EXISTS page_url VARCHAR(2048);
ALTER TABLE events_log ADD COLUMN IF NOT EXISTS referrer VARCHAR(2048);
ALTER TABLE events_log ADD COLUMN IF NOT EXISTS sdk_version VARCHAR(50);
ALTER TABLE events_log ADD COLUMN IF NOT EXISTS consent_analytics BOOLEAN DEFAULT true;
ALTER TABLE events_log ADD COLUMN IF NOT EXISTS consent_marketing BOOLEAN DEFAULT true;
ALTER TABLE events_log ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed'));
ALTER TABLE events_log ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- Create index for status-based queries (for event processing)
CREATE INDEX IF NOT EXISTS idx_events_log_status ON events_log(status, created_at);
CREATE INDEX IF NOT EXISTS idx_events_log_session ON events_log(session_id, created_at);

-- Allow service role to insert events (bypasses RLS for API ingestion)
CREATE POLICY "Service role can insert events" ON events_log
    FOR INSERT
    WITH CHECK (true);

-- Allow service role to update event status (for processing)
CREATE POLICY "Service role can update events" ON events_log
    FOR UPDATE
    USING (true);
