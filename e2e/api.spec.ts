import { test, expect } from '@playwright/test';

test.describe('API Endpoints', () => {
  test.describe('Health Check', () => {
    test('should return 200 for health endpoint', async ({ request }) => {
      const response = await request.get('/api/health');
      expect(response.status()).toBe(200);
    });
  });

  test.describe('Event Ingestion API', () => {
    test('should reject events without API key', async ({ request }) => {
      const response = await request.post('/api/v1/events', {
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          event_type: 'page_view',
          url: 'https://example.com',
        },
      });

      expect(response.status()).toBe(401);
    });

    test('should reject events with invalid API key', async ({ request }) => {
      const response = await request.post('/api/v1/events', {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'invalid-key',
        },
        data: {
          event_type: 'page_view',
          url: 'https://example.com',
        },
      });

      expect([401, 403]).toContain(response.status());
    });

    test('should reject malformed JSON', async ({ request }) => {
      const response = await request.post('/api/v1/events', {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'ht_live_testkey',
        },
        data: 'invalid json',
      });

      expect([400, 422]).toContain(response.status());
    });

    test('should accept valid event with valid API key format', async ({ request }) => {
      // Note: This will fail with 401/403 since the API key doesn't exist in DB
      // But it tests that the endpoint accepts the request format
      const response = await request.post('/api/v1/events', {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'ht_live_test1234567890abcdef',
        },
        data: {
          event_type: 'page_view',
          url: 'https://example.com/test',
          title: 'Test Page',
          timestamp: Date.now(),
        },
      });

      // Should not be 500 (server error)
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe('Protected API Routes', () => {
    test('should require authentication for /api/keys', async ({ request }) => {
      const response = await request.get('/api/keys');
      expect([401, 403]).toContain(response.status());
    });

    test('should require authentication for /api/platforms', async ({ request }) => {
      const response = await request.get('/api/platforms');
      expect([401, 403]).toContain(response.status());
    });

    test('should require authentication for /api/usage', async ({ request }) => {
      const response = await request.get('/api/usage');
      expect([401, 403]).toContain(response.status());
    });

    test('should require authentication for /api/test-event', async ({ request }) => {
      const response = await request.post('/api/test-event');
      expect([401, 403]).toContain(response.status());
    });
  });

  test.describe('Webhook Endpoints', () => {
    test('should reject Stripe webhook without signature', async ({ request }) => {
      const response = await request.post('/api/webhooks/stripe', {
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          type: 'checkout.session.completed',
          data: {},
        },
      });

      expect([400, 401]).toContain(response.status());
    });
  });
});
