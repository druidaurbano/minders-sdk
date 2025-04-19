import MindersSDK from '../src/index';

// 1. Solution for private instance access - Add test accessor to your class
declare module '../src/index' {
  interface MindersSDK {
    /** @internal Test-only accessor */
    _testAccess: {
      instance: typeof MindersSDK['instance'];
    };
  }
}

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    }
  };
})();

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as jest.MockedFunction<typeof fetch>;

// 2. Solution for window.addEventListener - Proper typing for event mocks
type EventListenerWithOptions = EventListenerOrEventListenerObject & {
  options?: boolean | AddEventListenerOptions;
};

const mockWindowEvents: Record<string, EventListenerWithOptions[]> = {
  online: [],
  offline: []
};

// Properly typed window event mocks
beforeAll(() => {
  window.addEventListener = jest.fn((
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ) => {
    if (type in mockWindowEvents) {
      const listenerWithOptions = listener as EventListenerWithOptions;
      listenerWithOptions.options = options;
      mockWindowEvents[type].push(listenerWithOptions);
    }
  }) as unknown as typeof window.addEventListener;

  window.removeEventListener = jest.fn((
    type: string,
    listener: EventListenerOrEventListenerObject
  ) => {
    if (type in mockWindowEvents) {
      mockWindowEvents[type] = mockWindowEvents[type].filter(
        l => l !== listener
      );
    }
  }) as unknown as typeof window.removeEventListener;
});

beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  mockWindowEvents.online = [];
  mockWindowEvents.offline = [];
  
  mockFetch.mockImplementation(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response)
  );
  
  // Reset singleton instance through test accessor
  (MindersSDK as any)._testAccess = { instance: undefined };
});

// Helper function to trigger events
const triggerWindowEvent = (type: 'online' | 'offline') => {
  const event = new Event(type);
  mockWindowEvents[type].forEach(listener => {
    if (typeof listener === 'function') {
      listener(event);
    } else {
      listener.handleEvent(event);
    }
  });
};

describe('MindersSDK Initialization', () => {
  test('should create singleton instance with config', () => {
    MindersSDK.init({ apiKey: 'test-key' });
    expect((MindersSDK as any)._testAccess.instance).toBeDefined();
    expect((MindersSDK as any)._testAccess.instance.apiKey).toBe('test-key');
  });

  test('should throw error without API key', () => {
    expect(() => MindersSDK.init({} as any)).toThrow('API key is required');
  });

  test('should reuse existing instance', () => {
    MindersSDK.init({ apiKey: 'test-key' });
    const firstInstance = (MindersSDK as any)._testAccess.instance;
    MindersSDK.init({ apiKey: 'new-key' });
    expect((MindersSDK as any)._testAccess.instance).toBe(firstInstance);
  });

  test('should set up online/offline listeners', () => {
    MindersSDK.init({ apiKey: 'test-key' });
    expect(window.addEventListener).toHaveBeenCalledWith(
      'online',
      expect.any(Function)
    );
    expect(window.addEventListener).toHaveBeenCalledWith(
      'offline',
      expect.any(Function)
    );
  });
});

describe('User Management', () => {
  test('should generate and store user ID', () => {
    MindersSDK.init({ apiKey: 'test-key' });
    MindersSDK.trackEvent('test');
    
    const userId = localStorageMock.getItem('minders_user_id');
    expect(userId).toMatch(/^user_[a-z0-9]+$/);
  });

  test('should reuse existing user ID', () => {
    localStorageMock.setItem('minders_user_id', 'test_user_123');
    MindersSDK.init({ apiKey: 'test-key' });
    MindersSDK.trackEvent('test');
    
    expect(localStorageMock.getItem('minders_user_id')).toBe('test_user_123');
  });
});

