/**
 * Google Analytics 4 Measurement Protocol Integration
 * Server-side forwarding to GA4 using the Measurement Protocol
 */

/**
 * GA4 configuration
 */
export interface GA4Config {
  measurementId: string; // G-XXXXXXX format
  apiSecret: string;
  debug?: boolean;
}

/**
 * GA4 event payload
 */
export interface GA4Event {
  name: string;
  params?: Record<string, string | number | boolean>;
}

/**
 * GA4 Measurement Protocol payload
 */
export interface GA4Payload {
  client_id: string;
  user_id?: string;
  events: GA4Event[];
  user_properties?: Record<string, { value: string | number }>;
  timestamp_micros?: number;
  non_personalized_ads?: boolean;
}

/**
 * Result of sending events to GA4
 */
export interface GA4SendResult {
  success: boolean;
  eventCount: number;
  errors?: string[];
  validationMessages?: string[];
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
  referrer: string;
  sdk_version: string;
}

const GA4_COLLECT_ENDPOINT = 'https://www.google-analytics.com/mp/collect';
const GA4_DEBUG_ENDPOINT = 'https://www.google-analytics.com/debug/mp/collect';

/**
 * GA4 Integration class
 */
export class GA4Integration {
  private config: GA4Config | null = null;
  private maxRetries = 3;
  private retryDelayMs = 1000;

  /**
   * Configure the GA4 integration
   */
  configure(config: GA4Config): void {
    this.config = config;
  }

  /**
   * Check if integration is configured
   */
  isConfigured(): boolean {
    return !!(this.config?.measurementId && this.config?.apiSecret);
  }

  /**
   * Send events to GA4
   */
  async sendEvents(events: TrackingEvent[], clientId: string): Promise<GA4SendResult> {
    if (!this.config) {
      return { success: false, eventCount: 0, errors: ['GA4 not configured'] };
    }

    const ga4Events = events.map((event) => this.mapEvent(event));

    const payload: GA4Payload = {
      client_id: clientId,
      events: ga4Events,
      non_personalized_ads: true, // HIPAA compliance - no personalized ads
    };

    return this.sendWithRetry(payload);
  }

  /**
   * Send a single event to GA4
   */
  async sendEvent(event: TrackingEvent, clientId: string): Promise<GA4SendResult> {
    return this.sendEvents([event], clientId);
  }

  /**
   * Validate credentials by sending to debug endpoint
   */
  async validateCredentials(): Promise<{
    valid: boolean;
    messages: string[];
  }> {
    if (!this.config) {
      return { valid: false, messages: ['GA4 not configured'] };
    }

    const testPayload: GA4Payload = {
      client_id: 'test_client_id',
      events: [
        {
          name: 'test_event',
          params: {
            test_param: 'validation',
          },
        },
      ],
    };

    try {
      const response = await this.sendRequest(testPayload, true);
      const data = await response.json();

      if (data.validationMessages && data.validationMessages.length > 0) {
        return {
          valid: false,
          messages: data.validationMessages.map(
            (m: { description: string }) => m.description
          ),
        };
      }

      return { valid: true, messages: ['Credentials validated successfully'] };
    } catch (error) {
      return {
        valid: false,
        messages: [error instanceof Error ? error.message : 'Validation failed'],
      };
    }
  }

  /**
   * Map internal event to GA4 event format
   */
  private mapEvent(event: TrackingEvent): GA4Event {
    switch (event.event_type) {
      case 'page_view':
        return {
          name: 'page_view',
          params: {
            page_location: event.page_url,
            page_referrer: event.referrer,
            page_title: (event.properties?.page_title as string) || '',
            ...this.filterParams(event.properties),
          },
        };

      case 'conversion':
        return {
          name: event.event_name || 'conversion',
          params: {
            value: (event.properties?.conversion_value as number) || 0,
            currency: (event.properties?.currency as string) || 'USD',
            ...this.filterParams(event.properties),
          },
        };

      case 'custom_event':
      default:
        return {
          name: this.sanitizeEventName(event.event_name),
          params: this.filterParams(event.properties),
        };
    }
  }

  /**
   * Filter and convert properties to GA4 compatible params
   * GA4 params must be string, number, or boolean
   */
  private filterParams(
    properties?: Record<string, unknown>
  ): Record<string, string | number | boolean> {
    if (!properties) return {};

    const filtered: Record<string, string | number | boolean> = {};

    for (const [key, value] of Object.entries(properties)) {
      // Skip internal properties
      if (key === 'conversion_value' || key === 'currency') continue;

      // Skip non-primitive values
      if (value === null || value === undefined) continue;
      if (typeof value === 'object') continue;

      // Convert to valid GA4 param types
      const sanitizedKey = this.sanitizeParamName(key);
      if (typeof value === 'string') {
        // GA4 string params max 100 chars
        filtered[sanitizedKey] = value.substring(0, 100);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        filtered[sanitizedKey] = value;
      }
    }

    return filtered;
  }

  /**
   * Sanitize event name for GA4
   * GA4 event names: alphanumeric + underscore, max 40 chars, can't start with number
   */
  private sanitizeEventName(name: string): string {
    let sanitized = name
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/^[0-9]+/, '')
      .substring(0, 40);

    // Ensure not empty after sanitization
    if (!sanitized) {
      sanitized = 'custom_event';
    }

    return sanitized;
  }

  /**
   * Sanitize parameter name for GA4
   * GA4 param names: alphanumeric + underscore, max 40 chars
   */
  private sanitizeParamName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .substring(0, 40);
  }

  /**
   * Send request to GA4 with retry logic
   */
  private async sendWithRetry(
    payload: GA4Payload,
    attempt: number = 1
  ): Promise<GA4SendResult> {
    try {
      const response = await this.sendRequest(payload, false);

      if (response.ok) {
        return {
          success: true,
          eventCount: payload.events.length,
        };
      }

      // If server error and retries remaining, retry
      if (response.status >= 500 && attempt < this.maxRetries) {
        await this.delay(this.retryDelayMs * Math.pow(2, attempt - 1));
        return this.sendWithRetry(payload, attempt + 1);
      }

      return {
        success: false,
        eventCount: 0,
        errors: [`GA4 returned status ${response.status}`],
      };
    } catch (error) {
      // Network error - retry if attempts remaining
      if (attempt < this.maxRetries) {
        await this.delay(this.retryDelayMs * Math.pow(2, attempt - 1));
        return this.sendWithRetry(payload, attempt + 1);
      }

      return {
        success: false,
        eventCount: 0,
        errors: [error instanceof Error ? error.message : 'Network error'],
      };
    }
  }

  /**
   * Send HTTP request to GA4
   */
  private async sendRequest(payload: GA4Payload, debug: boolean): Promise<Response> {
    if (!this.config) {
      throw new Error('GA4 not configured');
    }

    const endpoint = debug ? GA4_DEBUG_ENDPOINT : GA4_COLLECT_ENDPOINT;
    const url = `${endpoint}?measurement_id=${this.config.measurementId}&api_secret=${this.config.apiSecret}`;

    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
export const ga4Integration = new GA4Integration();
