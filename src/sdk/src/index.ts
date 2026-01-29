/**
 * HealthTrack Pro SDK
 * HIPAA-compliant tracking SDK for healthcare websites
 */

import { phiDetector, SensitivePagePattern } from './phi-detector';
import { consentManager, CMPAdapter } from './consent';


/**
 * Tracking event payload sent to server
 */
export interface TrackingEvent {
  event_type: 'page_view' | 'custom_event' | 'conversion';
  event_name: string;
  properties?: Record<string, unknown>;
  timestamp: string;
  anonymized_session_id: string;
  page_url: string;
  referrer: string;
  sdk_version: string;
  phi_scrubbed?: string[];
}

/**
 * Custom event properties
 */
export type EventProperties = Record<string, unknown>;

/**
 * Consent state for analytics and marketing tracking
 */
export interface ConsentState {
  analytics: boolean;
  marketing: boolean;
}

/**
 * SDK configuration options
 */
export interface HealthTrackConfig {
  /** Your organization's API key */
  apiKey: string;
  /** Custom server URL (defaults to /api/v1/events) */
  serverUrl?: string;
  /** Enable debug logging */
  debug?: boolean;
  /** Number of events to batch before sending (default: 10) */
  batchSize?: number;
  /** Interval in ms between batch sends (default: 5000) */
  batchInterval?: number;
}

class HealthTrackSDK {
  private config: HealthTrackConfig | null = null;
  private eventQueue: TrackingEvent[] = [];
  private pendingQueue: TrackingEvent[] = []; // Events waiting for consent
  private sessionId: string = '';
  private initialized = false;
  private batchTimer: ReturnType<typeof setInterval> | null = null;
  private readonly SDK_VERSION = '1.0.0';
  private readonly DEFAULT_SERVER_URL = '/api/v1/events';
  private readonly DEFAULT_BATCH_SIZE = 10;
  private readonly DEFAULT_BATCH_INTERVAL = 5000; // 5 seconds

  /**
   * Initialize the SDK with configuration
   */
  init(config: HealthTrackConfig): void {
    if (this.initialized) {
      this.log('warn', 'HealthTrack already initialized');
      return;
    }

    if (!config.apiKey) {
      this.log('error', 'API key is required');
      return;
    }

    this.config = {
      ...config,
      serverUrl: config.serverUrl || this.DEFAULT_SERVER_URL,
      batchSize: config.batchSize || this.DEFAULT_BATCH_SIZE,
      batchInterval: config.batchInterval || this.DEFAULT_BATCH_INTERVAL,
    };

    // Configure PHI detector debug mode
    phiDetector.setDebugMode(config.debug || false);

    // Initialize consent manager
    consentManager.setDebugMode(config.debug || false);
    consentManager.init();

    // Subscribe to consent changes
    consentManager.onConsentChange((consent) => {
      this.log('info', 'Consent changed', consent);

      // If consent granted, flush pending events
      if (consent.analytics || consent.marketing) {
        this.flushPendingEvents();
      }
    });

    this.sessionId = this.getOrCreateSessionId();
    this.initialized = true;

    // Start batch timer
    this.startBatchTimer();

    // Set up page unload handler
    this.setupUnloadHandler();

    // Auto-track initial page view
    this.trackPageView();

    this.log('info', 'HealthTrack initialized', { sessionId: this.sessionId });
  }

  /**
   * Configure sensitive URL patterns
   */
  configureSensitivePages(patterns: SensitivePagePattern[]): void {
    phiDetector.configureSensitivePages(patterns);
    this.log('info', 'Sensitive page patterns configured', { count: patterns.length });
  }

  /**
   * Add a sensitive page pattern
   */
  addSensitivePagePattern(pattern: string | RegExp, action: 'block' | 'strip' = 'strip'): void {
    phiDetector.addSensitivePagePattern(pattern, action);
    this.log('info', 'Sensitive page pattern added', { pattern: pattern.toString(), action });
  }

  /**
   * Load default healthcare sensitive page patterns
   */
  loadDefaultHealthcarePatterns(): void {
    const defaults = phiDetector.getDefaultHealthcarePatterns();
    phiDetector.configureSensitivePages(defaults);
    this.log('info', 'Default healthcare patterns loaded', { count: defaults.length });
  }