describe('Event Tracking', () => {
  test('should send events with proper structure', async () => {
    MindersSDK.init({ apiKey: 'test-key' });
    MindersSDK.trackEvent('page_view', { page: 'home' });

    await new Promise(process.nextTick);
    
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    
    expect(url).toBe('https://67f81e8b2466325443ebe908.mockapi.io/api/v1/event');
    expect(options.method).toBe('POST');
    
    const body = JSON.parse(options.body as string);
    expect(body.eventName).toBe('page_view');
    expect(body.payload.page).toBe('home');
    expect(body.userId).toBeDefined();
    expect(body.timestamp).toBeDefined();
  });
});

describe('Offline Support', () => {
  test('should queue events when offline', () => {
    MindersSDK.init({ apiKey: 'test-key' });
    (MindersSDK as any)._testAccess.instance.isOnline = false;

    MindersSDK.trackEvent('offline_action');
    
    const queue = (MindersSDK as any)._testAccess.instance.queue;
    expect(queue.length).toBe(1);
    const storedQueue = localStorageMock.getItem('minders_event_queue');
    expect(JSON.parse(storedQueue || '[]').length).toBe(1);
  });

  test('should process queue when coming online', async () => {
    localStorageMock.setItem('minders_event_queue', 
      JSON.stringify([{ eventName: 'queued', userId: 'test', timestamp: 123 }])
    );
    
    MindersSDK.init({ apiKey: 'test-key' });
    (MindersSDK as any)._testAccess.instance.isOnline = true;
    
    triggerWindowEvent('online');
    
    await new Promise(process.nextTick);
    
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect((MindersSDK as any)._testAccess.instance.queue.length).toBe(0);
  });
});

// ... (rest of your test cases remain the same, using the same patterns)

describe('Debug Mode', () => {
  test('should log events when debug is enabled', () => {
    const logSpy = jest.spyOn(console, 'log');
    MindersSDK.init({ apiKey: 'test-key', debug: true });
    MindersSDK.trackEvent('debug_test');
    
    expect(logSpy).toHaveBeenCalledWith(
      'Tracking event:',
      expect.objectContaining({
        eventName: 'debug_test'
      })
    );
  });

  test('should toggle debug mode', () => {
    MindersSDK.init({ apiKey: 'test-key' });
    const logSpy = jest.spyOn(console, 'log');
    
    MindersSDK.setDebug(true);
    MindersSDK.trackEvent('test');
    expect(logSpy).toHaveBeenCalled();
    
    logSpy.mockClear();
    
    MindersSDK.setDebug(false);
    MindersSDK.trackEvent('test');
    expect(logSpy).not.toHaveBeenCalled();
  });
});

describe('Global Context', () => {
  test('should include global context in events', async () => {
    MindersSDK.init({ apiKey: 'test-key' });
    MindersSDK.setContext({ appVersion: '1.0.0', env: 'test' });
    MindersSDK.trackEvent('context_test');
    
    await new Promise(process.nextTick);
    
    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body as string);
    expect(body.context).toEqual({
      appVersion: '1.0.0',
      env: 'test'
    });
  });
});

describe('Error Handling', () => {
  test('should handle failed requests', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 500,
      } as Response)
    );
    
    const warnSpy = jest.spyOn(console, 'warn');
    MindersSDK.init({ apiKey: 'test-key' });
    MindersSDK.trackEvent('failed_request');
    
    await new Promise(process.nextTick);
    
    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to send event:',
      expect.any(Error)
    );
    // @ts-ignore - Should be in queue
    expect(MindersSDK.instance.queue.length).toBe(1);
  });

  test('should handle network errors', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.reject(new Error('Network error'))
    );
    
    const warnSpy = jest.spyOn(console, 'warn');
    MindersSDK.init({ apiKey: 'test-key' });
    MindersSDK.trackEvent('network_error');
    
    await new Promise(process.nextTick);
    
    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to send event:',
      expect.any(Error)
    );
    // @ts-ignore - Should be in queue
    expect(MindersSDK.instance.queue.length).toBe(1);
  });
});