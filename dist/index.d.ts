type Config = {
    apiKey: string;
    endpoint?: string;
    headers?: Record<string, string>;
    debug?: boolean;
};
declare class MindersSDK {
    private static instance;
    private apiKey;
    private endpoint;
    private headers;
    private debug;
    private context;
    private queue;
    private isOnline;
    /**
     * Initialize the SDK with configuration
     * @param {Config} config - Configuration object
     */
    static init(config: Config): void;
    private constructor();
    /**
     * Track an event
     * @param {string} eventName - Name of the event to track
     * @param {Record<string, any>} payload - Optional payload data
     */
    static trackEvent(eventName: string, payload?: Record<string, any>): void;
    /**
     * Set global context that will be sent with every event
     * @param {Record<string, any>} context - Context data
     */
    static setContext(context: Record<string, any>): void;
    /**
     * Enable or disable debug mode
     * @param {boolean} debug - Debug mode status
     */
    static setDebug(debug: boolean): void;
    private getUserId;
    private generateUserId;
    private sendEvent;
    private addToQueue;
    private processQueue;
}

export { MindersSDK as default };
