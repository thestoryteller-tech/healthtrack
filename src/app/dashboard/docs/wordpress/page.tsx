'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function WordPressPluginPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          WordPress Plugin
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Install HealthTrack Pro on your WordPress site in minutes
        </p>
      </div>

      {/* Download Card */}
      <Card className="border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-blue-500 flex items-center justify-center">
                <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 19c-4.411 0-8-3.589-8-8 0-4.411 3.589-8 8-8 4.411 0 8 3.589 8 8 0 4.411-3.589 8-8 8z"/>
                  <path d="M12 5.5c-3.584 0-6.5 2.916-6.5 6.5s2.916 6.5 6.5 6.5 6.5-2.916 6.5-6.5-2.916-6.5-6.5-6.5zm3.432 4.115l-1.648 4.81c-.105.307-.311.566-.586.738l-3.152 1.971a.25.25 0 01-.38-.214l.19-3.697c.022-.424.227-.818.558-1.075l3.34-2.593a.75.75 0 011.178.06z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100">
                  HealthTrack Pro for WordPress
                </h2>
                <p className="text-blue-700 dark:text-blue-300">Version 1.0.0 | Compatible with WordPress 5.0+</p>
              </div>
            </div>
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Plugin
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Installation Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Installation Guide</CardTitle>
          <CardDescription>Follow these steps to install and configure the plugin</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center font-bold shrink-0">
              1
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Download the Plugin</h3>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Click the download button above to get the <code className="text-sm bg-gray-100 dark:bg-gray-800 px-1 rounded">healthtrack-pro.zip</code> file.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center font-bold shrink-0">
              2
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Upload to WordPress</h3>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Go to <strong>WordPress Admin → Plugins → Add New → Upload Plugin</strong>, then upload the ZIP file.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center font-bold shrink-0">
              3
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Activate the Plugin</h3>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Click &quot;Activate&quot; after installation completes.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center font-bold shrink-0">
              4
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Configure Settings</h3>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Go to <strong>Settings → HealthTrack Pro</strong> and enter your API key.
              </p>
            </div>
          </div>

          {/* Step 5 */}
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Verify Installation</h3>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Visit a page on your site, then check the Live Events page in this dashboard to confirm events are being received.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Plugin Settings</CardTitle>
          <CardDescription>Available configuration options</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium">Setting</th>
                  <th className="text-left py-2 pr-4 font-medium">Description</th>
                  <th className="text-left py-2 font-medium">Default</th>
                </tr>
              </thead>
              <tbody className="text-gray-600 dark:text-gray-400">
                <tr className="border-b">
                  <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">Enable Tracking</td>
                  <td className="py-3 pr-4">Toggle tracking on/off without deactivating the plugin</td>
                  <td className="py-3">Enabled</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">API Key</td>
                  <td className="py-3 pr-4">Your HealthTrack API key (starts with ht_live_)</td>
                  <td className="py-3">None</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">Server URL</td>
                  <td className="py-3 pr-4">Event collection endpoint (change only if self-hosting)</td>
                  <td className="py-3">https://app.healthtrack.io/api/v1/events</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">Sensitive Page Patterns</td>
                  <td className="py-3 pr-4">URL patterns for pages containing PHI (glob syntax)</td>
                  <td className="py-3">WooCommerce + Gravity Forms patterns</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">Debug Mode</td>
                  <td className="py-3 pr-4">Enable console logging for troubleshooting</td>
                  <td className="py-3">Disabled</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Compatibility */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">WooCommerce Compatible</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Default sensitive patterns automatically protect checkout, cart, and account pages.
              PHI from payment forms is never sent to advertising platforms.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gravity Forms Compatible</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Form submission pages are protected by the default pattern <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">**/gf_page/**</code>.
              Add specific form URLs if needed.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">Events not appearing in dashboard?</h4>
            <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400 list-disc list-inside">
              <li>Verify your API key is correct</li>
              <li>Check that tracking is enabled in plugin settings</li>
              <li>Enable Debug Mode and check browser console for errors</li>
              <li>Ensure your site can make requests to app.healthtrack.io</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">Too many events being blocked?</h4>
            <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400 list-disc list-inside">
              <li>Review your sensitive page patterns</li>
              <li>Use more specific patterns instead of broad wildcards</li>
              <li>Check the Live Events page to see which pages are being marked as sensitive</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">Plugin conflicts?</h4>
            <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400 list-disc list-inside">
              <li>Disable other tracking/analytics plugins temporarily</li>
              <li>Check for JavaScript errors in the browser console</li>
              <li>Ensure no caching plugins are caching the tracking script</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
