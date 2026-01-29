/**
 * PHI Detection Module
 * Detects and strips Protected Health Information from tracking data
 */

export interface PHIDetectionResult {
  hasPHI: boolean;
  detectedFields: string[];
  scrubbedData: Record<string, unknown>;
}

export interface SensitivePagePattern {
  pattern: string | RegExp;
  action: 'block' | 'strip';
}

// PHI detection patterns
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_PATTERN = /(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g;
const SSN_PATTERN = /\d{3}[-\s]?\d{2}[-\s]?\d{4}/g;
const DATE_OF_BIRTH_PATTERN = /\b(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])[\/\-](19|20)\d{2}\b/g;

// Field names that commonly contain PHI
const PHI_FIELD_NAMES = [
  'email',
  'e-mail',
  'mail',
  'phone',
  'telephone',
  'tel',
  'mobile',
  'cell',
  'name',
  'firstName',
  'first_name',
  'lastname',
  'lastName',
  'last_name',
  'fullName',
  'full_name',
  'patientName',
  'patient_name',
  'patient',
  'ssn',
  'socialSecurity',
  'social_security',
  'dob',
  'dateOfBirth',
  'date_of_birth',
  'birthDate',
  'birth_date',
  'birthday',
  'address',
  'street',
  'city',
  'state',
  'zip',
  'zipCode',
  'zip_code',
  'postalCode',
  'postal_code',
  'medicalRecord',
  'medical_record',
  'mrn',
  'diagnosis',
  'condition',
  'treatment',
  'prescription',
  'insurance',
  'insuranceId',
  'insurance_id',
  'memberId',
  'member_id',
  'policyNumber',
  'policy_number',
];

// URL parameters to strip
const SENSITIVE_URL_PARAMS = [
  'email',
  'name',
  'phone',
  'patient',
  'ssn',
  'dob',
  'firstName',
  'lastName',
  'first_name',
  'last_name',
  'gclid',
  'fbclid',
  'msclkid',
  'ttclid',
  'li_fat_id',
  'wbraid',
  'gbraid',
];

class PHIDetector {
  private debugMode: boolean = false;
  private sensitivePagePatterns: SensitivePagePattern[] = [];

  /**
   * Enable debug mode for console warnings
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  /**
   * Configure sensitive URL patterns
   */
  configureSensitivePages(patterns: SensitivePagePattern[]): void {
    this.sensitivePagePatterns = patterns;
  }

  /**
   * Add a sensitive page pattern
   */
  addSensitivePagePattern(pattern: string | RegExp, action: 'block' | 'strip' = 'strip'): void {
    this.sensitivePagePatterns.push({ pattern, action });
  }

  /**
   * Check if current URL is on a sensitive page
   */
  isSensitivePage(url: string): { isSensitive: boolean; action: 'block' | 'strip' | null } {
    for (const { pattern, action } of this.sensitivePagePatterns) {
      const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
      if (regex.test(url)) {
        return { isSensitive: true, action };
      }
    }
    return { isSensitive: false, action: null };
  }

  /**
   * Detect PHI in a value
   */
  detectPHIInValue(value: unknown): { hasPHI: boolean; type: string | null } {
    if (typeof value !== 'string') return { hasPHI: false, type: null };

    if (EMAIL_PATTERN.test(value)) {
      EMAIL_PATTERN.lastIndex = 0; // Reset regex state
      return { hasPHI: true, type: 'email' };
    }

    if (PHONE_PATTERN.test(value)) {
      PHONE_PATTERN.lastIndex = 0;
      return { hasPHI: true, type: 'phone' };
    }

    if (SSN_PATTERN.test(value)) {
      SSN_PATTERN.lastIndex = 0;
      return { hasPHI: true, type: 'ssn' };
    }

    if (DATE_OF_BIRTH_PATTERN.test(value)) {
      DATE_OF_BIRTH_PATTERN.lastIndex = 0;
      return { hasPHI: true, type: 'dob' };
    }

    return { hasPHI: false, type: null };
  }

  /**
   * Check if a field name is likely to contain PHI
   */
  isPHIFieldName(fieldName: string): boolean {
    const lowerName = fieldName.toLowerCase();
    return PHI_FIELD_NAMES.some((phiField) => lowerName.includes(phiField.toLowerCase()));
  }

