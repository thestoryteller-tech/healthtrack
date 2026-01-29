# HIPAA-Compliant Tracking SaaS Platform

## Product Overview

**Product Name:** HealthTrack Pro (working title)

**Vision:** A turnkey SaaS platform that enables healthcare clinics to safely use advertising platforms (Meta, Google, TikTok, LinkedIn) without exposing Protected Health Information (PHI). Clinics integrate via a simple script tag or plugin, and all tracking data flows through our HIPAA-compliant infrastructure before being sent to ad platforms.

**Target Customers:** Small to mid-sized healthcare clinics who want to run digital advertising but need HIPAA compliance.

**Business Model:** Monthly SaaS subscription with tiered pricing based on event volume.

## Technical Architecture

### Core Components

1. **Client-Side SDK** - Lightweight JavaScript snippet that clinics embed
2. **Server-Side Proxy** - Node.js/Next.js API that receives events, strips PHI, and forwards to ad platforms
3. **Dashboard** - React admin panel for clinic configuration and analytics
4. **Database** - Supabase (PostgreSQL) for multi-tenant data storage
5. **CMS Plugins** - WordPress, Webflow integrations

### HIPAA Compliance Strategy

- **No PHI Storage**: Never store names, emails, health conditions, or other PHI
- **Data Minimization**: Only collect what's needed for attribution (anonymized IDs)
- **Server-Side Processing**: PHI filtering happens server-side before any data leaves
- **Audit Logging**: Complete audit trail of all data processing
- **BAA-Ready Infrastructure**: Vercel Enterprise + Supabase Pro with BAA agreements

### Hosting Requirements

- Vercel (Enterprise plan with HIPAA BAA)
- Supabase (Pro plan with HIPAA BAA)
- All data processing in US regions

## Platform Integrations

### Phase 1 (MVP)
1. **Google Analytics 4** - Server-side Measurement Protocol
2. **Meta Conversions API** - Server-side event tracking (no Advanced Matching)

### Phase 2
3. **Google Ads** - Offline Conversion Import
4. **TikTok Events API** - Server-side tracking

### Phase 3
5. **LinkedIn Conversions API**
6. **HubSpot** - CRM sync (non-PHI fields only)

## User Stories

### Epic 1: Project Setup & Infrastructure

#### US-001: Initialize Next.js Project with TypeScript
Initialize a Next.js 14+ project with TypeScript, ESLint, Prettier, and Tailwind CSS. Set up the folder structure for a monorepo-style project with separate client SDK, server API, and dashboard sections.

**Acceptance Criteria:**
- Next.js 14+ with App Router
- TypeScript strict mode enabled
- ESLint + Prettier configured
- Tailwind CSS with shadcn/ui components
- Folder structure: /app (dashboard), /lib (shared), /sdk (client SDK), /api
- Package.json with all dependencies
- Typecheck passes

#### US-002: Set Up Supabase Database Schema
Create the core database schema for multi-tenant SaaS including organizations, users, tracking configurations, and audit logs.

**Acceptance Criteria:**
- Supabase project configuration
- Tables: organizations, users, tracking_configs, sensitive_pages, platform_credentials, events_log, audit_log
- Row-Level Security (RLS) policies for multi-tenancy
- TypeScript types generated from schema
- Migration files created
- Typecheck passes

#### US-003: Authentication System with Supabase Auth
Implement user authentication using Supabase Auth with email/password and magic link options. Include organization-based access control.

**Acceptance Criteria:**
- Sign up, sign in, sign out flows
- Email verification
- Password reset functionality
- Organization membership management
- Protected route middleware
- Session management
- Typecheck passes

### Epic 2: Client-Side SDK

#### US-004: Create Base Tracking SDK
Build a lightweight JavaScript SDK that clinics embed on their websites. The SDK should intercept and proxy tracking events.

**Acceptance Criteria:**
- SDK under 10KB gzipped
- Initialize with organization API key
- Auto-detect page views
- Queue events for batch sending
- Graceful degradation if blocked
- TypeScript source with ES5 output
- Typecheck passes

#### US-005: PHI Detection in SDK
Add client-side PHI detection to warn (in dev mode) and strip sensitive data before sending to server.

**Acceptance Criteria:**
- Detect common PHI patterns (email, phone, SSN, names in URLs)
- Strip gclid, fbclid from sensitive page URLs
- Configurable sensitive URL patterns
- Development mode warnings in console
- Production mode silent filtering
- Typecheck passes

#### US-006: Event Tracking API in SDK
Implement methods for tracking custom events, conversions, and page views with automatic data sanitization.

**Acceptance Criteria:**
- trackPageView() - automatic page view tracking
- trackEvent(name, properties) - custom event tracking
- trackConversion(name, value) - conversion tracking
- All events pass through PHI filter
- Events include anonymized session ID
- Typecheck passes