  /**
   * Track a page view
   */
  trackPageView(properties?: Record<string, unknown>): void {
    if (!this.checkInitialized()) return;

    // Check if current page is sensitive
    const { isSensitive, action } = phiDetector.isSensitivePage(window.location.href);
    if (isSensitive && action === 'block') {
      this.log('info', 'Page view blocked - sensitive page');
      return;
    }

    const event = this.createEvent('page_view', 'page_view', properties);
    this.queueEvent(event);
  }

  /**
   * Track a custom event
   */
  trackEvent(eventName: string, properties?: Record<string, unknown>): void {
    if (!this.checkInitialized()) return;

    const event = this.createEvent('custom_event', eventName, properties);
    this.queueEvent(event);
  }

  /**
   * Track a conversion event
   */
  trackConversion(
    conversionName: string,
    value?: number,
    properties?: Record<string, unknown>
  ): void {
    if (!this.checkInitialized()) return;

    const event = this.createEvent('conversion', conversionName, {
      ...properties,
      conversion_value: value,
    });
    this.queueEvent(event);
  }

  /**
   * Set an anonymous user identifier (will be hashed)
   */
  identify(userId: string): void {
    if (!this.checkInitialized()) return;

    // Hash the user ID client-side for privacy
    const hashedId = this.hashString(userId);
    this.sessionId = hashedId;

    // Store in session
    try {
      sessionStorage.setItem('ht_user_id', hashedId);
    } catch {
      // Ignore storage errors
    }

    this.log('info', 'User identified', { hashedId: hashedId.substring(0, 8) + '...' });
  }

  /**
   * Set consent state for tracking (manual override)
   */
  setConsent(consent: Partial<ConsentState>): void {
    consentManager.setConsent(consent);
    this.log('info', 'Consent updated', consent);

    // If consent granted, flush any queued events
    if (consent.analytics || consent.marketing) {
      this.flushPendingEvents();
      this.flushEvents();
    }
  }

  /**
   * Get current consent state
   */
  getConsent(): ConsentState {
    return consentManager.getConsent();
  }

  /**
   * Register a custom CMP adapter
   */
  registerCMPAdapter(adapter: CMPAdapter): void {
    consentManager.registerAdapter(adapter);
    this.log('info', 'Custom CMP adapter registered', { name: adapter.name });
  }

  /**
   * Manually flush queued events
   */
  flush(): Promise<void> {
    return this.flushEvents();
  }

  // Private methods

  private checkInitialized(): boolean {
    if (!this.initialized) {
      this.log('warn', 'HealthTrack not initialized. Call HealthTrack.init() first.');
      return false;
    }
    return true;
  }

  private createEvent(
    eventType: TrackingEvent['event_type'],
    eventName: string,
    properties?: Record<string, unknown>
  ): TrackingEvent {
    // Scrub PHI from properties
    let scrubbedProperties = properties || {};
    let phiScrubbed: string[] = [];

    if (properties && Object.keys(properties).length > 0) {
      const result = phiDetector.scrubObject(properties);
      scrubbedProperties = result.scrubbedData;
      phiScrubbed = result.detectedFields;
    }

    // Check if on sensitive page
    const { isSensitive } = phiDetector.isSensitivePage(window.location.href);

    // Scrub URLs more aggressively on sensitive pages
    let pageUrl = phiDetector.scrubUrl(window.location.href);
    let referrer = phiDetector.scrubUrl(document.referrer);

    if (isSensitive) {
      pageUrl = phiDetector.stripClickIds(pageUrl);
      referrer = phiDetector.stripClickIds(referrer);
    }

    const event: TrackingEvent = {
      event_type: eventType,
      event_name: eventName,
      properties: scrubbedProperties,
      timestamp: new Date().toISOString(),
      anonymized_session_id: this.sessionId,
      page_url: pageUrl,
      referrer: referrer,
      sdk_version: this.SDK_VERSION,
    };

    // Only include phi_scrubbed if there were scrubbed fields
    if (phiScrubbed.length > 0) {
      event.phi_scrubbed = phiScrubbed;
    }

    return event;
  }

