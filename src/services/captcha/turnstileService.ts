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
  callback?: string;
  'expired-callback'?: string;
  'error-callback'?: string;
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
   * Load Turnstile script
   */
  private loadScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector('script[src*="turnstile"]');
      if (existingScript) {
        this.isLoaded = true;
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      // Note: Turnstile requires sync loading when using turnstile.ready()

      script.onload = () => {
        this.isLoaded = true;
        resolve();
      };

      script.onerror = () => {
        reject(new Error('Failed to load Turnstile script'));
      };

      document.head.appendChild(script);
    });
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

    // Set up unique global callbacks to avoid conflicts
    const callbackId = Date.now().toString() + Math.random().toString(36);
    const successCallback = `chatwii_turnstile_success_${callbackId}`;
    const expiredCallback = `chatwii_turnstile_expired_${callbackId}`;
    const errorCallback = `chatwii_turnstile_error_${callbackId}`;

    // Enhanced callback with error handling
    (window as any)[successCallback] = () => {
      try {
        const token = this.getResponse();
        if (token && this.callbacks) {
          this.callbacks.onSuccess(token);
        } else if (this.callbacks) {
          this.callbacks.onError();
        }
      } catch (error) {
        if (this.callbacks) {
          this.callbacks.onError();
        }
      }
    };

    (window as any)[expiredCallback] = () => {
      if (this.callbacks) {
        this.callbacks.onExpired();
      }
    };

    (window as any)[errorCallback] = () => {
      if (this.callbacks) {
        this.callbacks.onError();
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

      // Set up error timeout - if widget doesn't load in 15 seconds, fail
      const errorTimeout = setTimeout(() => {
        callbacks.onError();
      }, 15000);

      // Enhanced render with error catching
      this.widgetId = window.turnstile!.render(element, {
        sitekey: this.siteKey,
        theme: options.theme || 'light',
        size: options.size || 'normal',
        callback: successCallback,
        'expired-callback': expiredCallback,
        'error-callback': errorCallback,
        ...options,
      });

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