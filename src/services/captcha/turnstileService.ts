/**
 * Cloudflare Turnstile Service
 * Provides bot prevention capabilities for the landing page
 */

interface TurnstileWindow extends Window {
  turnstile?: {
    render: (element: string | Element, options: TurnstileOptions) => string;
    reset: (widgetId?: string) => void;
    getResponse: (widgetId?: string) => string;
    ready: (callback: () => void) => void;
  };
  turnstileCallback?: () => void;
  turnstileExpiredCallback?: () => void;
  turnstileErrorCallback?: () => void;
}

interface TurnstileOptions {
  sitekey: string;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'compact' | 'normal';
  callback?: string | (() => void);
  'expired-callback'?: string | (() => void);
  'error-callback'?: string | (() => void);
}

declare const window: TurnstileWindow;

class TurnstileService {
  private siteKey: string = '';
  private isLoaded: boolean = false;
  private isInitialized: boolean = false;
  private widgetId: string | null = null;
  private callbacks: {
    onSuccess: (token: string) => void;
    onExpired: () => void;
    onError: () => void;
  } | null = null;

  /**
   * Initialize Turnstile service
   * @param siteKey - Turnstile site key from Cloudflare Dashboard
   */
  async init(siteKey: string): Promise<void> {
    if (!siteKey || typeof window === 'undefined') {
      throw new Error('Invalid site key or running on server');
    }

    if (siteKey === 'your_recaptcha_site_key_here') {
      throw new Error('Default placeholder site key detected - please configure VITE_RECAPTCHA_SITE_KEY');
    }

    this.siteKey = siteKey;

    try {
      // Load Turnstile script if not already loaded
      if (!this.isLoaded) {
        await this.loadScript();
      }

      // Wait for turnstile to be available with timeout
      const startTime = Date.now();
      while (!window.turnstile && (Date.now() - startTime) < 10000) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (!window.turnstile) {
        throw new Error('Turnstile API not available after 10 seconds - check internet connection');
      }

      // Verify the API is functional
      if (typeof window.turnstile.render !== 'function') {
        throw new Error('Turnstile API malformed - render function not available');
      }

      this.isInitialized = true;
    } catch (error) {
      this.isInitialized = false;
      // Enhanced error reporting
      const errorMessage = error instanceof Error ? error.message : 'Unknown Turnstile initialization error';
      throw new Error(`Turnstile initialization failed: ${errorMessage}`);
    }
  }

  /**
   * Load Turnstile script with enhanced compatibility
   */
  private loadScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector('script[src*="turnstile"]');
      if (existingScript) {
        this.isLoaded = true;
        resolve();
        return;
      }

