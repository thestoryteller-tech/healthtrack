/**
 * Server-Side PHI Scrubber
 * Comprehensive PHI detection and removal for server-side processing
 */

import { createHash } from 'crypto';

/**
 * Result of PHI scrubbing operation
 */
export interface ScrubResult {
  data: Record<string, unknown>;
  scrubbedFields: string[];
  hashedFields: string[];
}

/**
 * PHI detection patterns
 */
const PATTERNS = {
  // Email: standard format
  EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,

  // Phone: various US formats
  PHONE: /(?:\+?1[-.\s]?)?(?:\(?[2-9]\d{2}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g,

  // SSN: with or without dashes/spaces
  SSN: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,

  // Date of Birth: various formats
  DOB: /\b(?:0?[1-9]|1[0-2])[-/](?:0?[1-9]|[12]\d|3[01])[-/](?:19|20)\d{2}\b/g,

  // Credit Card: Visa, MC, Amex, Discover (basic patterns)
  CREDIT_CARD: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,

  // IP Address: IPv4
  IPV4: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
};

/**
 * Field names that commonly contain PHI
 */
const PHI_FIELD_NAMES = new Set([
  // Identity
  'email',
  'e-mail',
  'mail',
  'name',
  'firstname',
  'first_name',
  'lastname',
  'last_name',
  'fullname',
  'full_name',
  'patient',
  'patientname',
  'patient_name',
  'username',
  'user_name',

  // Contact
  'phone',
  'telephone',
  'tel',
  'mobile',
  'cell',
  'fax',

  // Location
  'address',
  'street',
  'city',
  'state',
  'zip',
  'zipcode',
  'zip_code',
  'postalcode',
  'postal_code',

  // Government IDs
  'ssn',
  'socialsecurity',
  'social_security',
  'ssn_last4',
  'driverslicense',
  'drivers_license',
  'passport',

  // Dates
  'dob',
  'dateofbirth',
  'date_of_birth',
  'birthdate',
  'birth_date',
  'birthday',

  // Medical
  'medicalrecord',
  'medical_record',
  'mrn',
  'diagnosis',
  'condition',
  'treatment',
  'prescription',
  'medication',
  'allergy',
  'symptoms',

  // Insurance
  'insurance',
  'insuranceid',
  'insurance_id',
  'memberid',
  'member_id',
  'policynumber',
  'policy_number',
  'groupnumber',
  'group_number',

  // Financial
  'creditcard',
  'credit_card',
  'cardnumber',
  'card_number',
  'accountnumber',
  'account_number',
  'routingnumber',
  'routing_number',
]);

/**
 * URL parameters to remove
 */
const SENSITIVE_URL_PARAMS = new Set([
  // Personal
  'email',
  'name',
  'phone',
  'patient',
  'ssn',
  'dob',
  'firstname',
  'lastname',
  'first_name',
  'last_name',
  'address',
  'zip',
  'zipcode',

  // Ad tracking IDs
  'gclid',
  'fbclid',
  'msclkid',
  'ttclid',
  'li_fat_id',
  'wbraid',
  'gbraid',
  'dclid',
  'twclid',
  'igshid',
]);

/**
 * PHI Scrubber class for server-side data sanitization
 */
export class PHIScrubber {
  private orgSalt: string;

  constructor(orgSalt: string = 'default-salt') {
    this.orgSalt = orgSalt;
  }

  /**
   * Set organization-specific salt for hashing
   */
  setOrgSalt(salt: string): void {
    this.orgSalt = salt;
  }

  /**
   * Scrub PHI from an object recursively
   */
  scrubObject(data: Record<string, unknown>, path: string = ''): ScrubResult {
    const scrubbedFields: string[] = [];
    const hashedFields: string[] = [];
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      const fieldPath = path ? `${path}.${key}` : key;
      const lowerKey = key.toLowerCase();

      // Check if field name indicates PHI
      if (PHI_FIELD_NAMES.has(lowerKey)) {
        scrubbedFields.push(fieldPath);
        result[key] = '[REDACTED]';
        continue;
      }

      // Handle strings - check for PHI patterns
      if (typeof value === 'string') {
        const patternResult = this.detectAndScrubPatterns(value, fieldPath);
        if (patternResult.hasPHI) {
          scrubbedFields.push(...patternResult.detectedTypes.map((t) => `${fieldPath} (${t})`));
          result[key] = patternResult.scrubbedValue;
          continue;
        }
        result[key] = value;
        continue;
      }

      // Handle nested objects
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const nested = this.scrubObject(value as Record<string, unknown>, fieldPath);
        result[key] = nested.data;
        scrubbedFields.push(...nested.scrubbedFields);
        hashedFields.push(...nested.hashedFields);
        continue;
      }

      // Handle arrays
      if (Array.isArray(value)) {
        result[key] = value.map((item, index) => {
          if (item && typeof item === 'object') {
            const nested = this.scrubObject(
              item as Record<string, unknown>,
              `${fieldPath}[${index}]`
            );
            scrubbedFields.push(...nested.scrubbedFields);
            hashedFields.push(...nested.hashedFields);
            return nested.data;
          }
          return item;
        });
        continue;
      }

      // Keep other values as-is
      result[key] = value;
    }

    return { data: result, scrubbedFields, hashedFields };
  }

  /**
   * Detect and scrub PHI patterns from a string
   */
  private detectAndScrubPatterns(
    value: string,
    fieldPath: string
  ): { hasPHI: boolean; scrubbedValue: string; detectedTypes: string[] } {
    const detectedTypes: string[] = [];
    let scrubbedValue = value;

    // Check patterns in order of specificity (most specific first to avoid overlap)
    // Credit cards first (longer, more specific patterns - 13-16 digits)
    if (PATTERNS.CREDIT_CARD.test(value)) {
      PATTERNS.CREDIT_CARD.lastIndex = 0;
      detectedTypes.push('credit_card');
      scrubbedValue = scrubbedValue.replace(PATTERNS.CREDIT_CARD, '[CC_REDACTED]');
    }

    if (PATTERNS.EMAIL.test(scrubbedValue)) {
      PATTERNS.EMAIL.lastIndex = 0;
      detectedTypes.push('email');
      scrubbedValue = scrubbedValue.replace(PATTERNS.EMAIL, '[EMAIL_REDACTED]');
    }

    // SSN before phone (SSN is 9 digits, phone patterns can match SSN)
    if (PATTERNS.SSN.test(scrubbedValue)) {
      PATTERNS.SSN.lastIndex = 0;
      detectedTypes.push('ssn');
      scrubbedValue = scrubbedValue.replace(PATTERNS.SSN, '[SSN_REDACTED]');
    }

    if (PATTERNS.PHONE.test(scrubbedValue)) {
      PATTERNS.PHONE.lastIndex = 0;
      detectedTypes.push('phone');
      scrubbedValue = scrubbedValue.replace(PATTERNS.PHONE, '[PHONE_REDACTED]');
    }

    if (PATTERNS.DOB.test(scrubbedValue)) {
      PATTERNS.DOB.lastIndex = 0;
      detectedTypes.push('dob');
      scrubbedValue = scrubbedValue.replace(PATTERNS.DOB, '[DOB_REDACTED]');
    }

    return {
      hasPHI: detectedTypes.length > 0,
      scrubbedValue,
      detectedTypes,
    };
  }

  /**
   * Hash a user identifier using org-specific salt
   */
  hashIdentifier(identifier: string): string {
    const hash = createHash('sha256');
    hash.update(this.orgSalt + identifier);
    return hash.digest('hex');
  }

  /**
   * Scrub URL of sensitive query parameters
   */
  scrubUrl(url: string): { url: string; removedParams: string[] } {
    if (!url) return { url: '', removedParams: [] };

    try {
      const parsed = new URL(url);
      const removedParams: string[] = [];

      // Remove known sensitive parameters
      for (const param of SENSITIVE_URL_PARAMS) {
        if (parsed.searchParams.has(param)) {
          removedParams.push(param);
          parsed.searchParams.delete(param);
        }
      }

      // Check remaining params for PHI patterns
      const paramsToRemove: string[] = [];
      for (const [key, value] of parsed.searchParams.entries()) {
        const { hasPHI } = this.detectAndScrubPatterns(value, `url.${key}`);
        if (hasPHI) {
          paramsToRemove.push(key);
          removedParams.push(key);
        }
      }
      for (const param of paramsToRemove) {
        parsed.searchParams.delete(param);
      }

      return { url: parsed.toString(), removedParams };
    } catch {
      return { url, removedParams: [] };
    }
  }

  /**
   * Anonymize IP address
   * IPv4: zero last octet
   * IPv6: zero last 80 bits
   */
  anonymizeIP(ip: string): string {
    if (!ip) return '';

    // IPv4
    if (ip.includes('.') && !ip.includes(':')) {
      const parts = ip.split('.');
      if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
      }
    }

    // IPv6
    if (ip.includes(':')) {
      // Expand any shorthand notation first
      const expanded = this.expandIPv6(ip);
      const parts = expanded.split(':');
      if (parts.length === 8) {
        // Zero last 5 groups (80 bits)
        return `${parts.slice(0, 3).join(':')}::`;
      }
    }

    return ip;
  }

  /**
   * Expand shorthand IPv6 address
   */
  private expandIPv6(ip: string): string {
    // Handle :: shorthand
    if (ip.includes('::')) {
      const [left, right] = ip.split('::');
      const leftParts = left ? left.split(':') : [];
      const rightParts = right ? right.split(':') : [];
      const missingGroups = 8 - leftParts.length - rightParts.length;
      const middle = Array(missingGroups).fill('0000');
      return [...leftParts, ...middle, ...rightParts].join(':');
    }
    return ip;
  }

  /**
   * Strip ad tracking click IDs from URL
   */
  stripClickIds(url: string): string {
    const { url: scrubbedUrl } = this.scrubUrl(url);
    return scrubbedUrl;
  }

  /**
   * Check if a field name appears to contain PHI
   */
  isPHIFieldName(fieldName: string): boolean {
    return PHI_FIELD_NAMES.has(fieldName.toLowerCase());
  }

  /**
   * Scrub referrer URL more aggressively
   */
  scrubReferrer(referrer: string): string {
    if (!referrer) return '';

    try {
      const parsed = new URL(referrer);

      // Only keep protocol, host, and path
      // Remove all query parameters for referrers
      return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
    } catch {
      return '';
    }
  }
}

// Export default instance
export const phiScrubber = new PHIScrubber();