  private queueEvent(event: TrackingEvent): void {
    const consent = consentManager.getConsent();

    // If consent denied, queue for later
    if (!consent.analytics && !consent.marketing) {
      this.pendingQueue.push(event);
      this.log('info', 'Event queued pending consent', {
        type: event.event_type,
        name: event.event_name,
      });
      return;
    }

    this.eventQueue.push(event);
    this.log('info', 'Event queued', { type: event.event_type, name: event.event_name });

    // Flush if batch size reached
    if (this.eventQueue.length >= (this.config?.batchSize || this.DEFAULT_BATCH_SIZE)) {
      this.flushEvents();
    }
  }

  private flushPendingEvents(): void {
    if (this.pendingQueue.length === 0) return;

    this.log('info', 'Flushing pending events', { count: this.pendingQueue.length });

    // Move pending events to main queue
    this.eventQueue.push(...this.pendingQueue);
    this.pendingQueue = [];

    // Flush if batch size reached
    if (this.eventQueue.length >= (this.config?.batchSize || this.DEFAULT_BATCH_SIZE)) {
      this.flushEvents();
    }
  }

  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0 || !this.config) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const response = await fetch(this.config.serverUrl!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: this.config.apiKey,
          events,
          consent: consentManager.getConsent(),
        }),
      });

      if (!response.ok) {
        // Re-queue events on failure
        this.eventQueue = [...events, ...this.eventQueue];
        this.log('error', 'Failed to send events', { status: response.status });
      } else {
        this.log('info', 'Events sent successfully', { count: events.length });
      }
    } catch (error) {
      // Re-queue events on error
      this.eventQueue = [...events, ...this.eventQueue];
      this.log('error', 'Error sending events', { error });
    }
  }

  private startBatchTimer(): void {
    if (this.batchTimer) return;

    this.batchTimer = setInterval(() => {
      this.flushEvents();
    }, this.config?.batchInterval || this.DEFAULT_BATCH_INTERVAL);
  }

  private setupUnloadHandler(): void {
    const handleUnload = () => {
      if (this.eventQueue.length === 0 || !this.config) return;

      // Use sendBeacon for reliable delivery on page unload
      const data = JSON.stringify({
        apiKey: this.config.apiKey,
        events: this.eventQueue,
        consent: consentManager.getConsent(),
      });

      try {
        navigator.sendBeacon(this.config.serverUrl!, data);
        this.log('info', 'Events sent via beacon', { count: this.eventQueue.length });
      } catch {
        // Fallback: try sync XHR (not recommended but better than nothing)
        this.log('warn', 'Beacon failed, events may be lost');
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
  }

  private getOrCreateSessionId(): string {
    try {
      // Check for existing user ID first
      const storedUserId = sessionStorage.getItem('ht_user_id');
      if (storedUserId) return storedUserId;

      // Check for existing session ID
      const storedSessionId = sessionStorage.getItem('ht_session_id');
      if (storedSessionId) return storedSessionId;

      // Generate new session ID
      const newSessionId = this.generateSessionId();
      sessionStorage.setItem('ht_session_id', newSessionId);
      return newSessionId;
    } catch {
      // If sessionStorage not available, generate ephemeral ID
      return this.generateSessionId();
    }
  }

  private generateSessionId(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  private hashString(str: string): string {
    // Simple hash for client-side use (not cryptographic)
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return 'user_' + Math.abs(hash).toString(16);
  }

  private log(level: 'info' | 'warn' | 'error', message: string, data?: unknown): void {
    if (!this.config?.debug) return;

    const prefix = '[HealthTrack]';
    switch (level) {
      case 'info':
        console.log(prefix, message, data || '');
        break;
      case 'warn':
        console.warn(prefix, message, data || '');
        break;
      case 'error':
        console.error(prefix, message, data || '');
        break;
    }
  }
}

// Create global instance
const HealthTrack = new HealthTrackSDK();

// Export for module systems
export { HealthTrack, HealthTrackSDK };
export { phiDetector } from './phi-detector';
export type { PHIDetectionResult, SensitivePagePattern } from './phi-detector';
export { consentManager } from './consent';
export type { CMPAdapter } from './consent';

// Attach to window for script tag usage
if (typeof window !== 'undefined') {
  (window as unknown as { HealthTrack: HealthTrackSDK }).HealthTrack = HealthTrack;
}
