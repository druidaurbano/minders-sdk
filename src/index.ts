// src/index.ts

type Config = {
    apiKey: string;
    endpoint?: string;
    headers?: Record<string, string>;
    debug?: boolean;
};
  
type Event = {
    eventName: string;
    payload?: Record<string, any>;
    userId: string;
    timestamp: number;
    context?: Record<string, any>;
};
  
class MindersSDK {
    private static instance: MindersSDK;
    private apiKey: string = '';
    private endpoint: string = 'https://67f81e8b2466325443ebe908.mockapi.io/api/v1/event';
    private headers: Record<string, string> = {};
    private debug: boolean = false;
    private context: Record<string, any> = {};
    private queue: Event[] = [];
    private isOnline: boolean = true;
  
    /**
     * Initialize the SDK with configuration
     * @param {Config} config - Configuration object
     */
    static init(config: Config): void {
      if (!MindersSDK.instance) {
        MindersSDK.instance = new MindersSDK(config);
      }
  
      // Check online status
      window.addEventListener('online', () => {
        MindersSDK.instance.isOnline = true;
        MindersSDK.instance.processQueue();
      });
      window.addEventListener('offline', () => {
        MindersSDK.instance.isOnline = false;
      });
    }
  
    private constructor(config: Config) {
      if (!config.apiKey) {
        throw new Error('API key is required');
      }
  
      this.apiKey = config.apiKey;
      this.endpoint = config.endpoint || this.endpoint;
      this.headers = config.headers || {};
      this.debug = config.debug || false;
  
      if (this.debug) {
        console.log('MindersSDK initialized with config:', config);
      }
    }
  
    /**
     * Track an event
     * @param {string} eventName - Name of the event to track
     * @param {Record<string, any>} payload - Optional payload data
     */
    static trackEvent(eventName: string, payload?: Record<string, any>): void {
      if (!MindersSDK.instance) {
        console.warn('MindersSDK not initialized. Call MindersSDK.init() first.');
        return;
      }
  
      const userId = MindersSDK.instance.getUserId();
      const event: Event = {
        eventName,
        payload,
        userId,
        timestamp: Date.now(),
        context: MindersSDK.instance.context,
      };
  
      if (MindersSDK.instance.debug) {
        console.log('Tracking event:', event);
      }
  
      if (MindersSDK.instance.isOnline) {
        MindersSDK.instance.sendEvent(event);
      } else {
        MindersSDK.instance.addToQueue(event);
      }
    }
  
    /**
     * Set global context that will be sent with every event
     * @param {Record<string, any>} context - Context data
     */
    static setContext(context: Record<string, any>): void {
      if (!MindersSDK.instance) {
        console.warn('MindersSDK not initialized. Call MindersSDK.init() first.');
        return;
      }
      MindersSDK.instance.context = context;
    }
  
    /**
     * Enable or disable debug mode
     * @param {boolean} debug - Debug mode status
     */
    static setDebug(debug: boolean): void {
      if (!MindersSDK.instance) {
        console.warn('MindersSDK not initialized. Call MindersSDK.init() first.');
        return;
      }
      MindersSDK.instance.debug = debug;
    }
  
    private getUserId(): string {
      let userId = localStorage.getItem('minders_user_id');
      
      if (!userId) {
        userId = this.generateUserId();
        localStorage.setItem('minders_user_id', userId);
      }
  
      return userId;
    }
  
    private generateUserId(): string {
      return 'user_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
  
    private async sendEvent(event: Event): Promise<void> {
      try {
        const response = await fetch(this.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            ...this.headers,
          },
          body: JSON.stringify(event),
        });
  
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
  
        if (this.debug) {
          console.log('Event successfully sent:', event);
        }
      } catch (error) {
        console.warn('Failed to send event:', error);
        this.addToQueue(event);
      }
    }
  
    private addToQueue(event: Event): void {
      this.queue.push(event);
      localStorage.setItem('minders_event_queue', JSON.stringify(this.queue));
      
      if (this.debug) {
        console.log('Event added to queue:', event);
        console.log('Current queue:', this.queue);
      }
    }
  
    private processQueue(): void {
      const storedQueue = localStorage.getItem('minders_event_queue');
      if (storedQueue) {
        this.queue = JSON.parse(storedQueue);
      }
  
      while (this.queue.length > 0 && this.isOnline) {
        const event = this.queue.shift();
        if (event) {
          this.sendEvent(event);
        }
      }
  
      localStorage.setItem('minders_event_queue', JSON.stringify(this.queue));
    }
}
  
// Export for ES modules
export default MindersSDK;
  
// Export for script tag
if (typeof window !== 'undefined') {
    (window as any).MindersSDK = MindersSDK;
}