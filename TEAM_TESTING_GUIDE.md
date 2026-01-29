# HealthTrack Pro - Team Testing & Validation Guide

## Business Context

### What is HealthTrack Pro?

HealthTrack Pro is a **HIPAA-compliant tracking SaaS platform** designed for healthcare clinics, hospitals, and medical practices. It allows these organizations to safely use modern advertising analytics (Google Analytics 4, Meta/Facebook, TikTok, LinkedIn) while maintaining HIPAA compliance.

### The Problem We Solve

Healthcare organizations want to use digital advertising and analytics to grow their practices, but:
- Standard tracking pixels send PHI (Protected Health Information) to third-party platforms
- This violates HIPAA regulations and can result in significant fines
- Many healthcare websites have shut down their advertising due to compliance fears

### Our Solution

1. **Client-side SDK** intercepts tracking events before they leave the website
2. **PHI Detection** automatically identifies and scrubs sensitive data (emails, SSNs, phone numbers, etc.)
3. **Server-side Forwarding** sends clean, anonymized events to advertising platforms
4. **Audit Logging** provides complete HIPAA-compliant trail for compliance reporting

---

## Technical Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  Healthcare     │     │  HealthTrack     │     │  Ad Platforms       │
│  Website        │────▶│  Server          │────▶│  (GA4, Meta, etc.)  │
│  + SDK          │     │  (PHI scrubbing) │     │                     │
└─────────────────┘     └──────────────────┘     └─────────────────────┘
        │                       │
        │                       ▼
        │               ┌──────────────────┐
        │               │  Supabase DB     │
        │               │  (events, audit) │
        │               └──────────────────┘
        │
        ▼
┌─────────────────┐
│  Dashboard      │
│  (Next.js)      │
└─────────────────┘
```

### Tech Stack

- **Frontend**: Next.js 16.x with App Router, React 19, TypeScript
- **UI Components**: shadcn/ui with Tailwind CSS
- **Database**: Supabase (PostgreSQL with RLS)
- **Authentication**: Supabase Auth
- **Payments**: Stripe
- **SDK**: Vanilla JavaScript (ES5 compatible)

---

## Setup Instructions

### Prerequisites

1. Node.js 18+ installed
2. Supabase project created (free tier works)
3. Stripe account (test mode for development)

### Environment Configuration

Create a `.env.local` file with:

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe (Optional for billing features)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...

# Platform Credentials (Optional for testing forwarding)
GA4_MEASUREMENT_ID=G-...
GA4_API_SECRET=...
META_ACCESS_TOKEN=...
META_PIXEL_ID=...
TIKTOK_ACCESS_TOKEN=...
TIKTOK_PIXEL_CODE=...
LINKEDIN_ACCESS_TOKEN=...
```

### Database Setup

1. Go to your Supabase project
2. Run the SQL migrations from `/supabase/migrations/` in the SQL editor
3. Or use the Supabase CLI: `supabase db push`

### Installation

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:3000`

---

## Testing Checklist

### 1. Automated Tests (Run First)

```bash
# Run all unit/integration tests (180 tests)
npm run test:run

# Run with watch mode for development
npm run test

