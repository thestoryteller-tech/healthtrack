/**
 * Consent Management Module
 * Integrates with popular CMPs (Consent Management Platforms)
 */

/**
 * Consent state for different tracking purposes
 */
export interface ConsentState {
  analytics: boolean;
  marketing: boolean;
}

/**
 * Google Consent Mode v2 consent types
 */
export interface GoogleConsentState {
  ad_storage?: 'granted' | 'denied';
  analytics_storage?: 'granted' | 'denied';
  ad_user_data?: 'granted' | 'denied';
  ad_personalization?: 'granted' | 'denied';
  functionality_storage?: 'granted' | 'denied';
  personalization_storage?: 'granted' | 'denied';
  security_storage?: 'granted' | 'denied';
}

/**
 * CMP adapter interface for custom integrations
 */
export interface CMPAdapter {
  /** Name of the CMP for logging */
  name: string;
  /** Check if this CMP is present on the page */
  isPresent(): boolean;
  /** Get current consent state */
  getConsent(): ConsentState;
  /** Subscribe to consent changes */
  onConsentChange(callback: (consent: ConsentState) => void): void;
}

/**
 * Consent change callback type
 */
export type ConsentChangeCallback = (consent: ConsentState) => void;

/**
 * Consent Manager handles CMP detection and consent state
 */
class ConsentManager {
  private adapters: CMPAdapter[] = [];
  private activeAdapter: CMPAdapter | null = null;
  private manualConsent: ConsentState | null = null;
  private callbacks: ConsentChangeCallback[] = [];
  private debugMode: boolean = false;

  constructor() {
    // Register built-in adapters
    this.adapters = [
      new GoogleConsentModeAdapter(),
      new OneTrustAdapter(),
      new CookiebotAdapter(),
    ];
  }

  /**
   * Enable debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  /**
   * Initialize consent detection
   */
  init(): void {
    // Find first available CMP
    for (const adapter of this.adapters) {
      if (adapter.isPresent()) {
        this.activeAdapter = adapter;
        this.log('info', `CMP detected: ${adapter.name}`);

        // Subscribe to consent changes
        adapter.onConsentChange((consent) => {
          this.notifyCallbacks(consent);
        });
        break;
      }
    }

    if (!this.activeAdapter) {
      this.log('info', 'No CMP detected, using default consent');
    }
  }

  /**
   * Register a custom CMP adapter
   */
  registerAdapter(adapter: CMPAdapter): void {
    this.adapters.unshift(adapter); // Add to front for priority
    this.log('info', `Custom CMP adapter registered: ${adapter.name}`);
  }

  /**
   * Manually set consent state (overrides CMP)
   */
  setConsent(consent: Partial<ConsentState>): void {
    this.manualConsent = {
      analytics: consent.analytics ?? true,
      marketing: consent.marketing ?? true,
    };
    this.log('info', 'Manual consent set', this.manualConsent);
    this.notifyCallbacks(this.manualConsent);
  }

  /**
   * Get current consent state
   */
  getConsent(): ConsentState {
    // Manual consent takes precedence
    if (this.manualConsent) {
      return { ...this.manualConsent };
    }

    // Use active CMP adapter
    if (this.activeAdapter) {
      return this.activeAdapter.getConsent();
    }

    // Default: consent granted
    return { analytics: true, marketing: true };
  }

