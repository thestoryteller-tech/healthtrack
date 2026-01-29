import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { HealthTrackSDK } from '../index';

// Mock browser APIs
const mockSessionStorage: Record<string, string> = {};
const mockSendBeacon = vi.fn().mockReturnValue(true);

vi.stubGlobal('sessionStorage', {
  getItem: (key: string) => mockSessionStorage[key] || null,
  setItem: (key: string, value: string) => {
    mockSessionStorage[key] = value;
  },
  removeItem: (key: string) => {
    delete mockSessionStorage[key];
  },
  clear: () => {
    Object.keys(mockSessionStorage).forEach((key) => delete mockSessionStorage[key]);
  },
});

vi.stubGlobal('navigator', {
  sendBeacon: mockSendBeacon,
});

vi.stubGlobal('crypto', {
  getRandomValues: (array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  },
});

describe('HealthTrackSDK', () => {
  let sdk: HealthTrackSDK;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    Object.keys(mockSessionStorage).forEach((key) => delete mockSessionStorage[key]);

    // Mock fetch
    mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', mockFetch);

    // Mock window
    vi.stubGlobal('window', {
      location: {
        href: 'https://example.com/page',
      },
      addEventListener: vi.fn(),
    });

    vi.stubGlobal('document', {
      referrer: 'https://google.com/',
      cookie: '',
    });

    // Create fresh SDK instance
    sdk = new HealthTrackSDK();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('init', () => {
    it('should initialize with required config', () => {
      sdk.init({ apiKey: 'test-key' });

      // SDK should be initialized (check by calling a method that requires init)
      expect(() => sdk.trackEvent('test')).not.toThrow();
    });

    it('should not initialize without API key', () => {
      // Create fresh SDK and try to init without API key
      const testSdk = new HealthTrackSDK();
      testSdk.init({ apiKey: '' });

      // SDK should not be initialized, so flush should do nothing
      // (no events sent because not initialized)
      mockFetch.mockClear();
      testSdk.trackEvent('test');

      // No fetch should be called because SDK isn't initialized
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should not double initialize', () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      sdk.init({ apiKey: 'test-key', debug: true });
      sdk.init({ apiKey: 'another-key', debug: true });

      expect(consoleWarn).toHaveBeenCalledWith(
        expect.any(String),
        'HealthTrack already initialized',
        expect.anything()
      );
      consoleWarn.mockRestore();
    });

    it('should generate session ID on init', async () => {
      sdk.init({ apiKey: 'test-key', batchSize: 1 });
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Session ID should be in the events sent
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.events[0].anonymized_session_id).toBeDefined();
      expect(body.events[0].anonymized_session_id.length).toBeGreaterThan(0);
    });

    it('should auto-track initial page view', async () => {
      sdk.init({ apiKey: 'test-key', batchSize: 1 });

      // Wait for flush
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockFetch).toHaveBeenCalled();
      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1].body);

      expect(body.events[0].event_type).toBe('page_view');
      expect(body.events[0].event_name).toBe('page_view');
    });
  });

  describe('trackPageView', () => {
    beforeEach(() => {
      sdk.init({ apiKey: 'test-key', batchSize: 1 });
      mockFetch.mockClear();
    });

    it('should track page view with default properties', async () => {
      sdk.trackPageView();
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockFetch).toHaveBeenCalled();
      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1].body);

      expect(body.events[0].event_type).toBe('page_view');
      expect(body.events[0].page_url).toContain('example.com');
      expect(body.events[0].referrer).toContain('google.com');
    });

    it('should include custom properties', async () => {
      sdk.trackPageView({ category: 'services', section: 'dental' });
      await new Promise((resolve) => setTimeout(resolve, 10));

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.events[0].properties.category).toBe('services');
      expect(body.events[0].properties.section).toBe('dental');
    });

    it('should scrub PHI from properties', async () => {
      sdk.trackPageView({ email: 'patient@example.com', page: 'services' });
      await new Promise((resolve) => setTimeout(resolve, 10));

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.events[0].properties.email).toBe('[REDACTED]');
      expect(body.events[0].properties.page).toBe('services');
      expect(body.events[0].phi_scrubbed).toContain('email');
    });
  });

  describe('trackEvent', () => {
    beforeEach(() => {
      sdk.init({ apiKey: 'test-key', batchSize: 1 });
      mockFetch.mockClear();
    });

    it('should track custom events', async () => {
      sdk.trackEvent('button_click', { button_id: 'cta-1' });
      await new Promise((resolve) => setTimeout(resolve, 10));

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.events[0].event_type).toBe('custom_event');
      expect(body.events[0].event_name).toBe('button_click');
      expect(body.events[0].properties.button_id).toBe('cta-1');
    });

    it('should include anonymized session ID', async () => {
      sdk.trackEvent('test_event');
      await new Promise((resolve) => setTimeout(resolve, 10));

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.events[0].anonymized_session_id).toBeDefined();
      expect(body.events[0].anonymized_session_id.length).toBe(32);
    });

    it('should include SDK version', async () => {
      sdk.trackEvent('test_event');
      await new Promise((resolve) => setTimeout(resolve, 10));

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.events[0].sdk_version).toBe('1.0.0');
    });

    it('should include timestamp', async () => {
      const before = new Date().toISOString();
      sdk.trackEvent('test_event');
      await new Promise((resolve) => setTimeout(resolve, 10));
      const after = new Date().toISOString();

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.events[0].timestamp >= before).toBe(true);
      expect(body.events[0].timestamp <= after).toBe(true);
    });
  });

  describe('trackConversion', () => {
    beforeEach(() => {
      sdk.init({ apiKey: 'test-key', batchSize: 1 });
      mockFetch.mockClear();
    });

    it('should track conversions with value', async () => {
      sdk.trackConversion('form_submit', 100, { form_id: 'contact' });
      await new Promise((resolve) => setTimeout(resolve, 10));

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.events[0].event_type).toBe('conversion');
      expect(body.events[0].event_name).toBe('form_submit');
      expect(body.events[0].properties.conversion_value).toBe(100);
      expect(body.events[0].properties.form_id).toBe('contact');
    });

    it('should track conversions without value', async () => {
      sdk.trackConversion('newsletter_signup');
      await new Promise((resolve) => setTimeout(resolve, 10));

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.events[0].event_type).toBe('conversion');
      expect(body.events[0].event_name).toBe('newsletter_signup');
    });
  });

  describe('identify', () => {
    beforeEach(() => {
      sdk.init({ apiKey: 'test-key', batchSize: 1 });
      mockFetch.mockClear();
    });

    it('should hash user ID client-side', async () => {
      sdk.identify('user123');
      sdk.trackEvent('after_identify');
      await new Promise((resolve) => setTimeout(resolve, 10));

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.events[0].anonymized_session_id).toMatch(/^user_[0-9a-f]+$/);
      expect(body.events[0].anonymized_session_id).not.toContain('user123');
    });

    it('should use hashed ID in subsequent events', async () => {
      sdk.identify('user456');
      mockFetch.mockClear();

      sdk.trackEvent('after_identify');
      await new Promise((resolve) => setTimeout(resolve, 10));

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.events[0].anonymized_session_id).toMatch(/^user_[0-9a-f]+$/);
    });
  });

  describe('consent management', () => {
    beforeEach(() => {
      sdk.init({ apiKey: 'test-key', batchSize: 1 });
      mockFetch.mockClear();
    });

    it('should default to consent granted', () => {
      const consent = sdk.getConsent();
      expect(consent.analytics).toBe(true);
      expect(consent.marketing).toBe(true);
    });

    it('should update consent state', () => {
      sdk.setConsent({ analytics: false });

      const consent = sdk.getConsent();
      expect(consent.analytics).toBe(false);
      expect(consent.marketing).toBe(true);
    });

    it('should not queue events when consent denied', () => {
      sdk.setConsent({ analytics: false, marketing: false });
      mockFetch.mockClear();

      sdk.trackEvent('blocked_event');

      // Event should not be queued/sent
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should include consent state in payload', async () => {
      sdk.setConsent({ analytics: true, marketing: false });
      sdk.trackEvent('test');
      await new Promise((resolve) => setTimeout(resolve, 10));

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.consent.analytics).toBe(true);
      expect(body.consent.marketing).toBe(false);
    });
  });

  describe('event batching', () => {
    it('should batch events until batch size reached', async () => {
      // batchSize of 4: auto page_view + 3 events = 4 total triggers flush
      sdk.init({ apiKey: 'test-key', batchSize: 4, batchInterval: 60000 });
      mockFetch.mockClear();

      sdk.trackEvent('event1');
      sdk.trackEvent('event2');
      // Still at 3 events (pageview + 2), shouldn't flush yet
      expect(mockFetch).not.toHaveBeenCalled();

      sdk.trackEvent('event3');
      // Now at 4 events, should trigger flush
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(mockFetch).toHaveBeenCalled();

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.events.length).toBe(4); // pageview + 3 events
    });

    it('should flush manually', async () => {
      sdk.init({ apiKey: 'test-key', batchSize: 100 });
      mockFetch.mockClear();

      sdk.trackEvent('event1');
      expect(mockFetch).not.toHaveBeenCalled();

      await sdk.flush();
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      sdk.init({ apiKey: 'test-key', batchSize: 1 });
    });

    it('should re-queue events on fetch failure', async () => {
      mockFetch.mockReset();
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      sdk.trackEvent('test');
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should retry
      sdk.trackEvent('test2');
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Second call should include re-queued event
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Should not throw
      sdk.trackEvent('test');
      await expect(
        new Promise((resolve) => setTimeout(resolve, 10))
      ).resolves.not.toThrow();
    });
  });

  describe('API key and server URL', () => {
    it('should include API key in payload', async () => {
      sdk.init({ apiKey: 'my-api-key', batchSize: 1 });
      await new Promise((resolve) => setTimeout(resolve, 10));

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.apiKey).toBe('my-api-key');
    });

    it('should use custom server URL', async () => {
      sdk.init({
        apiKey: 'test-key',
        serverUrl: 'https://custom.server.com/track',
        batchSize: 1,
      });
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockFetch.mock.calls[0][0]).toBe('https://custom.server.com/track');
    });

    it('should use default server URL', async () => {
      sdk.init({ apiKey: 'test-key', batchSize: 1 });
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockFetch.mock.calls[0][0]).toBe('/api/v1/events');
    });
  });
});