# Run E2E tests (requires dev server running)
npm run test:e2e
```

**Expected Results:**
- 180 tests should pass
- TypeScript should compile without errors: `npm run typecheck`
- Build should complete: `npm run build`

### 2. Authentication Flow Testing

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Signup | Go to `/signup`, enter valid email/password | Account created, redirected to dashboard |
| Login | Go to `/login`, enter credentials | Logged in, redirected to dashboard |
| Logout | Click user menu, select Logout | Session cleared, redirected to login |
| Protected Routes | Try accessing `/dashboard` when logged out | Redirected to login page |
| Password Reset | Click "Forgot Password" on login | Reset email sent (check Supabase logs) |

### 3. Dashboard Functionality

#### 3.1 Organization Settings (`/dashboard/settings`)
- [ ] View organization name
- [ ] Update organization name
- [ ] View team members
- [ ] Invite new team member
- [ ] Remove team member

#### 3.2 API Keys (`/dashboard/settings/api-keys`)
- [ ] Create new API key
- [ ] View masked API key list
- [ ] Copy API key to clipboard
- [ ] Revoke API key
- [ ] Verify revoked keys don't work

#### 3.3 Platform Connections (`/dashboard/platforms`)
- [ ] View available platforms (GA4, Meta, TikTok, LinkedIn)
- [ ] Connect a platform (enter credentials)
- [ ] Test platform connection
- [ ] Disconnect platform
- [ ] Toggle platform enabled/disabled

#### 3.4 Sensitive Pages (`/dashboard/settings/sensitive-pages`)
- [ ] View default patterns
- [ ] Add custom URL pattern
- [ ] Edit existing pattern
- [ ] Delete pattern
- [ ] Test pattern matching

#### 3.5 Event Mapping (`/dashboard/settings/events`)
- [ ] View default event mappings
- [ ] Edit destination event name
- [ ] Toggle mapping enabled/disabled
- [ ] Add custom event mapping
- [ ] Reset to defaults

#### 3.6 Live Events (`/dashboard/events/live`)
- [ ] View real-time event stream
- [ ] Pause/Resume live updates
- [ ] Filter by event type
- [ ] Filter by platform
- [ ] Expand event to see details
- [ ] Verify PHI scrubbed fields shown

#### 3.7 Audit Log (`/dashboard/audit-log`)
- [ ] View audit entries
- [ ] Search/filter entries
- [ ] Export to CSV
- [ ] Pagination works correctly
- [ ] Expand entry for details

#### 3.8 Usage & Billing (`/dashboard/usage`, `/dashboard/settings/billing`)
- [ ] View current usage stats
- [ ] View plan limits
- [ ] See usage warnings at 90%+
- [ ] Upgrade plan (Stripe checkout)
- [ ] Manage billing portal

### 4. SDK Testing

#### 4.1 SDK Unit Tests
```bash
npm run test:run -- sdk
```

**PHI Detection Tests (60+ tests):**
- Email patterns: `test@example.com`, `user.name@domain.co.uk`
- Phone patterns: `(555) 123-4567`, `555-123-4567`, `+1 555 123 4567`
- SSN patterns: `123-45-6789`, `123 45 6789`
- Name detection in form fields
- URL parameter scrubbing (`email=`, `ssn=`, `name=`)
- Custom field patterns

#### 4.2 SDK Integration Test

1. Create a test HTML file:
```html
<!DOCTYPE html>
<html>
<head>
  <title>SDK Test</title>
  <script src="http://localhost:3000/sdk/healthtrack.min.js"></script>
</head>
<body>
  <h1>Test Page</h1>
  <script>
    HealthTrack.init({
      apiKey: 'YOUR_API_KEY',
      serverUrl: 'http://localhost:3000/api/v1/events',
      debug: true
    });

    // Test page view
    HealthTrack.pageView();

    // Test event with PHI (should be scrubbed)
    HealthTrack.track('form_submit', {
      email: 'patient@example.com',  // Should be scrubbed
      phone: '555-123-4567',         // Should be scrubbed
      formName: 'Contact Form'        // Should NOT be scrubbed
    });
  </script>
</body>
</html>
```

2. Open the file in a browser
3. Check browser console for debug output
4. Verify events appear in Live Events dashboard
5. Verify PHI fields are marked as "scrubbed"

### 5. API Endpoint Testing

Use curl or Postman to test:

#### Event Ingestion (Public)
```bash
# Should fail without API key
curl -X POST http://localhost:3000/api/v1/events \
  -H "Content-Type: application/json" \
  -d '{"event_type":"page_view","url":"https://test.com"}'

# Should succeed with valid API key
curl -X POST http://localhost:3000/api/v1/events \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ht_live_your_key_here" \
  -d '{"event_type":"page_view","url":"https://test.com"}'