  /**
   * Subscribe to consent changes
   */
  onConsentChange(callback: ConsentChangeCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Check if any consent is granted
   */
  hasAnyConsent(): boolean {
    const consent = this.getConsent();
    return consent.analytics || consent.marketing;
  }

  /**
   * Check if analytics consent is granted
   */
  hasAnalyticsConsent(): boolean {
    return this.getConsent().analytics;
  }

  /**
   * Check if marketing consent is granted
   */
  hasMarketingConsent(): boolean {
    return this.getConsent().marketing;
  }

  private notifyCallbacks(consent: ConsentState): void {
    for (const callback of this.callbacks) {
      try {
        callback(consent);
      } catch (error) {
        this.log('error', 'Consent callback error', error);
      }
    }
  }

  private log(level: 'info' | 'warn' | 'error', message: string, data?: unknown): void {
    if (!this.debugMode) return;

    const prefix = '[HealthTrack Consent]';
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

/**
 * Google Consent Mode v2 Adapter
 * Detects consent from Google Tag Manager dataLayer
 */
class GoogleConsentModeAdapter implements CMPAdapter {
  name = 'Google Consent Mode v2';
  private callbacks: ConsentChangeCallback[] = [];

  isPresent(): boolean {
    if (typeof window === 'undefined') return false;

    const win = window as unknown as { dataLayer?: unknown[] };
    return Array.isArray(win.dataLayer);
  }

  getConsent(): ConsentState {
    const googleConsent = this.getGoogleConsentState();

    return {
      analytics: googleConsent.analytics_storage === 'granted',
      marketing:
        googleConsent.ad_storage === 'granted' || googleConsent.ad_user_data === 'granted',
    };
  }

  onConsentChange(callback: ConsentChangeCallback): void {
    this.callbacks.push(callback);

    if (typeof window === 'undefined') return;

    const win = window as unknown as { dataLayer?: unknown[] };
    if (!win.dataLayer) return;

    // Watch for consent updates in dataLayer
    const originalPush = win.dataLayer.push.bind(win.dataLayer);
    win.dataLayer.push = (...args: unknown[]) => {
      const result = originalPush(...args);

      // Check if this is a consent update
      for (const arg of args) {
        if (this.isConsentUpdate(arg)) {
          const consent = this.getConsent();
          this.callbacks.forEach((cb) => cb(consent));
        }
      }

      return result;
    };
  }

  private getGoogleConsentState(): GoogleConsentState {
    if (typeof window === 'undefined') return {};

    const win = window as unknown as { dataLayer?: unknown[] };
    if (!win.dataLayer) return {};

    // Find the most recent consent command
    const consentState: GoogleConsentState = {};

    for (const item of win.dataLayer) {
      if (this.isConsentCommand(item)) {
        const cmd = item as ['consent', string, GoogleConsentState];
        Object.assign(consentState, cmd[2]);
      }
    }

    return consentState;
  }

  private isConsentCommand(item: unknown): boolean {
    return (
      Array.isArray(item) &&
      item[0] === 'consent' &&
      (item[1] === 'default' || item[1] === 'update')
    );
  }

  private isConsentUpdate(item: unknown): boolean {
    return Array.isArray(item) && item[0] === 'consent' && item[1] === 'update';
  }
}

/**
 * OneTrust Adapter
 * Detects consent from OneTrust OptanonConsent cookie
 */
class OneTrustAdapter implements CMPAdapter {
  name = 'OneTrust';
  private callbacks: ConsentChangeCallback[] = [];

  isPresent(): boolean {
    if (typeof window === 'undefined') return false;

    // Check for OneTrust global or cookie
    const win = window as unknown as { OneTrust?: unknown; OptanonActiveGroups?: string };
    return !!(win.OneTrust || win.OptanonActiveGroups || this.getOptanonCookie());
  }

  getConsent(): ConsentState {
    const activeGroups = this.getActiveGroups();

    // OneTrust group mappings (common defaults):
    // C0001 = Strictly Necessary
    // C0002 = Performance/Analytics
    // C0003 = Functional
    // C0004 = Targeting/Advertising
    return {
      analytics: activeGroups.includes('C0002'),
      marketing: activeGroups.includes('C0004'),
    };
  }

  onConsentChange(callback: ConsentChangeCallback): void {
    this.callbacks.push(callback);

    if (typeof window === 'undefined') return;

    const win = window as unknown as { OneTrust?: { OnConsentChanged?: (cb: () => void) => void } };

    // Use OneTrust's callback if available
    if (win.OneTrust?.OnConsentChanged) {
      win.OneTrust.OnConsentChanged(() => {
        const consent = this.getConsent();
        this.callbacks.forEach((cb) => cb(consent));
      });
    }
  }

  private getActiveGroups(): string {
    if (typeof window === 'undefined') return '';

    const win = window as unknown as { OptanonActiveGroups?: string };

    // First check the global variable
    if (win.OptanonActiveGroups) {
      return win.OptanonActiveGroups;
    }

    // Fallback to cookie
    return this.getOptanonCookie() || '';
  }

  private getOptanonCookie(): string | null {
    if (typeof document === 'undefined') return null;
    if (typeof document.cookie !== 'string') return null;

    const match = document.cookie.match(/OptanonConsent=([^;]+)/);
    if (!match) return null;

    try {
      const decoded = decodeURIComponent(match[1]);
      const groupsMatch = decoded.match(/groups=([^&]+)/);
      return groupsMatch ? groupsMatch[1] : null;
    } catch {
      return null;
    }
  }
}

/**
 * Cookiebot Adapter
 * Detects consent from Cookiebot CookieConsent object
 */
class CookiebotAdapter implements CMPAdapter {
  name = 'Cookiebot';
  private callbacks: ConsentChangeCallback[] = [];

  isPresent(): boolean {
    if (typeof window === 'undefined') return false;

    const win = window as unknown as { Cookiebot?: unknown; CookieConsent?: unknown };
    return !!(win.Cookiebot || win.CookieConsent);
  }

  getConsent(): ConsentState {
    const cookieConsent = this.getCookieConsent();

    return {
      analytics: cookieConsent?.statistics ?? false,
      marketing: cookieConsent?.marketing ?? false,
    };
  }

  onConsentChange(callback: ConsentChangeCallback): void {
    this.callbacks.push(callback);

    if (typeof window === 'undefined') return;

    // Listen for Cookiebot consent events
    window.addEventListener('CookiebotOnAccept', () => {
      const consent = this.getConsent();
      this.callbacks.forEach((cb) => cb(consent));
    });

    window.addEventListener('CookiebotOnDecline', () => {
      const consent = this.getConsent();
      this.callbacks.forEach((cb) => cb(consent));
    });
  }

  private getCookieConsent(): { statistics?: boolean; marketing?: boolean } | null {
    if (typeof window === 'undefined') return null;

    const win = window as unknown as {
      Cookiebot?: { consent?: { statistics?: boolean; marketing?: boolean } };
      CookieConsent?: { statistics?: boolean; marketing?: boolean };
    };

    return win.Cookiebot?.consent || win.CookieConsent || null;
  }
}

// Export singleton instance
export const consentManager = new ConsentManager();

// Export classes for testing
export { ConsentManager, GoogleConsentModeAdapter, OneTrustAdapter, CookiebotAdapter };
