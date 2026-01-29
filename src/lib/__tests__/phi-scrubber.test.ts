import { describe, it, expect, beforeEach } from 'vitest';
import { PHIScrubber, phiScrubber } from '../phi-scrubber';

describe('PHIScrubber', () => {
  let scrubber: PHIScrubber;

  beforeEach(() => {
    scrubber = new PHIScrubber('test-org-salt');
  });

  describe('email detection', () => {
    it('should detect standard email format', () => {
      const result = scrubber.scrubObject({ data: 'user@example.com' });
      expect(result.data.data).toBe('[EMAIL_REDACTED]');
      expect(result.scrubbedFields).toHaveLength(1);
    });

    it('should detect email with subdomain', () => {
      const result = scrubber.scrubObject({ data: 'user@mail.example.com' });
      expect(result.data.data).toBe('[EMAIL_REDACTED]');
    });

    it('should detect email with plus sign', () => {
      const result = scrubber.scrubObject({ data: 'user+tag@example.com' });
      expect(result.data.data).toBe('[EMAIL_REDACTED]');
    });

    it('should detect multiple emails in text', () => {
      const result = scrubber.scrubObject({
        data: 'Contact john@example.com or jane@test.org',
      });
      expect(result.data.data).toBe('Contact [EMAIL_REDACTED] or [EMAIL_REDACTED]');
    });
  });

  describe('phone detection', () => {
    it('should detect standard US phone format', () => {
      const result = scrubber.scrubObject({ data: '555-123-4567' });
      expect(result.data.data).toBe('[PHONE_REDACTED]');
    });

    it('should detect phone with parentheses', () => {
      const result = scrubber.scrubObject({ data: '(555) 123-4567' });
      expect(result.data.data).toBe('[PHONE_REDACTED]');
    });

    it('should detect phone with country code', () => {
      const result = scrubber.scrubObject({ data: '+1 555-123-4567' });
      expect(result.data.data).toBe('[PHONE_REDACTED]');
    });

    it('should detect phone with dots', () => {
      const result = scrubber.scrubObject({ data: '555.123.4567' });
      expect(result.data.data).toBe('[PHONE_REDACTED]');
    });

    it('should detect phone without separators', () => {
      const result = scrubber.scrubObject({ data: '5551234567' });
      expect(result.data.data).toBe('[PHONE_REDACTED]');
    });
  });

  describe('SSN detection', () => {
    it('should detect SSN with dashes', () => {
      const result = scrubber.scrubObject({ data: '123-45-6789' });
      expect(result.data.data).toBe('[SSN_REDACTED]');
    });

    it('should detect SSN with spaces', () => {
      const result = scrubber.scrubObject({ data: '123 45 6789' });
      expect(result.data.data).toBe('[SSN_REDACTED]');
    });

    it('should detect SSN in text', () => {
      const result = scrubber.scrubObject({ data: 'SSN: 123-45-6789 confirmed' });
      expect(result.data.data).toBe('SSN: [SSN_REDACTED] confirmed');
    });
  });

  describe('date of birth detection', () => {
    it('should detect MM/DD/YYYY format', () => {
      const result = scrubber.scrubObject({ data: '01/15/1990' });
      expect(result.data.data).toBe('[DOB_REDACTED]');
    });

    it('should detect MM-DD-YYYY format', () => {
      const result = scrubber.scrubObject({ data: '01-15-1990' });
      expect(result.data.data).toBe('[DOB_REDACTED]');
    });

    it('should detect M/D/YYYY format', () => {
      const result = scrubber.scrubObject({ data: '1/5/1990' });
      expect(result.data.data).toBe('[DOB_REDACTED]');
    });
  });

  describe('credit card detection', () => {
    it('should detect Visa number', () => {
      const result = scrubber.scrubObject({ data: '4111111111111111' });
      expect(result.data.data).toBe('[CC_REDACTED]');
    });

    it('should detect Mastercard number', () => {
      const result = scrubber.scrubObject({ data: '5500000000000004' });
      expect(result.data.data).toBe('[CC_REDACTED]');
    });

    it('should detect Amex number', () => {
      const result = scrubber.scrubObject({ data: '340000000000009' });
      expect(result.data.data).toBe('[CC_REDACTED]');
    });
  });

  describe('field name removal', () => {
    it('should remove email field', () => {
      const result = scrubber.scrubObject({ email: 'test@example.com' });
      expect(result.data.email).toBe('[REDACTED]');
      expect(result.scrubbedFields).toContain('email');
    });

    it('should remove phone field', () => {
      const result = scrubber.scrubObject({ phone: '555-1234' });
      expect(result.data.phone).toBe('[REDACTED]');
    });

    it('should remove name fields', () => {
      const result = scrubber.scrubObject({
        firstName: 'John',
        lastName: 'Doe',
        fullName: 'John Doe',
      });
      expect(result.data.firstName).toBe('[REDACTED]');
      expect(result.data.lastName).toBe('[REDACTED]');
      expect(result.data.fullName).toBe('[REDACTED]');
    });

    it('should remove medical fields', () => {
      const result = scrubber.scrubObject({
        diagnosis: 'Type 2 Diabetes',
        treatment: 'Metformin',
        prescription: 'Rx12345',
      });
      expect(result.data.diagnosis).toBe('[REDACTED]');
      expect(result.data.treatment).toBe('[REDACTED]');
      expect(result.data.prescription).toBe('[REDACTED]');
    });

    it('should remove insurance fields', () => {
      const result = scrubber.scrubObject({
        insuranceId: 'INS123',
        policyNumber: 'POL456',
        memberId: 'MEM789',
      });
      expect(result.data.insuranceId).toBe('[REDACTED]');
      expect(result.data.policyNumber).toBe('[REDACTED]');
      expect(result.data.memberId).toBe('[REDACTED]');
    });

    it('should handle case-insensitive field names', () => {
      const result = scrubber.scrubObject({
        EMAIL: 'test@example.com',
        PHONE: '555-1234',
        FirstName: 'John',
      });
      expect(result.data.EMAIL).toBe('[REDACTED]');
      expect(result.data.PHONE).toBe('[REDACTED]');
      expect(result.data.FirstName).toBe('[REDACTED]');
    });
  });

  describe('nested object scrubbing', () => {
    it('should scrub nested objects', () => {
      const result = scrubber.scrubObject({
        user: {
          email: 'test@example.com',
          id: '123',
        },
      });
      expect((result.data.user as Record<string, unknown>).email).toBe('[REDACTED]');
      expect((result.data.user as Record<string, unknown>).id).toBe('123');
      expect(result.scrubbedFields).toContain('user.email');
    });

    it('should scrub deeply nested objects', () => {
      const result = scrubber.scrubObject({
        level1: {
          level2: {
            level3: {
              phone: '555-1234',
            },
          },
        },
      });
      const level1 = result.data.level1 as Record<string, unknown>;
      const level2 = level1.level2 as Record<string, unknown>;
      const level3 = level2.level3 as Record<string, unknown>;
      expect(level3.phone).toBe('[REDACTED]');
      expect(result.scrubbedFields).toContain('level1.level2.level3.phone');
    });
  });

  describe('array scrubbing', () => {
    it('should scrub arrays with objects', () => {
      const result = scrubber.scrubObject({
        contacts: [
          { name: 'John', value: 100 },
          { name: 'Jane', value: 200 },
        ],
      });
      const contacts = result.data.contacts as Record<string, unknown>[];
      expect(contacts[0].name).toBe('[REDACTED]');
      expect(contacts[0].value).toBe(100);
      expect(contacts[1].name).toBe('[REDACTED]');
    });

    it('should preserve non-object array elements', () => {
      const result = scrubber.scrubObject({
        tags: ['tag1', 'tag2', 'tag3'],
      });
      expect(result.data.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });
  });

  describe('URL scrubbing', () => {
    it('should remove email parameter', () => {
      const result = scrubber.scrubUrl('https://example.com?email=test@example.com&page=1');
      expect(result.url).toBe('https://example.com/?page=1');
      expect(result.removedParams).toContain('email');
    });

    it('should remove multiple sensitive parameters', () => {
      const result = scrubber.scrubUrl('https://example.com?name=John&phone=555-1234&page=1');
      expect(result.url).toBe('https://example.com/?page=1');
      expect(result.removedParams).toContain('name');
      expect(result.removedParams).toContain('phone');
    });

    it('should remove click IDs', () => {
      const result = scrubber.scrubUrl('https://example.com?gclid=abc&fbclid=def&page=1');
      expect(result.url).toBe('https://example.com/?page=1');
      expect(result.removedParams).toContain('gclid');
      expect(result.removedParams).toContain('fbclid');
    });

    it('should remove all ad tracking IDs', () => {
      const result = scrubber.scrubUrl(
        'https://example.com?gclid=a&fbclid=b&msclkid=c&ttclid=d&page=1'
      );
      expect(result.url).toBe('https://example.com/?page=1');
    });

    it('should handle URLs without parameters', () => {
      const result = scrubber.scrubUrl('https://example.com/path');
      expect(result.url).toBe('https://example.com/path');
      expect(result.removedParams).toHaveLength(0);
    });

    it('should handle invalid URLs', () => {
      const result = scrubber.scrubUrl('not a url');
      expect(result.url).toBe('not a url');
    });

    it('should handle empty string', () => {
      const result = scrubber.scrubUrl('');
      expect(result.url).toBe('');
    });

    it('should detect PHI patterns in URL params', () => {
      const result = scrubber.scrubUrl('https://example.com?data=user@test.com&page=1');
      expect(result.url).toBe('https://example.com/?page=1');
      expect(result.removedParams).toContain('data');
    });
  });

  describe('IP anonymization', () => {
    it('should anonymize IPv4 by zeroing last octet', () => {
      expect(scrubber.anonymizeIP('192.168.1.100')).toBe('192.168.1.0');
    });

    it('should handle 0.0.0.0', () => {
      expect(scrubber.anonymizeIP('0.0.0.0')).toBe('0.0.0.0');
    });

    it('should handle 255.255.255.255', () => {
      expect(scrubber.anonymizeIP('255.255.255.255')).toBe('255.255.255.0');
    });

    it('should anonymize IPv6 by zeroing last 80 bits', () => {
      const result = scrubber.anonymizeIP('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
      expect(result).toBe('2001:0db8:85a3::');
    });

    it('should handle empty string', () => {
      expect(scrubber.anonymizeIP('')).toBe('');
    });
  });

  describe('identifier hashing', () => {
    it('should hash identifiers consistently', () => {
      const hash1 = scrubber.hashIdentifier('user123');
      const hash2 = scrubber.hashIdentifier('user123');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different identifiers', () => {
      const hash1 = scrubber.hashIdentifier('user123');
      const hash2 = scrubber.hashIdentifier('user456');
      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hashes with different salts', () => {
      const scrubber2 = new PHIScrubber('different-salt');
      const hash1 = scrubber.hashIdentifier('user123');
      const hash2 = scrubber2.hashIdentifier('user123');
      expect(hash1).not.toBe(hash2);
    });

    it('should produce 64 character hex hash', () => {
      const hash = scrubber.hashIdentifier('test');
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('referrer scrubbing', () => {
    it('should remove query parameters from referrer', () => {
      const result = scrubber.scrubReferrer('https://google.com/search?q=test&user=john');
      expect(result).toBe('https://google.com/search');
    });

    it('should preserve protocol, host, and path', () => {
      const result = scrubber.scrubReferrer('https://example.com/some/path');
      expect(result).toBe('https://example.com/some/path');
    });

    it('should handle empty referrer', () => {
      expect(scrubber.scrubReferrer('')).toBe('');
    });

    it('should handle invalid URL', () => {
      expect(scrubber.scrubReferrer('not a url')).toBe('');
    });
  });

  describe('edge cases', () => {
    it('should handle empty objects', () => {
      const result = scrubber.scrubObject({});
      expect(result.data).toEqual({});
      expect(result.scrubbedFields).toHaveLength(0);
    });

    it('should handle null values', () => {
      const result = scrubber.scrubObject({
        nullValue: null,
        stringValue: 'test',
      });
      expect(result.data.nullValue).toBe(null);
      expect(result.data.stringValue).toBe('test');
    });

    it('should handle undefined values', () => {
      const result = scrubber.scrubObject({
        undefinedValue: undefined,
        stringValue: 'test',
      });
      expect(result.data.undefinedValue).toBe(undefined);
      expect(result.data.stringValue).toBe('test');
    });

    it('should handle number values', () => {
      const result = scrubber.scrubObject({
        count: 42,
        price: 19.99,
      });
      expect(result.data.count).toBe(42);
      expect(result.data.price).toBe(19.99);
    });

    it('should handle boolean values', () => {
      const result = scrubber.scrubObject({
        active: true,
        deleted: false,
      });
      expect(result.data.active).toBe(true);
      expect(result.data.deleted).toBe(false);
    });

    it('should not modify safe fields', () => {
      const result = scrubber.scrubObject({
        category: 'health',
        productId: 'ABC123',
        pageTitle: 'Services',
        timestamp: '2024-01-01T00:00:00Z',
      });
      expect(result.data.category).toBe('health');
      expect(result.data.productId).toBe('ABC123');
      expect(result.data.pageTitle).toBe('Services');
      expect(result.scrubbedFields).toHaveLength(0);
    });
  });

  describe('isPHIFieldName', () => {
    it('should detect email field names', () => {
      expect(scrubber.isPHIFieldName('email')).toBe(true);
      expect(scrubber.isPHIFieldName('EMAIL')).toBe(true);
      expect(scrubber.isPHIFieldName('e-mail')).toBe(true);
    });

    it('should detect phone field names', () => {
      expect(scrubber.isPHIFieldName('phone')).toBe(true);
      expect(scrubber.isPHIFieldName('telephone')).toBe(true);
      expect(scrubber.isPHIFieldName('mobile')).toBe(true);
    });

    it('should not detect safe field names', () => {
      expect(scrubber.isPHIFieldName('category')).toBe(false);
      expect(scrubber.isPHIFieldName('productId')).toBe(false);
      expect(scrubber.isPHIFieldName('pageTitle')).toBe(false);
    });
  });

  describe('default instance', () => {
    it('should export a default instance', () => {
      expect(phiScrubber).toBeInstanceOf(PHIScrubber);
    });

    it('should allow setting org salt', () => {
      phiScrubber.setOrgSalt('new-salt');
      // Should not throw
      const hash = phiScrubber.hashIdentifier('test');
      expect(hash).toBeDefined();
    });
  });
});