```

#### Protected Endpoints (Require Auth Cookie)
```bash
# These will return 401 without auth
curl http://localhost:3000/api/keys
curl http://localhost:3000/api/platforms
curl http://localhost:3000/api/usage
```

### 6. PHI Scrubbing Validation

| PHI Type | Test Value | Should Be | Verified |
|----------|------------|-----------|----------|
| Email | `john@hospital.com` | Scrubbed | [ ] |
| Phone (US) | `(555) 123-4567` | Scrubbed | [ ] |
| SSN | `123-45-6789` | Scrubbed | [ ] |
| Name in field | `first_name: John` | Scrubbed | [ ] |
| DOB | `dob: 1990-01-15` | Scrubbed | [ ] |
| Normal text | `Hello world` | Preserved | [ ] |
| Page title | `Our Services` | Preserved | [ ] |
| Click ID | `gclid: abc123` | Scrubbed | [ ] |

### 7. Security Testing

- [ ] Verify X-Frame-Options header present
- [ ] Verify Content-Security-Policy header present
- [ ] Verify Strict-Transport-Security header present
- [ ] Verify API returns 401 without auth
- [ ] Verify API keys are hashed in database
- [ ] Verify RLS policies prevent cross-org data access

### 8. WordPress Plugin Testing

1. Build the plugin:
```bash
./scripts/build-wordpress-plugin.sh
```

2. Install on WordPress site
3. Configure API key in Settings > HealthTrack Pro
4. Add sensitive page patterns
5. Visit pages and verify events in dashboard

---

## How to Run Complete Validation

### Quick Validation (5 minutes)
```bash
npm run typecheck    # TypeScript compilation
npm run test:run     # All 180 unit tests
npm run build        # Production build (28 routes)
```

### Full Validation Checklist

1. **Automated Tests**: All passing
2. **Authentication**: Signup, login, logout, protected routes
3. **API Keys**: Create, copy, revoke
4. **Platforms**: Connect, test, disconnect
5. **Sensitive Pages**: Add, edit, delete patterns
6. **SDK**: PHI detection working
7. **Live Events**: Real-time feed working
8. **Audit Log**: Entries logged, exportable

---

## Troubleshooting

### Common Issues

**"Supabase not configured" warning**
- Ensure `.env.local` has valid Supabase credentials
- Restart the dev server after adding env vars

**Dashboard shows 500 error**
- Check Supabase connection
- Verify database migrations are applied
- Check browser console for specific error

**SDK events not appearing**
- Verify API key is valid and not revoked
- Check browser console for errors
- Enable SDK debug mode: `HealthTrack.init({ debug: true })`

**Stripe checkout fails**
- Verify Stripe keys are for the same account (test vs live)
- Check Stripe dashboard for webhook events

---

## Contact & Support

- **Technical Issues**: Create a GitHub issue
- **Security Concerns**: security@healthtrack.io
- **HIPAA/Compliance**: compliance@healthtrack.io

---

## Appendix: File Structure

```
/src
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── v1/events/    # Event ingestion
│   │   ├── keys/         # API key management
│   │   ├── platforms/    # Platform management
│   │   └── webhooks/     # Stripe webhooks
│   ├── dashboard/         # Dashboard pages
│   │   ├── audit-log/
│   │   ├── compliance/
│   │   ├── events/live/
│   │   ├── platforms/
│   │   ├── settings/
│   │   ├── usage/
│   │   └── verify/
│   ├── login/
│   └── signup/
├── components/ui/          # shadcn/ui components
├── lib/                    # Utilities
│   ├── supabase/          # Supabase clients
│   ├── stripe/            # Stripe integration
│   └── usage/             # Usage tracking
├── sdk/                    # Browser SDK
│   └── src/
│       ├── phi-scrubber.ts
│       ├── consent-manager.ts
│       └── index.ts
└── __tests__/              # Test files
    ├── sdk/
    └── integration/

/e2e                        # Playwright E2E tests
/integrations/wordpress     # WordPress plugin
/supabase/migrations        # Database migrations
```
