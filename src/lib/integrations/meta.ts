/**
 * Meta (Facebook) Conversions API Integration
 * Server-side forwarding to Meta CAPI WITHOUT Advanced Matching (HIPAA compliant)
 */

import { createHash } from 'crypto';

/**
 * Meta CAPI configuration
 */
export interface MetaConfig {
  pixelId: string;
  accessToken: string;
  testEventCode?: string; // For testing in Events Manager
}

/**
 * Meta CAPI event data
 */
export interface MetaEventData {
  event_name: string;
  event_time: number;
  event_id: string;
  event_source_url: string;
  action_source: 'website';
  user_data: {
    external_id: string; // Hashed session ID only - NO PII
  };
  custom_data?: Record<string, unknown>;
}

/**
 * Meta CAPI payload
 */
export interface MetaPayload {
  data: MetaEventData[];
  test_event_code?: string;
}

/**
 * Meta CAPI response
 */
export interface MetaResponse {
  events_received?: number;
  fbtrace_id?: string;
  error?: {
    message: string;
    type: string;
    code: number;
  };
}

/**
 * Result of sending events to Meta
 */
export interface MetaSendResult {
  success: boolean;
  eventCount: number;
  errors?: string[];
  fbtraceId?: string;
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

const META_API_VERSION = 'v18.0';

/**
 * Meta CAPI Integration class
 */
export class MetaIntegration {
  private config: MetaConfig | null = null;
  private maxRetries = 3;
  private retryDelayMs = 1000;

  /**
   * Configure the Meta integration
   */
  configure(config: MetaConfig): void {
    this.config = config;
  }

  /**
   * Check if integration is configured
   */
  isConfigured(): boolean {
    return !!(this.config?.pixelId && this.config?.accessToken);
  }

  /**
   * Send events to Meta CAPI
   */
  async sendEvents(events: TrackingEvent[]): Promise<MetaSendResult> {
    if (!this.config) {
      return { success: false, eventCount: 0, errors: ['Meta CAPI not configured'] };
    }

    const metaEvents = events.map((event) => this.mapEvent(event));

    const payload: MetaPayload = {
      data: metaEvents,
    };

    // Add test event code if configured
    if (this.config.testEventCode) {
      payload.test_event_code = this.config.testEventCode;
    }

    return this.sendWithRetry(payload);
  }

  /**
   * Send a single event to Meta CAPI
   */
  async sendEvent(event: TrackingEvent): Promise<MetaSendResult> {
    return this.sendEvents([event]);
  }

  /**
   * Validate credentials by sending a test event
   */
  async validateCredentials(): Promise<{
    valid: boolean;
    message: string;
  }> {
    if (!this.config) {
      return { valid: false, message: 'Meta CAPI not configured' };
    }

    // Set test event code temporarily if not set
    const originalTestCode = this.config.testEventCode;
    this.config.testEventCode = 'TEST_VALIDATION';

    const testEvent: TrackingEvent = {
      event_type: 'page_view',
      event_name: 'PageView',
      session_id: 'test_session_' + Date.now(),
      page_url: 'https://example.com/test',
      timestamp: new Date().toISOString(),
    };

    const result = await this.sendEvent(testEvent);

    // Restore original test code
    this.config.testEventCode = originalTestCode;

    if (result.success) {
      return { valid: true, message: 'Credentials validated successfully' };
    }

    return { valid: false, message: result.errors?.[0] || 'Validation failed' };
  }

  /**
   * Map internal event to Meta CAPI event format
   * IMPORTANT: NO Advanced Matching data is included for HIPAA compliance
   */
  private mapEvent(event: TrackingEvent): MetaEventData {
    const eventId = this.generateEventId(event);
    const eventTime = Math.floor(new Date(event.timestamp).getTime() / 1000);
    const hashedSessionId = this.hashSessionId(event.session_id);

    // Map event types to Meta event names
    const eventName = this.mapEventName(event);

    const metaEvent: MetaEventData = {
      event_name: eventName,
      event_time: eventTime,
      event_id: eventId,
      event_source_url: event.page_url,
      action_source: 'website',
      user_data: {
        external_id: hashedSessionId, // Only hashed session ID - NO PII
      },
    };

    // Add custom data for conversions
    if (event.event_type === 'conversion') {
      metaEvent.custom_data = this.mapCustomData(event.properties);
    }

    return metaEvent;
  }

  /**
   * Map event type to Meta event name
   */
  private mapEventName(event: TrackingEvent): string {
    switch (event.event_type) {
      case 'page_view':
        return 'PageView';

      case 'conversion':
        // Map specific conversion names
        const name = event.event_name.toLowerCase();
        if (name.includes('purchase') || name.includes('order')) {
          return 'Purchase';
        }
        if (name.includes('lead') || name.includes('form') || name.includes('submit')) {
          return 'Lead';
        }
        if (name.includes('signup') || name.includes('register')) {
          return 'CompleteRegistration';
        }
        if (name.includes('contact')) {
          return 'Contact';
        }
        if (name.includes('schedule') || name.includes('appointment')) {
          return 'Schedule';
        }
        // Default to Lead for healthcare conversions
        return 'Lead';

      case 'custom_event':
        // Map custom events to ViewContent
        return 'ViewContent';

      default:
        return 'PageView';
    }
  }

  /**
   * Map custom data for conversions
   */
  private mapCustomData(properties?: Record<string, unknown>): Record<string, unknown> {
    if (!properties) return {};

    const customData: Record<string, unknown> = {};

    // Map value and currency
    if (typeof properties.conversion_value === 'number') {
      customData.value = properties.conversion_value;
    }
    if (typeof properties.currency === 'string') {
      customData.currency = properties.currency;
    } else if (customData.value) {
      customData.currency = 'USD'; // Default currency
    }

    // Map content information (non-PII only)
    if (typeof properties.content_name === 'string') {
      customData.content_name = properties.content_name;
    }
    if (typeof properties.content_category === 'string') {
      customData.content_category = properties.content_category;
    }

    return customData;
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
   * Uses SHA-256 as required by Meta
   */
  private hashSessionId(sessionId: string): string {
    return createHash('sha256').update(sessionId.toLowerCase()).digest('hex');
  }

  /**
   * Send request to Meta CAPI with retry logic
   */
  private async sendWithRetry(
    payload: MetaPayload,
    attempt: number = 1
  ): Promise<MetaSendResult> {
    try {
      const response = await this.sendRequest(payload);
      const data: MetaResponse = await response.json();

      if (data.error) {
        // Rate limit - retry with backoff
        if (data.error.code === 17 && attempt < this.maxRetries) {
          await this.delay(this.retryDelayMs * Math.pow(2, attempt - 1));
          return this.sendWithRetry(payload, attempt + 1);
        }

        return {
          success: false,
          eventCount: 0,
          errors: [`${data.error.type}: ${data.error.message}`],
        };
      }

      return {
        success: true,
        eventCount: data.events_received || payload.data.length,
        fbtraceId: data.fbtrace_id,
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
   * Send HTTP request to Meta CAPI
   */
  private async sendRequest(payload: MetaPayload): Promise<Response> {
    if (!this.config) {
      throw new Error('Meta CAPI not configured');
    }

    const url = `https://graph.facebook.com/${META_API_VERSION}/${this.config.pixelId}/events?access_token=${this.config.accessToken}`;

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
export const metaIntegration = new MetaIntegration();
