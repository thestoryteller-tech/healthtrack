import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  ConsentManager,
  GoogleConsentModeAdapter,
  OneTrustAdapter,
  CookiebotAdapter,
  CMPAdapter,
  ConsentState,
} from '../consent';

describe('ConsentManager', () => {
  let manager: ConsentManager;

  beforeEach(() => {
    manager = new ConsentManager();
    vi.stubGlobal('window', {});
    vi.stubGlobal('document', { cookie: '' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('default behavior', () => {
    it('should default to consent granted when no CMP detected', () => {
      manager.init();
      const consent = manager.getConsent();

      expect(consent.analytics).toBe(true);
      expect(consent.marketing).toBe(true);
    });

    it('should allow manual consent override', () => {
      manager.init();
      manager.setConsent({ analytics: false, marketing: false });

      const consent = manager.getConsent();
      expect(consent.analytics).toBe(false);
      expect(consent.marketing).toBe(false);
    });

    it('should support partial consent updates', () => {
      manager.init();
      manager.setConsent({ analytics: false });

      const consent = manager.getConsent();
      expect(consent.analytics).toBe(false);
      expect(consent.marketing).toBe(true);
    });
  });

  describe('consent change callbacks', () => {
    it('should notify callbacks on manual consent change', () => {
      const callback = vi.fn();
      manager.init();
      manager.onConsentChange(callback);

      manager.setConsent({ analytics: false });

      expect(callback).toHaveBeenCalledWith({ analytics: false, marketing: true });
    });

    it('should support multiple callbacks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      manager.init();
      manager.onConsentChange(callback1);
      manager.onConsentChange(callback2);

      manager.setConsent({ marketing: false });

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('custom adapter registration', () => {
    it('should allow registering custom adapters', () => {
      const customAdapter: CMPAdapter = {
        name: 'Custom CMP',
        isPresent: () => true,
        getConsent: () => ({ analytics: false, marketing: true }),
        onConsentChange: vi.fn(),
      };

      manager.registerAdapter(customAdapter);
      manager.init();

      const consent = manager.getConsent();
      expect(consent.analytics).toBe(false);
      expect(consent.marketing).toBe(true);
    });

    it('should prioritize custom adapters', () => {
      // First stub window with dataLayer (would trigger Google adapter)
      vi.stubGlobal('window', {
        dataLayer: [['consent', 'default', { analytics_storage: 'granted' }]],
      });

      const customAdapter: CMPAdapter = {
        name: 'Priority CMP',
        isPresent: () => true,
        getConsent: () => ({ analytics: false, marketing: false }),
        onConsentChange: vi.fn(),
      };

      manager.registerAdapter(customAdapter);
      manager.init();

      const consent = manager.getConsent();
      // Custom adapter should take precedence
      expect(consent.analytics).toBe(false);
      expect(consent.marketing).toBe(false);
    });
  });

  describe('helper methods', () => {
    it('should check hasAnyConsent correctly', () => {
      manager.init();

      expect(manager.hasAnyConsent()).toBe(true);

      manager.setConsent({ analytics: false, marketing: false });
      expect(manager.hasAnyConsent()).toBe(false);

      manager.setConsent({ analytics: true, marketing: false });
      expect(manager.hasAnyConsent()).toBe(true);
    });

    it('should check hasAnalyticsConsent correctly', () => {
      manager.init();
      expect(manager.hasAnalyticsConsent()).toBe(true);

      manager.setConsent({ analytics: false });
      expect(manager.hasAnalyticsConsent()).toBe(false);
    });

    it('should check hasMarketingConsent correctly', () => {
      manager.init();
      expect(manager.hasMarketingConsent()).toBe(true);

      manager.setConsent({ marketing: false });
      expect(manager.hasMarketingConsent()).toBe(false);
    });
  });
});

describe('GoogleConsentModeAdapter', () => {
  let adapter: GoogleConsentModeAdapter;

  beforeEach(() => {
    adapter = new GoogleConsentModeAdapter();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('isPresent', () => {
    it('should detect when dataLayer exists', () => {
      vi.stubGlobal('window', { dataLayer: [] });
      expect(adapter.isPresent()).toBe(true);
    });

    it('should return false when dataLayer missing', () => {
      vi.stubGlobal('window', {});
      expect(adapter.isPresent()).toBe(false);
    });

    it('should return false when window undefined', () => {
      vi.stubGlobal('window', undefined);
      expect(adapter.isPresent()).toBe(false);
    });
  });

  describe('getConsent', () => {
    it('should parse granted analytics consent', () => {
      vi.stubGlobal('window', {
        dataLayer: [['consent', 'default', { analytics_storage: 'granted' }]],
      });

      const consent = adapter.getConsent();
      expect(consent.analytics).toBe(true);
    });

    it('should parse denied analytics consent', () => {
      vi.stubGlobal('window', {
        dataLayer: [['consent', 'default', { analytics_storage: 'denied' }]],
      });

      const consent = adapter.getConsent();
      expect(consent.analytics).toBe(false);
    });

    it('should parse marketing consent from ad_storage', () => {
      vi.stubGlobal('window', {
        dataLayer: [['consent', 'default', { ad_storage: 'granted' }]],
      });

      const consent = adapter.getConsent();
      expect(consent.marketing).toBe(true);
    });

    it('should parse marketing consent from ad_user_data', () => {
      vi.stubGlobal('window', {
        dataLayer: [['consent', 'default', { ad_user_data: 'granted' }]],
      });

      const consent = adapter.getConsent();
      expect(consent.marketing).toBe(true);
    });

    it('should use most recent consent update', () => {
      vi.stubGlobal('window', {
        dataLayer: [
          ['consent', 'default', { analytics_storage: 'denied' }],
          ['consent', 'update', { analytics_storage: 'granted' }],
        ],
      });

      const consent = adapter.getConsent();
      expect(consent.analytics).toBe(true);
    });

    it('should default to denied when no consent set', () => {
      vi.stubGlobal('window', { dataLayer: [] });

      const consent = adapter.getConsent();
      expect(consent.analytics).toBe(false);
      expect(consent.marketing).toBe(false);
    });
  });

  describe('onConsentChange', () => {
    it('should call callback when consent updated via dataLayer', () => {
      const dataLayer: unknown[] = [['consent', 'default', { analytics_storage: 'denied' }]];

      vi.stubGlobal('window', { dataLayer });

      const callback = vi.fn();
      adapter.onConsentChange(callback);

      // Simulate consent update
      dataLayer.push(['consent', 'update', { analytics_storage: 'granted' }]);

      expect(callback).toHaveBeenCalled();
    });
  });
});

describe('OneTrustAdapter', () => {
  let adapter: OneTrustAdapter;

  beforeEach(() => {
    adapter = new OneTrustAdapter();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('isPresent', () => {
    it('should detect OneTrust global', () => {
      vi.stubGlobal('window', { OneTrust: {} });
      expect(adapter.isPresent()).toBe(true);
    });

    it('should detect OptanonActiveGroups', () => {
      vi.stubGlobal('window', { OptanonActiveGroups: 'C0001,C0002' });
      expect(adapter.isPresent()).toBe(true);
    });

    it('should detect OptanonConsent cookie', () => {
      vi.stubGlobal('window', {});
      vi.stubGlobal('document', { cookie: 'OptanonConsent=groups=C0001%3A1%2CC0002%3A1' });
      expect(adapter.isPresent()).toBe(true);
    });

    it('should return false when nothing present', () => {
      vi.stubGlobal('window', {});
      vi.stubGlobal('document', { cookie: '' });
      expect(adapter.isPresent()).toBe(false);
    });
  });

  describe('getConsent', () => {
    it('should detect analytics consent (C0002)', () => {
      vi.stubGlobal('window', { OptanonActiveGroups: ',C0001,C0002,' });
      vi.stubGlobal('document', { cookie: '' });

      const consent = adapter.getConsent();
      expect(consent.analytics).toBe(true);
    });

    it('should detect marketing consent (C0004)', () => {
      vi.stubGlobal('window', { OptanonActiveGroups: ',C0001,C0004,' });
      vi.stubGlobal('document', { cookie: '' });

      const consent = adapter.getConsent();
      expect(consent.marketing).toBe(true);
    });

    it('should return false when groups not included', () => {
      vi.stubGlobal('window', { OptanonActiveGroups: ',C0001,' });
      vi.stubGlobal('document', { cookie: '' });

      const consent = adapter.getConsent();
      expect(consent.analytics).toBe(false);
      expect(consent.marketing).toBe(false);
    });
  });
});

describe('CookiebotAdapter', () => {
  let adapter: CookiebotAdapter;

  beforeEach(() => {
    adapter = new CookiebotAdapter();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('isPresent', () => {
    it('should detect Cookiebot global', () => {
      vi.stubGlobal('window', { Cookiebot: {} });
      expect(adapter.isPresent()).toBe(true);
    });

    it('should detect CookieConsent global', () => {
      vi.stubGlobal('window', { CookieConsent: {} });
      expect(adapter.isPresent()).toBe(true);
    });

    it('should return false when nothing present', () => {
      vi.stubGlobal('window', {});
      expect(adapter.isPresent()).toBe(false);
    });
  });

  describe('getConsent', () => {
    it('should get consent from Cookiebot.consent', () => {
      vi.stubGlobal('window', {
        Cookiebot: {
          consent: { statistics: true, marketing: true },
        },
      });

      const consent = adapter.getConsent();
      expect(consent.analytics).toBe(true);
      expect(consent.marketing).toBe(true);
    });

    it('should get consent from CookieConsent', () => {
      vi.stubGlobal('window', {
        CookieConsent: { statistics: false, marketing: true },
      });

      const consent = adapter.getConsent();
      expect(consent.analytics).toBe(false);
      expect(consent.marketing).toBe(true);
    });

    it('should default to false when no consent data', () => {
      vi.stubGlobal('window', { Cookiebot: {} });

      const consent = adapter.getConsent();
      expect(consent.analytics).toBe(false);
      expect(consent.marketing).toBe(false);
    });
  });

  describe('onConsentChange', () => {
    it('should listen for CookiebotOnAccept event', () => {
      const addEventListener = vi.fn();
      vi.stubGlobal('window', { addEventListener });

      adapter.onConsentChange(vi.fn());

      expect(addEventListener).toHaveBeenCalledWith('CookiebotOnAccept', expect.any(Function));
      expect(addEventListener).toHaveBeenCalledWith('CookiebotOnDecline', expect.any(Function));
    });
  });
});