#### US-007: Consent Mode Integration
Add consent mode support that integrates with popular CMPs (OneTrust, Cookiebot, etc.) to respect user preferences.

**Acceptance Criteria:**
- Detect CMP consent signals
- Support Google Consent Mode v2 format
- Pause tracking when consent denied
- Resume with consent granted
- Emit consent state to server
- Generic adapter interface for multiple CMPs
- Typecheck passes

### Epic 3: Server-Side Proxy API

#### US-008: Create Event Ingestion Endpoint
Build the main API endpoint that receives events from the SDK, validates them, and queues for processing.

**Acceptance Criteria:**
- POST /api/v1/events endpoint
- API key validation
- Rate limiting per organization
- Event schema validation
- Queue events for async processing
- Return 202 Accepted with event ID
- Typecheck passes

#### US-009: Server-Side PHI Scrubbing
Implement comprehensive PHI scrubbing on the server before any data is forwarded to third parties.

**Acceptance Criteria:**
- Remove all PII fields (email, phone, name, address, IP)
- Hash user identifiers
- Strip URL query parameters containing PHI
- Scrub referrer URLs
- Log scrubbing actions to audit log
- Typecheck passes

#### US-010: GA4 Measurement Protocol Integration
Implement server-side forwarding to Google Analytics 4 via Measurement Protocol.

**Acceptance Criteria:**
- Send events to GA4 Measurement Protocol
- Support page_view, custom events, conversions
- Map SDK events to GA4 format
- Handle API errors gracefully
- Retry failed requests
- Store GA4 credentials per organization
- Typecheck passes

#### US-011: Meta Conversions API Integration
Implement server-side forwarding to Meta (Facebook) Conversions API without Advanced Matching.

**Acceptance Criteria:**
- Send events to Meta CAPI
- Support PageView, ViewContent, Lead, Purchase events
- NO email, phone, or user data in payload
- Use external_id with hashed session ID only
- Event deduplication support
- Store Meta credentials per organization
- Typecheck passes

#### US-012: TikTok Events API Integration
Implement server-side forwarding to TikTok Events API.

**Acceptance Criteria:**
- Send events to TikTok Events API
- Support PageView, ViewContent, CompletePayment events
- Strip all PII from payloads
- Use anonymous identifiers only
- Store TikTok credentials per organization
- Typecheck passes

#### US-013: Google Ads Offline Conversion Integration
Implement Google Ads offline conversion import for attribution.

**Acceptance Criteria:**
- Support conversion import via Google Ads API
- Map gclid to conversions (when collected safely)
- Batch conversion uploads
- Handle OAuth refresh
- Store Google Ads credentials per organization
- Typecheck passes

#### US-014: LinkedIn Conversions API Integration
Implement server-side forwarding to LinkedIn Conversions API.

**Acceptance Criteria:**
- Send events to LinkedIn CAPI
- Support conversion events
- Strip all PII from payloads
- Store LinkedIn credentials per organization
- Typecheck passes

### Epic 4: Dashboard - Organization Management

#### US-015: Dashboard Layout and Navigation
Create the main dashboard layout with sidebar navigation, header, and responsive design.

**Acceptance Criteria:**
- Sidebar with navigation items
- Top header with user menu
- Responsive layout (mobile hamburger menu)
- Dark/light mode toggle
- Organization switcher (for users in multiple orgs)
- Typecheck passes

#### US-016: Organization Settings Page
Create settings page for organization profile, billing info, and team management.

**Acceptance Criteria:**
- Organization name, logo upload
- Billing contact information
- Subscription status display
- Invite team members
- Role management (admin, member)
- Typecheck passes

#### US-017: API Key Management
Allow organizations to create, view, and revoke API keys for SDK integration.

**Acceptance Criteria:**
- Generate new API keys
- List active keys with creation date
- Revoke/delete keys
- Copy key to clipboard
- Key usage statistics
- Typecheck passes

### Epic 5: Dashboard - Tracking Configuration

#### US-018: Platform Connections Page
Create UI for connecting advertising platforms (Meta, Google, TikTok, LinkedIn).

**Acceptance Criteria:**
- List available platforms with connection status
- OAuth flow for Google (GA4, Ads)
- Access token input for Meta, TikTok, LinkedIn
- Test connection functionality
- Disconnect option
- Typecheck passes

#### US-019: Sensitive Pages Configuration
Allow clinics to define which URL patterns should have enhanced PHI protection.

**Acceptance Criteria:**
- Add/edit/delete sensitive URL patterns
- Pattern matching preview (test URLs)
- Preset patterns for common healthcare pages
- Toggle tracking on/off per pattern
- Import patterns from CSV
- Typecheck passes

#### US-020: Event Mapping Configuration
Let users customize how events are mapped to different platforms.

