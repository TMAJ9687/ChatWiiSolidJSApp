/**
 * Google reCAPTCHA v2 Service
 * Provides bot prevention capabilities for the landing page
 */

interface RecaptchaWindow extends Window {
  grecaptcha?: {
    render: (element: string | Element, options: RecaptchaOptions) => number;
    execute: (widgetId?: number) => void;
    reset: (widgetId?: number) => void;
    getResponse: (widgetId?: number) => string;
    ready: (callback: () => void) => void;
  };
  recaptchaCallback?: () => void;
  recaptchaExpiredCallback?: () => void;
  recaptchaErrorCallback?: () => void;
}

interface RecaptchaOptions {
  sitekey: string;
  theme?: 'light' | 'dark';
  size?: 'compact' | 'normal' | 'invisible';
  callback?: string;
  'expired-callback'?: string;
  'error-callback'?: string;
}

declare const window: RecaptchaWindow;

class RecaptchaService {
  private siteKey: string = '';
  private isLoaded: boolean = false;
  private isInitialized: boolean = false;
  private widgetId: number | null = null;
  private callbacks: {
    onSuccess: (token: string) => void;
    onExpired: () => void;
    onError: () => void;
  } | null = null;

  /**
   * Initialize reCAPTCHA service
   * @param siteKey - reCAPTCHA site key from Google Console
   */
  async init(siteKey: string): Promise<void> {
    if (!siteKey || typeof window === 'undefined') {
      console.warn('reCAPTCHA: Invalid site key or running on server');
      return;
    }

    this.siteKey = siteKey;

    // Load reCAPTCHA script if not already loaded
    if (!this.isLoaded) {
      await this.loadScript();
    }

    this.isInitialized = true;
  }

  /**
   * Load reCAPTCHA script
   */
  private loadScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector('script[src*="recaptcha"]')) {
        this.isLoaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js';
      script.async = true;
      script.defer = true;

      script.onload = () => {
        this.isLoaded = true;
        resolve();
      };

      script.onerror = () => {
        reject(new Error('Failed to load reCAPTCHA script'));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Render reCAPTCHA widget
   * @param elementId - ID of the element to render the widget in
   * @param callbacks - Success, expired, and error callbacks
   * @param options - Additional reCAPTCHA options
   */
  async render(
    elementId: string,
    callbacks: {
      onSuccess: (token: string) => void;
      onExpired: () => void;
      onError: () => void;
    },
    options: Partial<RecaptchaOptions> = {}
  ): Promise<boolean> {
    if (!this.isInitialized || !window.grecaptcha) {
      console.warn('reCAPTCHA: Service not initialized');
      return false;
    }

    this.callbacks = callbacks;

    // Set up global callbacks
    window.recaptchaCallback = () => {
      const token = this.getResponse();
      if (token && this.callbacks) {
        this.callbacks.onSuccess(token);
      }
    };

    window.recaptchaExpiredCallback = () => {
      if (this.callbacks) {
        this.callbacks.onExpired();
      }
    };

    window.recaptchaErrorCallback = () => {
      if (this.callbacks) {
        this.callbacks.onError();
      }
    };

    try {
      await new Promise<void>((resolve) => {
        window.grecaptcha!.ready(() => {
          const element = document.getElementById(elementId);
          if (!element) {
            console.error(`reCAPTCHA: Element with ID '${elementId}' not found`);
            return;
          }

          this.widgetId = window.grecaptcha!.render(element, {
            sitekey: this.siteKey,
            theme: options.theme || 'light',
            size: options.size || 'normal',
            callback: 'recaptchaCallback',
            'expired-callback': 'recaptchaExpiredCallback',
            'error-callback': 'recaptchaErrorCallback',
            ...options,
          });

          resolve();
        });
      });

      return true;
    } catch (error) {
      console.error('reCAPTCHA: Failed to render widget', error);
      return false;
    }
  }

  /**
   * Get reCAPTCHA response token
   */
  getResponse(): string {
    if (!window.grecaptcha || this.widgetId === null) {
      return '';
    }

    return window.grecaptcha.getResponse(this.widgetId);
  }

  /**
   * Reset reCAPTCHA widget
   */
  reset(): void {
    if (!window.grecaptcha || this.widgetId === null) {
      return;
    }

    window.grecaptcha.reset(this.widgetId);
  }

  /**
   * Execute reCAPTCHA (for invisible reCAPTCHA)
   */
  execute(): void {
    if (!window.grecaptcha || this.widgetId === null) {
      return;
    }

    window.grecaptcha.execute(this.widgetId);
  }

  /**
   * Verify token on the server side
   * Note: This should be implemented on your backend
   */
  async verifyToken(token: string): Promise<boolean> {
    // This is a placeholder - implement server-side verification
    // DO NOT verify tokens on the client side in production!
    console.warn('reCAPTCHA: Implement server-side token verification');
    
    // For demo purposes, we'll just check if token exists
    return token.length > 0;
  }

  /**
   * Check if reCAPTCHA is ready
   */
  isReady(): boolean {
    return this.isInitialized && !!window.grecaptcha;
  }

  /**
   * Clean up reCAPTCHA
   */
  cleanup(): void {
    this.widgetId = null;
    this.callbacks = null;
    
    // Clean up global callbacks
    if (window.recaptchaCallback) {
      delete window.recaptchaCallback;
    }
    if (window.recaptchaExpiredCallback) {
      delete window.recaptchaExpiredCallback;
    }
    if (window.recaptchaErrorCallback) {
      delete window.recaptchaErrorCallback;
    }
  }
}

// Create and export singleton instance
export const recaptchaService = new RecaptchaService();

// Auto-initialize if site key is available in environment
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
if (RECAPTCHA_SITE_KEY) {
  recaptchaService.init(RECAPTCHA_SITE_KEY);
}