      // Check browser compatibility first
      if (!this.isBrowserCompatible()) {
        reject(new Error('Browser not compatible with Turnstile'));
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.type = 'text/javascript';
      script.async = true;
      script.defer = true;
      
      // Enhanced loading with multiple fallback mechanisms
      let loadTimeout: NodeJS.Timeout;
      
      const cleanup = () => {
        if (loadTimeout) clearTimeout(loadTimeout);
      };

      script.onload = () => {
        cleanup();
        this.isLoaded = true;
        resolve();
      };

      script.onerror = () => {
        cleanup();
        reject(new Error('Failed to load Turnstile script - network or CDN issue'));
      };

      // 30-second timeout for script loading
      loadTimeout = setTimeout(() => {
        cleanup();
        reject(new Error('Turnstile script loading timed out after 30 seconds'));
      }, 30000);

      document.head.appendChild(script);
    });
  }

  /**
   * Check if browser is compatible with Turnstile
   */
  private isBrowserCompatible(): boolean {
    // Check for essential features
    if (typeof window === 'undefined') return false;
    if (typeof document === 'undefined') return false;
    if (typeof fetch === 'undefined') return false;
    if (typeof Promise === 'undefined') return false;
    
    // Check for DOM manipulation capabilities
    if (!document.createElement || !document.head || !document.getElementById) {
      return false;
    }

    // Check for modern JS features required by Turnstile
    try {
      // Check if browser supports modern features safely
      const testArrowFn = () => {}; // Arrow functions
      let testLet = {}; // let/const
      const testConst = {}; // const

      // Check if these variables are properly defined
      if (typeof testArrowFn !== 'function' || typeof testLet !== 'object' || typeof testConst !== 'object') {
        return false;
      }
    } catch (e) {
      return false;
    }

    return true;
  }

  /**
   * Detect if user is on mobile device
   */
  private isMobileDevice(): boolean {
    // Check user agent for mobile indicators
    const userAgent = navigator.userAgent || '';
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    // Check screen size
    const isSmallScreen = window.innerWidth <= 768;
    
    // Check touch capability
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    return isMobileUA || (isSmallScreen && isTouchDevice);
  }

  /**
   * Detect user's preferred theme
   */
  private detectPreferredTheme(): 'light' | 'dark' {
    // Check for dark mode preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    // Check if dark mode is enabled in the app
    if (document.documentElement.classList.contains('dark') || 
        document.body.classList.contains('dark')) {
      return 'dark';
    }
    
    return 'light';
  }

  /**
   * Render Turnstile widget
   * @param elementId - ID of the element to render the widget in
   * @param callbacks - Success, expired, and error callbacks
   * @param options - Additional Turnstile options
   */
  async render(
    elementId: string,
    callbacks: {
      onSuccess: (token: string) => void;
      onExpired: () => void;
      onError: () => void;
    },
    options: Partial<TurnstileOptions> = {}
  ): Promise<boolean> {
    if (!this.isInitialized || !window.turnstile) {
      callbacks.onError();
      return false;
    }

    this.callbacks = callbacks;

    // Use simpler direct function approach to avoid callback errors
    const successCallback = () => {
      try {
        if (!this.callbacks || typeof this.callbacks.onSuccess !== 'function') {
          return;
        }

        const token = this.getResponse();
        if (token) {
          this.callbacks.onSuccess(token);
        } else {
          this.callbacks.onError();
        }
      } catch (error) {
        if (this.callbacks) {
          this.callbacks.onError();
        }
      }
    };

    const expiredCallback = () => {
      try {
        if (this.callbacks && typeof this.callbacks.onExpired === 'function') {
          this.callbacks.onExpired();
        }
      } catch (error) {
        // Silent error handling
      }
    };

    const errorCallback = () => {
      try {
        if (this.callbacks && typeof this.callbacks.onError === 'function') {
          this.callbacks.onError();
        }
      } catch (error) {
        // Silent error handling
      }
    };

    try {
      const element = document.getElementById(elementId);
      if (!element) {
        callbacks.onError();
        return false;
      }

      // Validate site key format (Turnstile keys start with 0x)
      if (!this.siteKey.startsWith('0x')) {
        callbacks.onError();
        return false;
      }

      // Detect mobile/device-specific settings
      const isMobile = this.isMobileDevice();
      const widgetSize = isMobile ? 'compact' : (options.size || 'normal');
      const widgetTheme = options.theme || this.detectPreferredTheme();

      // Set up error timeout - if widget doesn't load in 20 seconds, fail
      const errorTimeout = setTimeout(() => {
        callbacks.onError();
      }, 20000);

      // Enhanced render with device-specific optimizations using direct function callbacks
      const renderOptions = {
        sitekey: this.siteKey,
        theme: widgetTheme,
        size: widgetSize,
        callback: successCallback,
        'expired-callback': expiredCallback,
        'error-callback': errorCallback,
        // Mobile optimizations
        ...(isMobile && {
          'refresh-expired': 'auto',
          'retry': 'auto'
        }),
        ...options,
      };

      this.widgetId = window.turnstile!.render(element, renderOptions);

      // Clear timeout if successful
      clearTimeout(errorTimeout);

      if (!this.widgetId) {
        callbacks.onError();
        return false;
      }

      return true;
    } catch (error) {
      callbacks.onError();
      return false;
    }
  }

  /**
   * Get Turnstile response token
   */
  getResponse(): string {
    if (!window.turnstile || this.widgetId === null) {
      return '';
    }

    return window.turnstile.getResponse(this.widgetId);
  }

  /**
   * Reset Turnstile widget
   */
  reset(): void {
    if (!window.turnstile || this.widgetId === null) {
      return;
    }

    window.turnstile.reset(this.widgetId);
  }

  /**
   * Check if Turnstile is ready
   */
  isReady(): boolean {
    return this.isInitialized && !!window.turnstile;
  }

  /**
   * Clean up Turnstile
   */
  cleanup(): void {
    this.widgetId = null;
    this.callbacks = null;
    
    // Clean up global callbacks
    if (window.turnstileCallback) {
      delete window.turnstileCallback;
    }
    if (window.turnstileExpiredCallback) {
      delete window.turnstileExpiredCallback;
    }
    if (window.turnstileErrorCallback) {
      delete window.turnstileErrorCallback;
    }
  }
}

// Create and export singleton instance
export const turnstileService = new TurnstileService();

// Auto-initialize if site key is available in environment
const TURNSTILE_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
if (TURNSTILE_SITE_KEY) {
  turnstileService.init(TURNSTILE_SITE_KEY);
}