  /**
   * Scrub PHI from an object
   */
  scrubObject(data: Record<string, unknown>, path: string = ''): PHIDetectionResult {
    const detectedFields: string[] = [];
    const scrubbedData: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      const fieldPath = path ? `${path}.${key}` : key;

      // Check if field name indicates PHI
      if (this.isPHIFieldName(key)) {
        detectedFields.push(fieldPath);
        this.warn(`PHI field detected: ${fieldPath}`);
        scrubbedData[key] = '[REDACTED]';
        continue;
      }

      // Check value for PHI patterns
      if (typeof value === 'string') {
        const { hasPHI, type } = this.detectPHIInValue(value);
        if (hasPHI) {
          detectedFields.push(`${fieldPath} (${type})`);
          this.warn(`PHI pattern detected in ${fieldPath}: ${type}`);
          scrubbedData[key] = '[REDACTED]';
          continue;
        }
      }

      // Recursively scrub nested objects
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const nestedResult = this.scrubObject(value as Record<string, unknown>, fieldPath);
        scrubbedData[key] = nestedResult.scrubbedData;
        detectedFields.push(...nestedResult.detectedFields);
        continue;
      }

      // Recursively scrub arrays
      if (Array.isArray(value)) {
        scrubbedData[key] = value.map((item, index) => {
          if (item && typeof item === 'object') {
            const nestedResult = this.scrubObject(
              item as Record<string, unknown>,
              `${fieldPath}[${index}]`
            );
            detectedFields.push(...nestedResult.detectedFields);
            return nestedResult.scrubbedData;
          }
          return item;
        });
        continue;
      }

      // Keep non-PHI values
      scrubbedData[key] = value;
    }

    return {
      hasPHI: detectedFields.length > 0,
      detectedFields,
      scrubbedData,
    };
  }

  /**
   * Scrub URL of sensitive parameters
   */
  scrubUrl(url: string): string {
    if (!url) return '';

    try {
      const parsed = new URL(url);

      // Remove sensitive query parameters
      for (const param of SENSITIVE_URL_PARAMS) {
        parsed.searchParams.delete(param);
      }

      // Check for PHI in remaining params
      for (const [key, value] of parsed.searchParams.entries()) {
        const { hasPHI } = this.detectPHIInValue(value);
        if (hasPHI) {
          this.warn(`PHI detected in URL param: ${key}`);
          parsed.searchParams.delete(key);
        }
      }

      return parsed.toString();
    } catch {
      // If URL parsing fails, return as-is
      return url;
    }
  }

  /**
   * Strip ad click IDs from URL (gclid, fbclid, etc.)
   */
  stripClickIds(url: string): string {
    if (!url) return '';

    try {
      const parsed = new URL(url);
      const clickIdParams = ['gclid', 'fbclid', 'msclkid', 'ttclid', 'li_fat_id', 'wbraid', 'gbraid'];

      for (const param of clickIdParams) {
        parsed.searchParams.delete(param);
      }

      return parsed.toString();
    } catch {
      return url;
    }
  }

  /**
   * Get default sensitive page patterns for healthcare
   */
  getDefaultHealthcarePatterns(): SensitivePagePattern[] {
    return [
      { pattern: /intake[-_]?form/i, action: 'block' },
      { pattern: /appointment/i, action: 'strip' },
      { pattern: /patient[-_]?portal/i, action: 'block' },
      { pattern: /medical[-_]?record/i, action: 'block' },
      { pattern: /prescription/i, action: 'block' },
      { pattern: /health[-_]?history/i, action: 'block' },
      { pattern: /symptom/i, action: 'strip' },
      { pattern: /diagnosis/i, action: 'block' },
      { pattern: /treatment/i, action: 'strip' },
      { pattern: /insurance/i, action: 'strip' },
      { pattern: /billing/i, action: 'strip' },
      { pattern: /contact[-_]?us/i, action: 'strip' },
    ];
  }

  private warn(message: string): void {
    if (this.debugMode) {
      console.warn(`[HealthTrack PHI] ${message}`);
    }
  }
}

// Export singleton instance
export const phiDetector = new PHIDetector();

// Export class for testing
export { PHIDetector };
