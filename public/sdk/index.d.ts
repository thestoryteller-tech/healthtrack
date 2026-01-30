import { phiDetector } from "./phi-detector";
import { consentManager } from "./consent";
class HealthTrackSDK {
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
    this.config = {
      ...config,
      serverUrl: config.serverUrl || this.DEFAULT_SERVER_URL,
      batchSize: config.batchSize || this.DEFAULT_BATCH_SIZE,
      batchInterval: config.batchInterval || this.DEFAULT_BATCH_INTERVAL
    };
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
    const event = this.createEvent("conversion", conversionName, {
      ...properties,
      conversion_value: value
    });
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
    } catch {
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
    if (this.eventQueue.length >= (this.config?.batchSize || this.DEFAULT_BATCH_SIZE)) {
      this.flushEvents();
    }
  }
  flushPendingEvents() {
    if (this.pendingQueue.length === 0) return;
    this.log("info", "Flushing pending events", { count: this.pendingQueue.length });
    this.eventQueue.push(...this.pendingQueue);
    this.pendingQueue = [];
    if (this.eventQueue.length >= (this.config?.batchSize || this.DEFAULT_BATCH_SIZE)) {
      this.flushEvents();
    }
  }
  async flushEvents() {
    if (this.eventQueue.length === 0 || !this.config) return;
    const events = [...this.eventQueue];
    this.eventQueue = [];
    try {
      const response = await fetch(this.config.serverUrl, {
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
  }
  startBatchTimer() {
    if (this.batchTimer) return;
    this.batchTimer = setInterval(() => {
      this.flushEvents();
    }, this.config?.batchInterval || this.DEFAULT_BATCH_INTERVAL);
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
      } catch {
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
    } catch {
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
    if (!this.config?.debug) return;
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
}
const HealthTrack = new HealthTrackSDK();
import { phiDetector as phiDetector2 } from "./phi-detector";
import { consentManager as consentManager2 } from "./consent";
if (typeof window !== "undefined") {
  window.HealthTrack = HealthTrack;
}
export {
  HealthTrack,
  HealthTrackSDK,
  consentManager2 as consentManager,
  phiDetector2 as phiDetector
};
