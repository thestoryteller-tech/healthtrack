=== HealthTrack Pro ===
Contributors: healthtrackpro
Tags: hipaa, tracking, analytics, healthcare, privacy, ga4, meta, tiktok, linkedin
Requires at least: 5.0
Tested up to: 6.4
Stable tag: 1.0.0
Requires PHP: 7.4
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

HIPAA-compliant tracking for healthcare websites. Safely use advertising platforms without exposing PHI.

== Description ==

HealthTrack Pro enables healthcare clinics, hospitals, and medical practices to use modern advertising analytics (Google Analytics 4, Meta/Facebook, TikTok, LinkedIn) while maintaining HIPAA compliance.

**How It Works:**

1. The SDK intercepts tracking events before they leave your website
2. PHI (Protected Health Information) is automatically detected and scrubbed
3. Clean, anonymized events are sent to your HealthTrack dashboard
4. Events are forwarded server-side to advertising platforms

**Key Features:**

* **Automatic PHI Detection** - Emails, phone numbers, SSNs, names, and more are automatically detected and removed
* **Sensitive Page Protection** - Configure URL patterns for pages containing PHI
* **Server-Side Tracking** - Events are forwarded from our secure servers, not the browser
* **Multi-Platform Support** - GA4, Meta Conversions API, TikTok Events API, LinkedIn Conversions API
* **Consent Mode Integration** - Works with Google Consent Mode v2, OneTrust, and Cookiebot
* **Audit Logging** - Complete audit trail for HIPAA compliance

**WooCommerce Compatible:**

Default sensitive patterns automatically protect checkout, cart, and account pages.

**Gravity Forms Compatible:**

Form submission pages are protected by default patterns.

== Installation ==

1. Upload the `healthtrack-pro` folder to `/wp-content/plugins/`
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Go to Settings > HealthTrack Pro
4. Enter your API key from the HealthTrack dashboard
5. Configure sensitive page patterns for your site
6. Save settings

== Frequently Asked Questions ==

= Where do I get an API key? =

Sign up at [healthtrack.io](https://app.healthtrack.io) and create an API key in your dashboard under Settings > API Keys.

= What PHI is automatically detected? =

The SDK detects and scrubs:
- Email addresses
- Phone numbers (US formats)
- Social Security Numbers
- Names in common field patterns
- Date of birth patterns
- URL parameters containing PHI (gclid, fbclid, email, etc.)

= Does this work with WooCommerce? =

Yes! Default sensitive patterns protect checkout, cart, and account pages. You can add additional patterns for your specific setup.

= Does this work with Gravity Forms? =

Yes! The default pattern `**/gf_page/**` protects form submission pages. Add specific form URLs if needed.

= Is this actually HIPAA compliant? =

HealthTrack Pro provides the technical safeguards for HIPAA compliance by ensuring PHI is never transmitted to third-party advertising platforms. However, HIPAA compliance also requires administrative and physical safeguards. Please consult with a compliance expert and sign a BAA with HealthTrack Pro for full compliance.

= Can I self-host the tracking server? =

Yes, HealthTrack Pro is open source. You can deploy it on your own infrastructure and point the plugin to your server URL.

== Changelog ==

= 1.0.0 =
* Initial release
* Automatic PHI detection and scrubbing
* WooCommerce and Gravity Forms compatibility
* Configurable sensitive page patterns
* Debug mode for troubleshooting

== Upgrade Notice ==

= 1.0.0 =
Initial release of HealthTrack Pro WordPress plugin.
