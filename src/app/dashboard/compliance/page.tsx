'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function CompliancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          HIPAA Compliance
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          How HealthTrack Pro helps you maintain HIPAA compliance
        </p>
      </div>

      {/* Overview Card */}
      <Card className="border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-200 dark:bg-blue-800 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                Technical Safeguards for HIPAA
              </h2>
              <p className="text-blue-800 dark:text-blue-200 mt-1">
                HealthTrack Pro provides the <strong>technical safeguards</strong> required by HIPAA
                by ensuring PHI is never transmitted to third-party advertising platforms.
                Your organization is responsible for administrative and physical safeguards.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How We Protect PHI */}
      <Card>
        <CardHeader>
          <CardTitle>How We Protect PHI</CardTitle>
          <CardDescription>Technical measures to prevent PHI exposure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white">Automatic PHI Detection</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 ml-11">
                Our SDK automatically detects and scrubs emails, phone numbers, SSNs,
                names, dates of birth, and other PHI patterns before events leave the browser.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white">Sensitive Page Blocking</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 ml-11">
                Configure URL patterns to completely block tracking on pages that contain PHI,
                such as patient portals, appointment forms, and medical records.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white">Server-Side Forwarding</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 ml-11">
                Events are forwarded to advertising platforms from our secure servers,
                never directly from the user&apos;s browser, providing an additional layer of control.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white">Audit Logging</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 ml-11">
                Complete audit trail of all events, including what PHI fields were detected
                and scrubbed. Logs are retained for 6 years per HIPAA requirements.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PHI Types Detected */}
      <Card>
        <CardHeader>
          <CardTitle>PHI Types Automatically Detected</CardTitle>
          <CardDescription>Data that is automatically scrubbed from tracking events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              'Email addresses',
              'Phone numbers (US formats)',
              'Social Security Numbers',
              'Names (in form fields)',
              'Date of birth patterns',
              'Medical record numbers',
              'Health plan IDs',
              'Account numbers',
              'Certificate/license numbers',
              'Vehicle identifiers',
              'Device identifiers',
              'URLs containing PHI',
              'IP addresses (hashed)',
              'Biometric identifiers',
              'Full-face photos',
              'Geographic data (below state)',
              'Dates (except year)',
              'Web URLs with PHI params',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700 dark:text-gray-300">{item}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Your Responsibilities */}
      <Card>
        <CardHeader>
          <CardTitle>Your HIPAA Responsibilities</CardTitle>
          <CardDescription>Administrative and physical safeguards you must maintain</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg border border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950">
            <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">Important Notice</h4>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              HealthTrack Pro provides technical safeguards only. HIPAA compliance requires
              a comprehensive program including administrative, physical, and technical safeguards.
              Consult with a healthcare compliance expert for your specific needs.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-medium">1</span>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Sign a Business Associate Agreement (BAA)</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Contact <a href="mailto:compliance@healthtrack.io" className="text-blue-600 dark:text-blue-400 hover:underline">compliance@healthtrack.io</a> to
                  execute a BAA with HealthTrack Pro.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-medium">2</span>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Configure Sensitive Page Patterns</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Review and customize the sensitive page patterns to match your website structure.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-medium">3</span>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Train Your Staff</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Ensure your marketing and IT teams understand HIPAA requirements and how
                  to use HealthTrack Pro appropriately.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-medium">4</span>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Regularly Review Audit Logs</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Monitor the audit log for any unexpected PHI detection or anomalies.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-medium">5</span>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Maintain Risk Assessments</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Conduct regular risk assessments including your use of tracking and analytics tools.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <svg className="w-8 h-8 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">Audit Log</h3>
              <p className="text-sm text-gray-500 mb-3">Review all tracked events</p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/audit-log">View Logs</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <svg className="w-8 h-8 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">Sensitive Pages</h3>
              <p className="text-sm text-gray-500 mb-3">Configure protected URLs</p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/settings/sensitive-pages">Configure</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <svg className="w-8 h-8 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">Request BAA</h3>
              <p className="text-sm text-gray-500 mb-3">Get a signed agreement</p>
              <Button variant="outline" size="sm" asChild>
                <a href="mailto:compliance@healthtrack.io">Contact Us</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