**Acceptance Criteria:**
- Default event mappings displayed
- Override event names per platform
- Enable/disable specific events per platform
- Custom event creation
- Typecheck passes

### Epic 6: Dashboard - Analytics & Monitoring

#### US-021: Real-Time Event Monitor
Show live event stream with PHI scrubbing indicators.

**Acceptance Criteria:**
- Live event feed (WebSocket or polling)
- Show event type, timestamp, platform destinations
- Indicate when PHI was scrubbed
- Filter by event type or platform
- Pause/resume feed
- Typecheck passes

#### US-022: Analytics Overview Dashboard
Create main analytics dashboard with key metrics and charts.

**Acceptance Criteria:**
- Event volume over time chart
- Events by platform breakdown
- PHI scrubbing rate statistics
- Error rate monitoring
- Date range selector
- Typecheck passes

#### US-023: Audit Log Viewer
Display audit log for compliance reporting.

**Acceptance Criteria:**
- Searchable audit log
- Filter by date, action type, user
- Export to CSV
- Show PHI scrubbing details (what was removed, not the actual PHI)
- Typecheck passes

### Epic 7: Integration Guides

#### US-024: JavaScript SDK Integration Guide
Create in-app documentation for SDK integration.

**Acceptance Criteria:**
- Step-by-step integration guide
- Code snippets with org API key pre-filled
- Common use case examples
- Troubleshooting section
- Typecheck passes

#### US-025: WordPress Plugin
Create WordPress plugin for one-click integration.

**Acceptance Criteria:**
- WordPress plugin with settings page
- API key configuration
- Auto-inject SDK script
- Sensitive page pattern defaults for common WP health plugins
- Available for download from dashboard
- Typecheck passes

#### US-026: Installation Verification
Help users verify their integration is working correctly.

**Acceptance Criteria:**
- Verification endpoint that checks for recent events
- Dashboard widget showing integration status
- Troubleshooting suggestions for common issues
- Test event sending from dashboard
- Typecheck passes

### Epic 8: Subscription & Billing

#### US-027: Stripe Integration for Subscriptions
Implement Stripe subscription billing.

**Acceptance Criteria:**
- Stripe Customer Portal integration
- Subscription plans (Free tier, Pro, Enterprise)
- Usage-based billing meters
- Webhook handlers for subscription events
- Invoice history
- Typecheck passes

#### US-028: Usage Tracking & Limits
Track event usage and enforce plan limits.

**Acceptance Criteria:**
- Track monthly event volume per organization
- Display usage in dashboard
- Warning emails at 80%, 90% usage
- Soft limit at 100% (queue events, notify)
- Upgrade prompts
- Typecheck passes

### Epic 9: Compliance & Security

#### US-029: HIPAA Compliance Documentation
Generate compliance documentation and BAA workflow.

**Acceptance Criteria:**
- In-app HIPAA compliance guide
- BAA request form
- Data processing agreement display
- Compliance checklist for clinics
- Typecheck passes

#### US-030: Security Headers & Hardening
Implement security best practices.

**Acceptance Criteria:**
- CSP, HSTS, X-Frame-Options headers
- API rate limiting
- Input sanitization
- SQL injection prevention (via Supabase)
- XSS prevention
- Typecheck passes

### Epic 10: Testing & Quality

#### US-031: Unit Tests for PHI Scrubbing
Comprehensive tests for PHI detection and removal.

**Acceptance Criteria:**
- Test suite for PHI detection patterns
- Test URL scrubbing
- Test event payload sanitization
- 100% coverage on scrubbing functions
- Typecheck passes

#### US-032: Integration Tests for Platform APIs
Test integrations with advertising platform APIs.

**Acceptance Criteria:**
- Mock server for GA4, Meta, TikTok, LinkedIn APIs
- Test event forwarding
- Test error handling
- Test retry logic
- Typecheck passes

#### US-033: End-to-End Tests
E2E tests for critical user flows.

**Acceptance Criteria:**
- Test signup/login flow
- Test SDK integration flow
- Test platform connection flow
- Test event tracking flow
- Playwright test suite
- Typecheck passes

## Non-Functional Requirements

- **Performance**: SDK loads in <100ms, API response <200ms p99
- **Availability**: 99.9% uptime SLA
- **Scalability**: Handle 10M events/month per organization
- **Security**: SOC 2 Type II ready, HIPAA compliant infrastructure
- **Privacy**: GDPR compliant, CCPA compliant

## Success Metrics

- Time to first event: <15 minutes from signup
- Integration success rate: >90%
- PHI leak rate: 0%
- Customer satisfaction: >4.5/5

## Open Questions

1. Should we offer a free tier? If so, what limits?
2. Do we need real-time dashboards in the ad platforms, or is daily sync sufficient?
3. Should we build our own CMP or strictly integrate with third-party?
