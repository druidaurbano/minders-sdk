"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
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

// src/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);
var MindersSDK = class _MindersSDK {
  constructor(config) {
    this.apiKey = "";
    this.endpoint = "https://67f81e8b2466325443ebe908.mockapi.io/api/v1/event";
    this.headers = {};
    this.debug = false;
    this.context = {};
    this.queue = [];
    this.isOnline = true;
    if (!config.apiKey) {
      throw new Error("API key is required");
    }
    this.apiKey = config.apiKey;
    this.endpoint = config.endpoint || this.endpoint;
    this.headers = config.headers || {};
    this.debug = config.debug || false;
    if (this.debug) {
      console.log("MindersSDK initialized with config:", config);
    }
  }
  /**
   * Initialize the SDK with configuration
   * @param {Config} config - Configuration object
   */
  static init(config) {
    if (!_MindersSDK.instance) {
      _MindersSDK.instance = new _MindersSDK(config);
    }
    window.addEventListener("online", () => {
      _MindersSDK.instance.isOnline = true;
      _MindersSDK.instance.processQueue();
    });
    window.addEventListener("offline", () => {
      _MindersSDK.instance.isOnline = false;
    });
  }
  /**
   * Track an event
   * @param {string} eventName - Name of the event to track
   * @param {Record<string, any>} payload - Optional payload data
   */
  static trackEvent(eventName, payload) {
    if (!_MindersSDK.instance) {
      console.warn("MindersSDK not initialized. Call MindersSDK.init() first.");
      return;
    }
    const userId = _MindersSDK.instance.getUserId();
    const event = {
      eventName,
      payload,
      userId,
      timestamp: Date.now(),
      context: _MindersSDK.instance.context
    };
    if (_MindersSDK.instance.debug) {
      console.log("Tracking event:", event);
    }
    if (_MindersSDK.instance.isOnline) {
      _MindersSDK.instance.sendEvent(event);
    } else {
      _MindersSDK.instance.addToQueue(event);
    }
  }
  /**
   * Set global context that will be sent with every event
   * @param {Record<string, any>} context - Context data
   */
  static setContext(context) {
    if (!_MindersSDK.instance) {
      console.warn("MindersSDK not initialized. Call MindersSDK.init() first.");
      return;
    }
    _MindersSDK.instance.context = context;
  }
  /**
   * Enable or disable debug mode
   * @param {boolean} debug - Debug mode status
   */
  static setDebug(debug) {
    if (!_MindersSDK.instance) {
      console.warn("MindersSDK not initialized. Call MindersSDK.init() first.");
      return;
    }
    _MindersSDK.instance.debug = debug;
  }
  getUserId() {
    let userId = localStorage.getItem("minders_user_id");
    if (!userId) {
      userId = this.generateUserId();
      localStorage.setItem("minders_user_id", userId);
    }
    return userId;
  }
  generateUserId() {
    return "user_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  sendEvent(event) {
    return __async(this, null, function* () {
      try {
        const response = yield fetch(this.endpoint, {
          method: "POST",
          headers: __spreadValues({
            "Content-Type": "application/json",
            "x-api-key": this.apiKey
          }, this.headers),
          body: JSON.stringify(event)
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        if (this.debug) {
          console.log("Event successfully sent:", event);
        }
      } catch (error) {
        console.warn("Failed to send event:", error);
        this.addToQueue(event);
      }
    });
  }
  addToQueue(event) {
    this.queue.push(event);
    localStorage.setItem("minders_event_queue", JSON.stringify(this.queue));
    if (this.debug) {
      console.log("Event added to queue:", event);
      console.log("Current queue:", this.queue);
    }
  }
  processQueue() {
    const storedQueue = localStorage.getItem("minders_event_queue");
    if (storedQueue) {
      this.queue = JSON.parse(storedQueue);
    }
    while (this.queue.length > 0 && this.isOnline) {
      const event = this.queue.shift();
      if (event) {
        this.sendEvent(event);
      }
    }
    localStorage.setItem("minders_event_queue", JSON.stringify(this.queue));
  }
};
var index_default = MindersSDK;
if (typeof window !== "undefined") {
  window.MindersSDK = MindersSDK;
}
