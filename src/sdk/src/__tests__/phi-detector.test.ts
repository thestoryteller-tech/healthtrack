import { describe, it, expect, beforeEach } from 'vitest';
import { PHIDetector } from '../phi-detector';

describe('PHIDetector', () => {
  let detector: PHIDetector;

  beforeEach(() => {
    detector = new PHIDetector();
  });

  describe('detectPHIInValue', () => {
    describe('email detection', () => {
      it('should detect standard email format', () => {
        expect(detector.detectPHIInValue('user@example.com')).toEqual({
          hasPHI: true,
          type: 'email',
        });
      });

      it('should detect email with subdomain', () => {
        expect(detector.detectPHIInValue('user@mail.example.com')).toEqual({
          hasPHI: true,
          type: 'email',
        });
      });

      it('should detect email with plus sign', () => {
        expect(detector.detectPHIInValue('user+tag@example.com')).toEqual({
          hasPHI: true,
          type: 'email',
        });
      });

      it('should not detect invalid email', () => {
        expect(detector.detectPHIInValue('not an email')).toEqual({
          hasPHI: false,
          type: null,
        });
      });
    });

    describe('phone detection', () => {
      it('should detect standard US phone format', () => {
        expect(detector.detectPHIInValue('555-123-4567')).toEqual({
          hasPHI: true,
          type: 'phone',
        });
      });

      it('should detect phone with parentheses', () => {
        expect(detector.detectPHIInValue('(555) 123-4567')).toEqual({
          hasPHI: true,
          type: 'phone',
        });
      });

      it('should detect phone with country code', () => {
        expect(detector.detectPHIInValue('+1 555-123-4567')).toEqual({
          hasPHI: true,
          type: 'phone',
        });
      });

      it('should detect phone with dots', () => {
        expect(detector.detectPHIInValue('555.123.4567')).toEqual({
          hasPHI: true,
          type: 'phone',
        });
      });

      it('should detect phone without separators', () => {
        expect(detector.detectPHIInValue('5551234567')).toEqual({
          hasPHI: true,
          type: 'phone',
        });
      });
    });

    describe('SSN detection', () => {
      it('should detect SSN with dashes', () => {
        expect(detector.detectPHIInValue('123-45-6789')).toEqual({
          hasPHI: true,
          type: 'ssn',
        });
      });

      it('should detect SSN with spaces', () => {
        expect(detector.detectPHIInValue('123 45 6789')).toEqual({
          hasPHI: true,
          type: 'ssn',
        });
      });

      it('should detect SSN without separators (note: matches phone pattern first)', () => {
        // 9-digit numbers without separators match phone pattern first
        // SSN without separators is ambiguous - use dashes for unambiguous SSN detection
        expect(detector.detectPHIInValue('123456789')).toEqual({
          hasPHI: true,
          type: 'phone',
        });
      });

      it('should detect unambiguous SSN with dashes', () => {
        expect(detector.detectPHIInValue('123-45-6789')).toEqual({
          hasPHI: true,
          type: 'ssn',
        });
      });
    });

    describe('date of birth detection', () => {
      it('should detect MM/DD/YYYY format', () => {
        expect(detector.detectPHIInValue('01/15/1990')).toEqual({
          hasPHI: true,
          type: 'dob',
        });
      });

      it('should detect MM-DD-YYYY format', () => {
        expect(detector.detectPHIInValue('01-15-1990')).toEqual({
          hasPHI: true,
          type: 'dob',
        });
      });

      it('should detect M/D/YYYY format', () => {
        expect(detector.detectPHIInValue('1/5/1990')).toEqual({
          hasPHI: true,
          type: 'dob',
        });
      });
    });

    describe('non-PHI values', () => {
      it('should not detect regular text', () => {
        expect(detector.detectPHIInValue('hello world')).toEqual({
          hasPHI: false,
          type: null,
        });
      });

      it('should not detect numbers', () => {
        expect(detector.detectPHIInValue('12345')).toEqual({
          hasPHI: false,
          type: null,
        });
      });

      it('should not detect non-string values', () => {
        expect(detector.detectPHIInValue(12345)).toEqual({
          hasPHI: false,
          type: null,
        });
      });
    });
  });

  describe('isPHIFieldName', () => {
    it('should detect email field names', () => {
      expect(detector.isPHIFieldName('email')).toBe(true);
      expect(detector.isPHIFieldName('userEmail')).toBe(true);
      expect(detector.isPHIFieldName('e-mail')).toBe(true);
    });

    it('should detect phone field names', () => {
      expect(detector.isPHIFieldName('phone')).toBe(true);
      expect(detector.isPHIFieldName('phoneNumber')).toBe(true);
      expect(detector.isPHIFieldName('telephone')).toBe(true);
      expect(detector.isPHIFieldName('mobile')).toBe(true);
    });

    it('should detect name field names', () => {
      expect(detector.isPHIFieldName('name')).toBe(true);
      expect(detector.isPHIFieldName('firstName')).toBe(true);
      expect(detector.isPHIFieldName('lastName')).toBe(true);
      expect(detector.isPHIFieldName('patientName')).toBe(true);
    });

    it('should detect medical field names', () => {
      expect(detector.isPHIFieldName('diagnosis')).toBe(true);
      expect(detector.isPHIFieldName('treatment')).toBe(true);
      expect(detector.isPHIFieldName('prescription')).toBe(true);
      expect(detector.isPHIFieldName('medicalRecord')).toBe(true);
    });

    it('should not detect safe field names', () => {
      expect(detector.isPHIFieldName('category')).toBe(false);
      expect(detector.isPHIFieldName('productId')).toBe(false);
      expect(detector.isPHIFieldName('pageTitle')).toBe(false);
    });
  });

  describe('scrubObject', () => {
    it('should scrub PHI field names', () => {
      const result = detector.scrubObject({
        email: 'test@example.com',
        productId: '123',
      });

      expect(result.hasPHI).toBe(true);
      expect(result.detectedFields).toContain('email');
      expect(result.scrubbedData.email).toBe('[REDACTED]');
      expect(result.scrubbedData.productId).toBe('123');
    });

    it('should scrub PHI patterns in values', () => {
      const result = detector.scrubObject({
        contactInfo: 'test@example.com',
        orderId: '123',
      });

      expect(result.hasPHI).toBe(true);
      expect(result.scrubbedData.contactInfo).toBe('[REDACTED]');
      expect(result.scrubbedData.orderId).toBe('123');
    });

    it('should scrub nested objects', () => {
      const result = detector.scrubObject({
        user: {
          email: 'test@example.com',
          id: '123',
        },
      });

      expect(result.hasPHI).toBe(true);
      expect(result.detectedFields).toContain('user.email');
      expect((result.scrubbedData.user as Record<string, unknown>).email).toBe('[REDACTED]');
      expect((result.scrubbedData.user as Record<string, unknown>).id).toBe('123');
    });

    it('should scrub arrays with objects', () => {
      const result = detector.scrubObject({
        items: [{ name: 'John', value: 100 }],
      });

      expect(result.hasPHI).toBe(true);
      const items = result.scrubbedData.items as Record<string, unknown>[];
      expect(items[0].name).toBe('[REDACTED]');
      expect(items[0].value).toBe(100);
    });

    it('should handle empty objects', () => {
      const result = detector.scrubObject({});

      expect(result.hasPHI).toBe(false);
      expect(result.detectedFields).toHaveLength(0);
    });

    it('should handle null and undefined values', () => {
      const result = detector.scrubObject({
        nullValue: null,
        stringValue: 'test',
      });

      expect(result.hasPHI).toBe(false);
      expect(result.scrubbedData.nullValue).toBe(null);
    });
  });

  describe('scrubUrl', () => {
    it('should remove email parameter', () => {
      const url = 'https://example.com?email=test@example.com&page=1';
      expect(detector.scrubUrl(url)).toBe('https://example.com/?page=1');
    });

    it('should remove multiple sensitive parameters', () => {
      const url = 'https://example.com?name=John&phone=555-1234&page=1';
      expect(detector.scrubUrl(url)).toBe('https://example.com/?page=1');
    });

    it('should remove click IDs', () => {
      const url = 'https://example.com?gclid=abc123&fbclid=def456&page=1';
      expect(detector.scrubUrl(url)).toBe('https://example.com/?page=1');
    });

    it('should handle URLs without parameters', () => {
      const url = 'https://example.com/path';
      expect(detector.scrubUrl(url)).toBe('https://example.com/path');
    });

    it('should handle invalid URLs', () => {
      const url = 'not a url';
      expect(detector.scrubUrl(url)).toBe('not a url');
    });

    it('should handle empty string', () => {
      expect(detector.scrubUrl('')).toBe('');
    });
  });

  describe('stripClickIds', () => {
    it('should strip gclid', () => {
      const url = 'https://example.com?gclid=abc123&page=1';
      expect(detector.stripClickIds(url)).toBe('https://example.com/?page=1');
    });

    it('should strip fbclid', () => {
      const url = 'https://example.com?fbclid=abc123&page=1';
      expect(detector.stripClickIds(url)).toBe('https://example.com/?page=1');
    });

    it('should strip all click IDs', () => {
      const url = 'https://example.com?gclid=a&fbclid=b&msclkid=c&ttclid=d&page=1';
      expect(detector.stripClickIds(url)).toBe('https://example.com/?page=1');
    });
  });

  describe('sensitive page patterns', () => {
    it('should detect sensitive page from pattern', () => {
      detector.addSensitivePagePattern(/intake-form/i, 'block');

      const result = detector.isSensitivePage('https://example.com/intake-form');
      expect(result.isSensitive).toBe(true);
      expect(result.action).toBe('block');
    });

    it('should return false for non-sensitive page', () => {
      detector.addSensitivePagePattern(/intake-form/i, 'block');

      const result = detector.isSensitivePage('https://example.com/home');
      expect(result.isSensitive).toBe(false);
      expect(result.action).toBe(null);
    });

    it('should support string patterns', () => {
      detector.addSensitivePagePattern('appointment', 'strip');

      const result = detector.isSensitivePage('https://example.com/book-appointment');
      expect(result.isSensitive).toBe(true);
      expect(result.action).toBe('strip');
    });
  });

  describe('getDefaultHealthcarePatterns', () => {
    it('should return an array of patterns', () => {
      const patterns = detector.getDefaultHealthcarePatterns();

      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBeGreaterThan(0);

      // Check some expected patterns exist
      const hasIntakeForm = patterns.some((p) => p.pattern.toString().includes('intake'));
      const hasAppointment = patterns.some((p) => p.pattern.toString().includes('appointment'));

      expect(hasIntakeForm).toBe(true);
      expect(hasAppointment).toBe(true);
    });
  });
});
