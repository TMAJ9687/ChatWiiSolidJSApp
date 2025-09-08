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
      return;
    }

    if (siteKey === 'your_recaptcha_site_key_here') {
      return;
    }

    this.siteKey = siteKey;

    try {
      // Load Turnstile script if not already loaded
      if (!this.isLoaded) {
        await this.loadScript();
      }

      // Wait for turnstile to be available
      let attempts = 0;
      while (!window.turnstile && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!window.turnstile) {
        throw new Error('Turnstile script failed to load after 5 seconds');
      }

      this.isInitialized = true;
    } catch (error) {
      this.isInitialized = false;
      throw error;
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
      return false;
    }

    this.callbacks = callbacks;

    // Set up unique global callbacks to avoid conflicts
    const callbackId = Date.now().toString();
    const successCallback = `chatwii_turnstile_success_${callbackId}`;
    const expiredCallback = `chatwii_turnstile_expired_${callbackId}`;
    const errorCallback = `chatwii_turnstile_error_${callbackId}`;

    (window as any)[successCallback] = () => {
      const token = this.getResponse();
      if (token && this.callbacks) {
        this.callbacks.onSuccess(token);
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
        return false;
      }

      // Direct render without ready() to avoid async/defer issues
      this.widgetId = window.turnstile!.render(element, {
        sitekey: this.siteKey,
        theme: options.theme || 'light',
        size: options.size || 'normal',
        callback: successCallback,
        'expired-callback': expiredCallback,
        'error-callback': errorCallback,
        ...options,
      });

      return true;
    } catch (error) {
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