/**
 * TikTok Events API Integration
 * Server-side forwarding to TikTok Events API
 */

import { createHash } from 'crypto';

/**
 * TikTok configuration
 */
export interface TikTokConfig {
  pixelCode: string;
  accessToken: string;
  testEventCode?: string;
}

/**
 * TikTok event data
 */
export interface TikTokEventData {
  event: string;
  event_id: string;
  timestamp: string;
  context: {
    page: {
      url: string;
      referrer?: string;
    };
    user_agent?: string;
    ip?: string;
  };
  properties?: Record<string, unknown>;
  user?: {
    external_id?: string; // Hashed session ID only - NO PII
  };
}

/**
 * TikTok API payload
 */
export interface TikTokPayload {
  pixel_code: string;
  event_source: 'web';
  event_source_id: string;
  data: TikTokEventData[];
  test_event_code?: string;
}

/**
 * TikTok API response
 */
export interface TikTokResponse {
  code: number;
  message: string;
  data?: {
    events_received?: number;
  };
}

/**
 * Result of sending events to TikTok
 */
export interface TikTokSendResult {
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
  referrer?: string;
  timestamp: string;
  user_agent?: string;
  ip_address?: string;
}

const TIKTOK_API_ENDPOINT = 'https://business-api.tiktok.com/open_api/v1.3/pixel/track/';

/**
 * TikTok Events API Integration class
 */
export class TikTokIntegration {
  private config: TikTokConfig | null = null;
  private maxRetries = 3;
  private retryDelayMs = 1000;

  /**
   * Configure the TikTok integration
   */
  configure(config: TikTokConfig): void {
    this.config = config;
  }

  /**
   * Check if integration is configured
   */
  isConfigured(): boolean {
    return !!(this.config?.pixelCode && this.config?.accessToken);
  }

  /**
   * Send events to TikTok Events API
   */
  async sendEvents(events: TrackingEvent[]): Promise<TikTokSendResult> {
    if (!this.config) {
      return { success: false, eventCount: 0, errors: ['TikTok Events API not configured'] };
    }

    const tiktokEvents = events.map((event) => this.mapEvent(event));

    const payload: TikTokPayload = {
      pixel_code: this.config.pixelCode,
      event_source: 'web',
      event_source_id: this.config.pixelCode,
      data: tiktokEvents,
    };

    // Add test event code if configured
    if (this.config.testEventCode) {
      payload.test_event_code = this.config.testEventCode;
    }

    return this.sendWithRetry(payload);
  }

  /**
   * Send a single event to TikTok
   */
  async sendEvent(event: TrackingEvent): Promise<TikTokSendResult> {
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
      return { valid: false, message: 'TikTok Events API not configured' };
    }

    const originalTestCode = this.config.testEventCode;
    this.config.testEventCode = 'TEST';

    const testEvent: TrackingEvent = {
      event_type: 'page_view',
      event_name: 'PageView',
      session_id: 'test_session_' + Date.now(),
      page_url: 'https://example.com/test',
      timestamp: new Date().toISOString(),
    };

    const result = await this.sendEvent(testEvent);

    this.config.testEventCode = originalTestCode;

    if (result.success) {
      return { valid: true, message: 'Credentials validated successfully' };
    }

    return { valid: false, message: result.errors?.[0] || 'Validation failed' };
  }

  /**
   * Map internal event to TikTok event format
   */
  private mapEvent(event: TrackingEvent): TikTokEventData {
    const eventId = this.generateEventId(event);
    const hashedSessionId = this.hashSessionId(event.session_id);

    // Map event types to TikTok event names
    const eventName = this.mapEventName(event);

    const tiktokEvent: TikTokEventData = {
      event: eventName,
      event_id: eventId,
      timestamp: event.timestamp,
      context: {
        page: {
          url: event.page_url,
          referrer: event.referrer,
        },
        user_agent: event.user_agent,
        ip: event.ip_address,
      },
      user: {
        external_id: hashedSessionId, // Only hashed session ID - NO PII
      },
    };

    // Add properties for conversions
    if (event.event_type === 'conversion' && event.properties) {
      tiktokEvent.properties = this.mapProperties(event.properties);
    }

    return tiktokEvent;
  }

  /**
   * Map event type to TikTok event name
   */
  private mapEventName(event: TrackingEvent): string {
    switch (event.event_type) {
      case 'page_view':
        return 'PageView';

      case 'conversion':
        const name = event.event_name.toLowerCase();
        if (name.includes('purchase') || name.includes('order') || name.includes('payment')) {
          return 'CompletePayment';
        }
        if (name.includes('lead') || name.includes('form') || name.includes('submit')) {
          return 'SubmitForm';
        }
        if (name.includes('signup') || name.includes('register')) {
          return 'CompleteRegistration';
        }
        if (name.includes('contact')) {
          return 'Contact';
        }
        if (name.includes('schedule') || name.includes('appointment')) {
          return 'SubmitForm';
        }
        return 'SubmitForm';

      case 'custom_event':
        return 'ViewContent';

      default:
        return 'PageView';
    }
  }

  /**
   * Map properties for TikTok
   */
  private mapProperties(properties: Record<string, unknown>): Record<string, unknown> {
    const mapped: Record<string, unknown> = {};

    if (typeof properties.conversion_value === 'number') {
      mapped.value = properties.conversion_value;
    }
    if (typeof properties.currency === 'string') {
      mapped.currency = properties.currency;
    }
    if (typeof properties.content_name === 'string') {
      mapped.content_name = properties.content_name;
    }
    if (typeof properties.content_category === 'string') {
      mapped.content_category = properties.content_category;
    }

    return mapped;
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
    payload: TikTokPayload,
    attempt: number = 1
  ): Promise<TikTokSendResult> {
    try {
      const response = await this.sendRequest(payload);
      const data: TikTokResponse = await response.json();

      if (data.code !== 0) {
        // Retry on certain error codes
        if (
          (data.code === 40100 || data.code === 50000) &&
          attempt < this.maxRetries
        ) {
          await this.delay(this.retryDelayMs * Math.pow(2, attempt - 1));
          return this.sendWithRetry(payload, attempt + 1);
        }

        return {
          success: false,
          eventCount: 0,
          errors: [`TikTok error ${data.code}: ${data.message}`],
        };
      }

      return {
        success: true,
        eventCount: data.data?.events_received || payload.data.length,
      };
    } catch (error) {
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
   * Send HTTP request to TikTok Events API
   */
  private async sendRequest(payload: TikTokPayload): Promise<Response> {
    if (!this.config) {
      throw new Error('TikTok Events API not configured');
    }

    return fetch(TIKTOK_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': this.config.accessToken,
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
export const tiktokIntegration = new TikTokIntegration();
