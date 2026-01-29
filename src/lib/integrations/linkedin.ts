/**
 * LinkedIn Conversions API Integration
 * Server-side forwarding to LinkedIn Conversions API
 */

import { createHash } from 'crypto';

/**
 * LinkedIn configuration
 */
export interface LinkedInConfig {
  conversionId: string;
  accessToken: string;
}

/**
 * LinkedIn conversion event
 */
export interface LinkedInConversionEvent {
  conversion: string; // urn:li:lyndaConversion:XXXXX format
  conversionHappenedAt: number; // Unix timestamp in ms
  eventId: string;
  user: {
    userIds: Array<{
      idType: 'SHA256_EMAIL' | 'LINKEDIN_FIRST_PARTY_ADS_TRACKING_UUID' | 'ACXIOM_ID' | 'ORACLE_MOAT_ID';
      idValue: string;
    }>;
  };
  conversionValue?: {
    currencyCode: string;
    amount: string;
  };
}

/**
 * LinkedIn API response
 */
export interface LinkedInResponse {
  elements?: unknown[];
  errors?: Array<{
    message: string;
    status: number;
  }>;
}

/**
 * Result of sending conversions to LinkedIn
 */
export interface LinkedInSendResult {
  success: boolean;
  eventCount: number;
  errors?: string[];
}

/**
 * Internal tracking event (from our SDK)
 */
export interface TrackingEvent {
  event_type: 'page_view' | 'custom_event' | 'conversion';
  event_name: string;
  properties?: Record<string, unknown>;
  session_id: string;
  page_url: string;
  timestamp: string;
}

const LINKEDIN_API_ENDPOINT = 'https://api.linkedin.com/rest/conversionEvents';

/**
 * LinkedIn Conversions API Integration class
 */
export class LinkedInIntegration {
  private config: LinkedInConfig | null = null;
  private maxRetries = 3;
  private retryDelayMs = 1000;

  /**
   * Configure the LinkedIn integration
   */
  configure(config: LinkedInConfig): void {
    this.config = config;
  }

  /**
   * Check if integration is configured
   */
  isConfigured(): boolean {
    return !!(this.config?.conversionId && this.config?.accessToken);
  }

  /**
   * Send conversion events to LinkedIn
   * Note: LinkedIn CAPI only supports conversion events, not page views
   */
  async sendEvents(events: TrackingEvent[]): Promise<LinkedInSendResult> {
    if (!this.config) {
      return { success: false, eventCount: 0, errors: ['LinkedIn not configured'] };
    }

    // Filter to only conversion events - LinkedIn only tracks conversions
    const conversionEvents = events.filter((e) => e.event_type === 'conversion');

    if (conversionEvents.length === 0) {
      return { success: true, eventCount: 0 }; // No conversions to send
    }

    const linkedInEvents = conversionEvents.map((event) => this.mapEvent(event));

    return this.sendWithRetry(linkedInEvents);
  }

  /**
   * Send a single event to LinkedIn
   */
  async sendEvent(event: TrackingEvent): Promise<LinkedInSendResult> {
    return this.sendEvents([event]);
  }

  /**
   * Validate credentials
   */
  async validateCredentials(): Promise<{
    valid: boolean;
    message: string;
  }> {
    if (!this.config) {
      return { valid: false, message: 'LinkedIn not configured' };
    }

    // LinkedIn doesn't have a debug endpoint, so we validate by checking the token
    try {
      const response = await fetch('https://api.linkedin.com/v2/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
        },
      });

      if (response.ok) {
        return { valid: true, message: 'Credentials validated successfully' };
      }

      if (response.status === 401) {
        return { valid: false, message: 'Invalid or expired access token' };
      }

      return { valid: false, message: `LinkedIn returned status ${response.status}` };
    } catch (error) {
      return {
        valid: false,
        message: error instanceof Error ? error.message : 'Validation failed',
      };
    }
  }

  /**
   * Map internal event to LinkedIn conversion format
   * IMPORTANT: Only using hashed session ID as external_id - NO PII
   */
  private mapEvent(event: TrackingEvent): LinkedInConversionEvent {
    const eventId = this.generateEventId(event);
    const hashedSessionId = this.hashSessionId(event.session_id);
    const timestamp = new Date(event.timestamp).getTime();

    const linkedInEvent: LinkedInConversionEvent = {
      conversion: `urn:li:lyndaConversion:${this.config!.conversionId}`,
      conversionHappenedAt: timestamp,
      eventId: eventId,
      user: {
        userIds: [
          {
            // Use ACXIOM_ID type for partner-provided hashed IDs
            // This doesn't require email/phone - just an anonymous ID
            idType: 'ACXIOM_ID',
            idValue: hashedSessionId,
          },
        ],
      },
    };

    // Add conversion value if provided
    if (event.properties?.conversion_value !== undefined) {
      const value = Number(event.properties.conversion_value);
      if (!isNaN(value)) {
        linkedInEvent.conversionValue = {
          currencyCode: (event.properties.currency as string) || 'USD',
          amount: value.toFixed(2),
        };
      }
    }

    return linkedInEvent;
  }

  /**
   * Generate unique event ID for deduplication
   */
  private generateEventId(event: TrackingEvent): string {
    const data = `${event.session_id}_${event.event_type}_${event.event_name}_${event.timestamp}`;
    return createHash('sha256').update(data).digest('hex').substring(0, 32);
  }

  /**
   * Hash session ID for external_id
   */
  private hashSessionId(sessionId: string): string {
    return createHash('sha256').update(sessionId.toLowerCase()).digest('hex');
  }

  /**
   * Send request with retry logic
   */
  private async sendWithRetry(
    events: LinkedInConversionEvent[],
    attempt: number = 1
  ): Promise<LinkedInSendResult> {
    try {
      const response = await this.sendRequest(events);
      const data: LinkedInResponse = await response.json();

      if (!response.ok) {
        if (response.status >= 500 && attempt < this.maxRetries) {
          await this.delay(this.retryDelayMs * Math.pow(2, attempt - 1));
          return this.sendWithRetry(events, attempt + 1);
        }

        const errorMsg =
          data.errors?.[0]?.message || `LinkedIn returned status ${response.status}`;
        return {
          success: false,
          eventCount: 0,
          errors: [errorMsg],
        };
      }

      return {
        success: true,
        eventCount: events.length,
      };
    } catch (error) {
      if (attempt < this.maxRetries) {
        await this.delay(this.retryDelayMs * Math.pow(2, attempt - 1));
        return this.sendWithRetry(events, attempt + 1);
      }

      return {
        success: false,
        eventCount: 0,
        errors: [error instanceof Error ? error.message : 'Network error'],
      };
    }
  }

  /**
   * Send HTTP request to LinkedIn Conversions API
   */
  private async sendRequest(events: LinkedInConversionEvent[]): Promise<Response> {
    if (!this.config) {
      throw new Error('LinkedIn not configured');
    }

    const payload = {
      elements: events,
    };

    return fetch(LINKEDIN_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.accessToken}`,
        'LinkedIn-Version': '202401',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(payload),
    });
  }

  /**
   * Delay helper for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const linkedinIntegration = new LinkedInIntegration();
