"use strict";
var HealthTrackModule = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var __async = (__this, __arguments, generator) => {
    return new Promise((resolve, reject) => {
      var fulfilled = (value) => {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      };
      var rejected = (value) => {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      };
      var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
      step((generator = generator.apply(__this, __arguments)).next());
    });
  };

  // src/sdk/src/index.ts
  var index_exports = {};
  __export(index_exports, {
    HealthTrack: () => HealthTrack,
    HealthTrackSDK: () => HealthTrackSDK,
    consentManager: () => consentManager,
    phiDetector: () => phiDetector
  });

  // src/sdk/src/phi-detector.ts
  var EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  var PHONE_PATTERN = /(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g;
  var SSN_PATTERN = /\d{3}[-\s]?\d{2}[-\s]?\d{4}/g;
  var DATE_OF_BIRTH_PATTERN = /\b(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])[\/\-](19|20)\d{2}\b/g;
  var PHI_FIELD_NAMES = [
    "email",
    "e-mail",
    "mail",
    "phone",
    "telephone",
    "tel",
    "mobile",
    "cell",
    "name",
    "firstName",
    "first_name",
    "lastname",
    "lastName",
    "last_name",
    "fullName",
    "full_name",
    "patientName",
    "patient_name",
    "patient",
    "ssn",
    "socialSecurity",
    "social_security",
    "dob",
    "dateOfBirth",
    "date_of_birth",
    "birthDate",
    "birth_date",
    "birthday",
    "address",
    "street",
    "city",
    "state",
    "zip",
    "zipCode",
    "zip_code",
    "postalCode",
    "postal_code",
    "medicalRecord",
    "medical_record",
    "mrn",
    "diagnosis",
    "condition",
    "treatment",
    "prescription",
    "insurance",
    "insuranceId",
    "insurance_id",
    "memberId",
    "member_id",
    "policyNumber",
    "policy_number"
  ];
  var SENSITIVE_URL_PARAMS = [
    "email",
    "name",
    "phone",
    "patient",
    "ssn",
    "dob",
    "firstName",
    "lastName",
    "first_name",
    "last_name",
    "gclid",
    "fbclid",
    "msclkid",
    "ttclid",
    "li_fat_id",
    "wbraid",
    "gbraid"
  ];
  var PHIDetector = class {
    constructor() {
      this.debugMode = false;
      this.sensitivePagePatterns = [];
    }
    /**
     * Enable debug mode for console warnings
     */
    setDebugMode(enabled) {
      this.debugMode = enabled;
    }
    /**
     * Configure sensitive URL patterns
     */
    configureSensitivePages(patterns) {
      this.sensitivePagePatterns = patterns;
    }
    /**
     * Add a sensitive page pattern
     */
    addSensitivePagePattern(pattern, action = "strip") {
      this.sensitivePagePatterns.push({ pattern, action });
    }
    /**
     * Check if current URL is on a sensitive page
     */
    isSensitivePage(url) {
      for (const { pattern, action } of this.sensitivePagePatterns) {
        const regex = typeof pattern === "string" ? new RegExp(pattern, "i") : pattern;
        if (regex.test(url)) {
          return { isSensitive: true, action };
        }
      }
      return { isSensitive: false, action: null };
    }
    /**
     * Detect PHI in a value
     */
    detectPHIInValue(value) {
      if (typeof value !== "string") return { hasPHI: false, type: null };
      if (EMAIL_PATTERN.test(value)) {
        EMAIL_PATTERN.lastIndex = 0;
        return { hasPHI: true, type: "email" };
      }
      if (PHONE_PATTERN.test(value)) {
        PHONE_PATTERN.lastIndex = 0;
        return { hasPHI: true, type: "phone" };
      }
      if (SSN_PATTERN.test(value)) {
        SSN_PATTERN.lastIndex = 0;
        return { hasPHI: true, type: "ssn" };
      }
      if (DATE_OF_BIRTH_PATTERN.test(value)) {
        DATE_OF_BIRTH_PATTERN.lastIndex = 0;
        return { hasPHI: true, type: "dob" };
      }
      return { hasPHI: false, type: null };
    }
    /**
     * Check if a field name is likely to contain PHI
     */
    isPHIFieldName(fieldName) {
      const lowerName = fieldName.toLowerCase();
      return PHI_FIELD_NAMES.some((phiField) => lowerName.includes(phiField.toLowerCase()));
    }
    /**
     * Scrub PHI from an object
     */
    scrubObject(data, path = "") {
      const detectedFields = [];
      const scrubbedData = {};
      for (const [key, value] of Object.entries(data)) {
        const fieldPath = path ? `${path}.${key}` : key;
        if (this.isPHIFieldName(key)) {
          detectedFields.push(fieldPath);
          this.warn(`PHI field detected: ${fieldPath}`);
          scrubbedData[key] = "[REDACTED]";
          continue;
        }
        if (typeof value === "string") {
          const { hasPHI, type } = this.detectPHIInValue(value);
          if (hasPHI) {
            detectedFields.push(`${fieldPath} (${type})`);
            this.warn(`PHI pattern detected in ${fieldPath}: ${type}`);
            scrubbedData[key] = "[REDACTED]";
            continue;
          }
        }
        if (value && typeof value === "object" && !Array.isArray(value)) {
          const nestedResult = this.scrubObject(value, fieldPath);
          scrubbedData[key] = nestedResult.scrubbedData;
          detectedFields.push(...nestedResult.detectedFields);
          continue;
        }
        if (Array.isArray(value)) {
          scrubbedData[key] = value.map((item, index) => {
            if (item && typeof item === "object") {
              const nestedResult = this.scrubObject(
                item,
                `${fieldPath}[${index}]`
              );
              detectedFields.push(...nestedResult.detectedFields);
              return nestedResult.scrubbedData;
            }
            return item;
          });
          continue;
        }
        scrubbedData[key] = value;
      }
      return {
        hasPHI: detectedFields.length > 0,
        detectedFields,
        scrubbedData
      };
    }
    /**
     * Scrub URL of sensitive parameters
     */
    scrubUrl(url) {
      if (!url) return "";
      try {
        const parsed = new URL(url);
        for (const param of SENSITIVE_URL_PARAMS) {
          parsed.searchParams.delete(param);
        }
        for (const [key, value] of parsed.searchParams.entries()) {
          const { hasPHI } = this.detectPHIInValue(value);
          if (hasPHI) {
            this.warn(`PHI detected in URL param: ${key}`);
            parsed.searchParams.delete(key);
          }
        }
        return parsed.toString();
      } catch (e) {
        return url;
      }
    }
    /**
     * Strip ad click IDs from URL (gclid, fbclid, etc.)
     */
    stripClickIds(url) {
      if (!url) return "";
      try {
        const parsed = new URL(url);
        const clickIdParams = ["gclid", "fbclid", "msclkid", "ttclid", "li_fat_id", "wbraid", "gbraid"];
        for (const param of clickIdParams) {
          parsed.searchParams.delete(param);
        }
        return parsed.toString();
      } catch (e) {
        return url;
      }
    }
    /**
     * Get default sensitive page patterns for healthcare
     */
    getDefaultHealthcarePatterns() {
      return [
        { pattern: /intake[-_]?form/i, action: "block" },
        { pattern: /appointment/i, action: "strip" },
        { pattern: /patient[-_]?portal/i, action: "block" },
        { pattern: /medical[-_]?record/i, action: "block" },
        { pattern: /prescription/i, action: "block" },
        { pattern: /health[-_]?history/i, action: "block" },
        { pattern: /symptom/i, action: "strip" },
        { pattern: /diagnosis/i, action: "block" },
        { pattern: /treatment/i, action: "strip" },
        { pattern: /insurance/i, action: "strip" },
        { pattern: /billing/i, action: "strip" },
        { pattern: /contact[-_]?us/i, action: "strip" }
      ];
    }
    warn(message) {
      if (this.debugMode) {
        console.warn(`[HealthTrack PHI] ${message}`);
      }
    }
  };
  var phiDetector = new PHIDetector();

  // src/sdk/src/consent.ts
  var ConsentManager = class {
    constructor() {
      this.adapters = [];
      this.activeAdapter = null;
      this.manualConsent = null;
      this.callbacks = [];
      this.debugMode = false;
      this.adapters = [
        new GoogleConsentModeAdapter(),
        new OneTrustAdapter(),
        new CookiebotAdapter()
      ];
    }
    /**
     * Enable debug mode
     */
    setDebugMode(enabled) {
      this.debugMode = enabled;
    }
    /**
     * Initialize consent detection
     */
    init() {
      for (const adapter of this.adapters) {
        if (adapter.isPresent()) {
          this.activeAdapter = adapter;
          this.log("info", `CMP detected: ${adapter.name}`);
          adapter.onConsentChange((consent) => {
            this.notifyCallbacks(consent);
          });
          break;
        }
      }
      if (!this.activeAdapter) {
        this.log("info", "No CMP detected, using default consent");
      }
    }
    /**
     * Register a custom CMP adapter
     */
    registerAdapter(adapter) {
      this.adapters.unshift(adapter);
      this.log("info", `Custom CMP adapter registered: ${adapter.name}`);
    }
    /**
     * Manually set consent state (overrides CMP)
     */
    setConsent(consent) {
      var _a, _b;
      this.manualConsent = {
        analytics: (_a = consent.analytics) != null ? _a : true,
        marketing: (_b = consent.marketing) != null ? _b : true
      };
      this.log("info", "Manual consent set", this.manualConsent);
      this.notifyCallbacks(this.manualConsent);
    }
    /**
     * Get current consent state
     */
    getConsent() {
      if (this.manualConsent) {
        return __spreadValues({}, this.manualConsent);
      }
      if (this.activeAdapter) {
        return this.activeAdapter.getConsent();
      }
      return { analytics: true, marketing: true };
    }
    /**
     * Subscribe to consent changes
     */
    onConsentChange(callback) {
      this.callbacks.push(callback);
    }
    /**
     * Check if any consent is granted
     */
    hasAnyConsent() {
      const consent = this.getConsent();
      return consent.analytics || consent.marketing;
    }
    /**
     * Check if analytics consent is granted
     */
    hasAnalyticsConsent() {
      return this.getConsent().analytics;
    }
    /**
     * Check if marketing consent is granted
     */
    hasMarketingConsent() {
      return this.getConsent().marketing;
    }
    notifyCallbacks(consent) {
      for (const callback of this.callbacks) {
        try {
          callback(consent);
        } catch (error) {
          this.log("error", "Consent callback error", error);
        }
      }
    }
    log(level, message, data) {
      if (!this.debugMode) return;
      const prefix = "[HealthTrack Consent]";
      switch (level) {
        case "info":
          console.log(prefix, message, data || "");
          break;
        case "warn":
          console.warn(prefix, message, data || "");
          break;
        case "error":
          console.error(prefix, message, data || "");
          break;
      }
    }
  };
  var GoogleConsentModeAdapter = class {
    constructor() {
      this.name = "Google Consent Mode v2";
      this.callbacks = [];
    }
    isPresent() {
      if (typeof window === "undefined") return false;
      const win = window;
      return Array.isArray(win.dataLayer);
    }
    getConsent() {
      const googleConsent = this.getGoogleConsentState();
      return {
        analytics: googleConsent.analytics_storage === "granted",
        marketing: googleConsent.ad_storage === "granted" || googleConsent.ad_user_data === "granted"
      };
    }
    onConsentChange(callback) {
      this.callbacks.push(callback);
      if (typeof window === "undefined") return;
      const win = window;
      if (!win.dataLayer) return;
      const originalPush = win.dataLayer.push.bind(win.dataLayer);
      win.dataLayer.push = (...args) => {
        const result = originalPush(...args);
        for (const arg of args) {
          if (this.isConsentUpdate(arg)) {
            const consent = this.getConsent();
            this.callbacks.forEach((cb) => cb(consent));
          }
        }
        return result;
      };
    }
    getGoogleConsentState() {
      if (typeof window === "undefined") return {};
      const win = window;
      if (!win.dataLayer) return {};
      const consentState = {};
      for (const item of win.dataLayer) {
        if (this.isConsentCommand(item)) {
          const cmd = item;
          Object.assign(consentState, cmd[2]);
        }
      }
      return consentState;
    }
    isConsentCommand(item) {
      return Array.isArray(item) && item[0] === "consent" && (item[1] === "default" || item[1] === "update");
    }
    isConsentUpdate(item) {
      return Array.isArray(item) && item[0] === "consent" && item[1] === "update";
    }
  };
  var OneTrustAdapter = class {
    constructor() {
      this.name = "OneTrust";
      this.callbacks = [];
    }
    isPresent() {
      if (typeof window === "undefined") return false;
      const win = window;
      return !!(win.OneTrust || win.OptanonActiveGroups || this.getOptanonCookie());
    }
    getConsent() {
      const activeGroups = this.getActiveGroups();
      return {
        analytics: activeGroups.includes("C0002"),
        marketing: activeGroups.includes("C0004")
      };
    }
    onConsentChange(callback) {
      var _a;
      this.callbacks.push(callback);
      if (typeof window === "undefined") return;
      const win = window;
      if ((_a = win.OneTrust) == null ? void 0 : _a.OnConsentChanged) {
        win.OneTrust.OnConsentChanged(() => {
          const consent = this.getConsent();
          this.callbacks.forEach((cb) => cb(consent));
        });
      }
    }
    getActiveGroups() {
      if (typeof window === "undefined") return "";
      const win = window;
      if (win.OptanonActiveGroups) {
        return win.OptanonActiveGroups;
      }
      return this.getOptanonCookie() || "";
    }
    getOptanonCookie() {
      if (typeof document === "undefined") return null;
      if (typeof document.cookie !== "string") return null;
      const match = document.cookie.match(/OptanonConsent=([^;]+)/);
      if (!match) return null;
      try {
        const decoded = decodeURIComponent(match[1]);
        const groupsMatch = decoded.match(/groups=([^&]+)/);
        return groupsMatch ? groupsMatch[1] : null;
      } catch (e) {
        return null;
      }
    }
  };
  var CookiebotAdapter = class {
    constructor() {
      this.name = "Cookiebot";
      this.callbacks = [];
    }
    isPresent() {
      if (typeof window === "undefined") return false;
      const win = window;
      return !!(win.Cookiebot || win.CookieConsent);
    }
    getConsent() {
      var _a, _b;
      const cookieConsent = this.getCookieConsent();
      return {
        analytics: (_a = cookieConsent == null ? void 0 : cookieConsent.statistics) != null ? _a : false,
        marketing: (_b = cookieConsent == null ? void 0 : cookieConsent.marketing) != null ? _b : false
      };
    }
    onConsentChange(callback) {
      this.callbacks.push(callback);
      if (typeof window === "undefined") return;
      window.addEventListener("CookiebotOnAccept", () => {
        const consent = this.getConsent();
        this.callbacks.forEach((cb) => cb(consent));
      });
      window.addEventListener("CookiebotOnDecline", () => {
        const consent = this.getConsent();
        this.callbacks.forEach((cb) => cb(consent));
      });
    }
    getCookieConsent() {
      var _a;
      if (typeof window === "undefined") return null;
      const win = window;
      return ((_a = win.Cookiebot) == null ? void 0 : _a.consent) || win.CookieConsent || null;
    }
  };
  var consentManager = new ConsentManager();

  // src/sdk/src/index.ts
  var HealthTrackSDK = class {
    constructor() {
      this.config = null;
      this.eventQueue = [];
      this.pendingQueue = [];
      // Events waiting for consent
      this.sessionId = "";
      this.initialized = false;
      this.batchTimer = null;
      this.SDK_VERSION = "1.0.0";
      this.DEFAULT_SERVER_URL = "/api/v1/events";
      this.DEFAULT_BATCH_SIZE = 10;
      this.DEFAULT_BATCH_INTERVAL = 5e3;
    }
    // 5 seconds
    /**
     * Initialize the SDK with configuration
     */
    init(config) {
      if (this.initialized) {
        this.log("warn", "HealthTrack already initialized");
        return;
      }
      if (!config.apiKey) {
        this.log("error", "API key is required");
        return;
      }
      this.config = __spreadProps(__spreadValues({}, config), {
        serverUrl: config.serverUrl || this.DEFAULT_SERVER_URL,
        batchSize: config.batchSize || this.DEFAULT_BATCH_SIZE,
        batchInterval: config.batchInterval || this.DEFAULT_BATCH_INTERVAL
      });
      phiDetector.setDebugMode(config.debug || false);
      consentManager.setDebugMode(config.debug || false);
      consentManager.init();
      consentManager.onConsentChange((consent) => {
        this.log("info", "Consent changed", consent);
        if (consent.analytics || consent.marketing) {
          this.flushPendingEvents();
        }
      });
      this.sessionId = this.getOrCreateSessionId();
      this.initialized = true;
      this.startBatchTimer();
      this.setupUnloadHandler();
      this.trackPageView();
      this.log("info", "HealthTrack initialized", { sessionId: this.sessionId });
    }
    /**
     * Configure sensitive URL patterns
     */
    configureSensitivePages(patterns) {
      phiDetector.configureSensitivePages(patterns);
      this.log("info", "Sensitive page patterns configured", { count: patterns.length });
    }
    /**
     * Add a sensitive page pattern
     */
    addSensitivePagePattern(pattern, action = "strip") {
      phiDetector.addSensitivePagePattern(pattern, action);
      this.log("info", "Sensitive page pattern added", { pattern: pattern.toString(), action });
    }
    /**
     * Load default healthcare sensitive page patterns
     */
    loadDefaultHealthcarePatterns() {
      const defaults = phiDetector.getDefaultHealthcarePatterns();
      phiDetector.configureSensitivePages(defaults);
      this.log("info", "Default healthcare patterns loaded", { count: defaults.length });
    }
    /**
     * Track a page view
     */
    trackPageView(properties) {
      if (!this.checkInitialized()) return;
      const { isSensitive, action } = phiDetector.isSensitivePage(window.location.href);
      if (isSensitive && action === "block") {
        this.log("info", "Page view blocked - sensitive page");
        return;
      }
      const event = this.createEvent("page_view", "page_view", properties);
      this.queueEvent(event);
    }
    /**
     * Track a custom event
     */
    trackEvent(eventName, properties) {
      if (!this.checkInitialized()) return;
      const event = this.createEvent("custom_event", eventName, properties);
      this.queueEvent(event);
    }
    /**
     * Track a conversion event
     */
    trackConversion(conversionName, value, properties) {
      if (!this.checkInitialized()) return;
      const event = this.createEvent("conversion", conversionName, __spreadProps(__spreadValues({}, properties), {
        conversion_value: value
      }));
      this.queueEvent(event);
    }
    /**
     * Set an anonymous user identifier (will be hashed)
     */
    identify(userId) {
      if (!this.checkInitialized()) return;
      const hashedId = this.hashString(userId);
      this.sessionId = hashedId;
      try {
        sessionStorage.setItem("ht_user_id", hashedId);
      } catch (e) {
      }
      this.log("info", "User identified", { hashedId: hashedId.substring(0, 8) + "..." });
    }
    /**
     * Set consent state for tracking (manual override)
     */
    setConsent(consent) {
      consentManager.setConsent(consent);
      this.log("info", "Consent updated", consent);
      if (consent.analytics || consent.marketing) {
        this.flushPendingEvents();
        this.flushEvents();
      }
    }
    /**
     * Get current consent state
     */
    getConsent() {
      return consentManager.getConsent();
    }
    /**
     * Register a custom CMP adapter
     */
    registerCMPAdapter(adapter) {
      consentManager.registerAdapter(adapter);
      this.log("info", "Custom CMP adapter registered", { name: adapter.name });
    }
    /**
     * Manually flush queued events
     */
    flush() {
      return this.flushEvents();
    }
    // Private methods
    checkInitialized() {
      if (!this.initialized) {
        this.log("warn", "HealthTrack not initialized. Call HealthTrack.init() first.");
        return false;
      }
      return true;
    }
    createEvent(eventType, eventName, properties) {
      let scrubbedProperties = properties || {};
      let phiScrubbed = [];
      if (properties && Object.keys(properties).length > 0) {
        const result = phiDetector.scrubObject(properties);
        scrubbedProperties = result.scrubbedData;
        phiScrubbed = result.detectedFields;
      }
      const { isSensitive } = phiDetector.isSensitivePage(window.location.href);
      let pageUrl = phiDetector.scrubUrl(window.location.href);
      let referrer = phiDetector.scrubUrl(document.referrer);
      if (isSensitive) {
        pageUrl = phiDetector.stripClickIds(pageUrl);
        referrer = phiDetector.stripClickIds(referrer);
      }
      const event = {
        event_type: eventType,
        event_name: eventName,
        properties: scrubbedProperties,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        anonymized_session_id: this.sessionId,
        page_url: pageUrl,
        referrer,
        sdk_version: this.SDK_VERSION
      };
      if (phiScrubbed.length > 0) {
        event.phi_scrubbed = phiScrubbed;
      }
      return event;
    }
    queueEvent(event) {
      var _a;
      const consent = consentManager.getConsent();
      if (!consent.analytics && !consent.marketing) {
        this.pendingQueue.push(event);
        this.log("info", "Event queued pending consent", {
          type: event.event_type,
          name: event.event_name
        });
        return;
      }
      this.eventQueue.push(event);
      this.log("info", "Event queued", { type: event.event_type, name: event.event_name });
      if (this.eventQueue.length >= (((_a = this.config) == null ? void 0 : _a.batchSize) || this.DEFAULT_BATCH_SIZE)) {
        this.flushEvents();
      }
    }
    flushPendingEvents() {
      var _a;
      if (this.pendingQueue.length === 0) return;
      this.log("info", "Flushing pending events", { count: this.pendingQueue.length });
      this.eventQueue.push(...this.pendingQueue);
      this.pendingQueue = [];
      if (this.eventQueue.length >= (((_a = this.config) == null ? void 0 : _a.batchSize) || this.DEFAULT_BATCH_SIZE)) {
        this.flushEvents();
      }
    }
    flushEvents() {
      return __async(this, null, function* () {
        if (this.eventQueue.length === 0 || !this.config) return;
        const events = [...this.eventQueue];
        this.eventQueue = [];
        try {
          const response = yield fetch(this.config.serverUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              apiKey: this.config.apiKey,
              events,
              consent: consentManager.getConsent()
            })
          });
          if (!response.ok) {
            this.eventQueue = [...events, ...this.eventQueue];
            this.log("error", "Failed to send events", { status: response.status });
          } else {
            this.log("info", "Events sent successfully", { count: events.length });
          }
        } catch (error) {
          this.eventQueue = [...events, ...this.eventQueue];
          this.log("error", "Error sending events", { error });
        }
      });
    }
    startBatchTimer() {
      var _a;
      if (this.batchTimer) return;
      this.batchTimer = setInterval(() => {
        this.flushEvents();
      }, ((_a = this.config) == null ? void 0 : _a.batchInterval) || this.DEFAULT_BATCH_INTERVAL);
    }
    setupUnloadHandler() {
      const handleUnload = () => {
        if (this.eventQueue.length === 0 || !this.config) return;
        const data = JSON.stringify({
          apiKey: this.config.apiKey,
          events: this.eventQueue,
          consent: consentManager.getConsent()
        });
        try {
          navigator.sendBeacon(this.config.serverUrl, data);
          this.log("info", "Events sent via beacon", { count: this.eventQueue.length });
        } catch (e) {
          this.log("warn", "Beacon failed, events may be lost");
        }
      };
      window.addEventListener("beforeunload", handleUnload);
      window.addEventListener("pagehide", handleUnload);
    }
    getOrCreateSessionId() {
      try {
        const storedUserId = sessionStorage.getItem("ht_user_id");
        if (storedUserId) return storedUserId;
        const storedSessionId = sessionStorage.getItem("ht_session_id");
        if (storedSessionId) return storedSessionId;
        const newSessionId = this.generateSessionId();
        sessionStorage.setItem("ht_session_id", newSessionId);
        return newSessionId;
      } catch (e) {
        return this.generateSessionId();
      }
    }
    generateSessionId() {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
    }
    hashString(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      return "user_" + Math.abs(hash).toString(16);
    }
    log(level, message, data) {
      var _a;
      if (!((_a = this.config) == null ? void 0 : _a.debug)) return;
      const prefix = "[HealthTrack]";
      switch (level) {
        case "info":
          console.log(prefix, message, data || "");
          break;
        case "warn":
          console.warn(prefix, message, data || "");
          break;
        case "error":
          console.error(prefix, message, data || "");
          break;
      }
    }
  };
  var HealthTrack = new HealthTrackSDK();
  if (typeof window !== "undefined") {
    window.HealthTrack = HealthTrack;
  }
  return __toCommonJS(index_exports);
})();
