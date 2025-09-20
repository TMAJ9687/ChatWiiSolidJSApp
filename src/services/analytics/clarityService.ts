/**
 * Microsoft Clarity Analytics Service
 * Provides tracking functionality for user interactions and page views
 */
import { createServiceLogger } from "../../utils/logger";

const logger = createServiceLogger('ClarityService');

interface ClarityWindow extends Window {
  clarity?: {
    (method: 'start', config: { content: boolean; cookies: boolean; }, projectId: string): void;
    (method: 'identify', userId: string, userHint?: string, friendlyName?: string): void;
    (method: 'set', key: string, value: string | number | boolean): void;
    (method: 'event', eventName: string): void;
    (method: 'upgrade', reason: string): void;
    consent: (granted: boolean) => void;
  };
}

declare const window: ClarityWindow;

class ClarityService {
  private projectId: string = ''; // Will be set from environment or config
  private isInitialized: boolean = false;
  private isEnabled: boolean = true; // Can be disabled for development

  /**
   * Initialize Microsoft Clarity
   * @param projectId - Clarity project ID from Microsoft Clarity dashboard
   */
  init(projectId: string): void {
    if (!projectId || typeof window === 'undefined' || projectId === 'DEFAULT_PROJECT_ID') {
      logger.warn('Clarity: Invalid project ID or running on server');
      return;
    }

    // Don't initialize Clarity on feedback page to prevent blocked client errors
    if (window.location.pathname === '/feedback') {
      logger.debug('Clarity: Skipping initialization on feedback page');
      return;
    }

    this.projectId = projectId;
    
    try {
      // Check if Clarity is already loaded
      if (window.clarity) {
        this.isInitialized = true;
        return;
      }

      // Load Clarity script with error handling
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.innerHTML = `
        (function(c,l,a,r,i,t,y){
          try {
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          } catch(e) {
            logger.warn('Clarity initialization error:', e);
          }
        })(window, document, "clarity", "script", "${projectId}");
      `;
      
      script.onerror = () => {
        logger.warn('Failed to load Clarity script');
      };
      
      document.head.appendChild(script);
      this.isInitialized = true;
      
      // Set privacy-friendly defaults
      if (window.clarity) {
        window.clarity('start', { content: true, cookies: false }, projectId);
      }
    } catch (error) {
      logger.warn('Clarity: Failed to initialize', error);
    }
  }

  /**
   * Track custom events
   * @param eventName - Name of the event to track
   */
  trackEvent(eventName: string): void {
    if (!this.isInitialized || !this.isEnabled || !window.clarity) return;

    // Skip tracking on feedback page to avoid blocked analytics errors
    if (window.location.pathname === '/feedback') {
      return;
    }

    try {
      window.clarity('event', eventName);
    } catch (error) {
      logger.warn('Clarity: Failed to track event', eventName, error);
    }
  }

  /**
   * Set custom user properties
   * @param key - Property key
   * @param value - Property value
   */
  setUserProperty(key: string, value: string | number | boolean): void {
    if (!this.isInitialized || !this.isEnabled || !window.clarity) return;

    // Skip tracking on feedback page to avoid blocked analytics errors
    if (window.location.pathname === '/feedback') {
      return;
    }

    try {
      window.clarity('set', key, value);
    } catch (error) {
      logger.warn('Clarity: Failed to set property', key, error);
    }
  }

  /**
   * Identify user (for authenticated sessions)
   * @param userId - Unique user identifier
   * @param userHint - Optional user hint
   * @param friendlyName - Optional friendly name
   */
  identifyUser(userId: string, userHint?: string, friendlyName?: string): void {
    if (!this.isInitialized || !this.isEnabled || !window.clarity) return;
    
    try {
      window.clarity('identify', userId, userHint, friendlyName);
    } catch (error) {
      logger.warn('Clarity: Failed to identify user', error);
    }
  }

  /**
   * Set consent for data collection
   * @param granted - Whether consent is granted
   */
  setConsent(granted: boolean): void {
    if (!this.isInitialized || !window.clarity) return;
    
    try {
      if (window.clarity.consent) {
        window.clarity.consent(granted);
      }
    } catch (error) {
      logger.warn('Clarity: Failed to set consent', error);
    }
  }

  /**
   * Enable/disable tracking
   * @param enabled - Whether tracking should be enabled
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Completely disable and stop Clarity tracking
   * This is used when navigating to pages where tracking should be completely stopped
   */
  disable(): void {
    this.isEnabled = false;
    this.isInitialized = false;

    // Try to stop Clarity if it's running
    if (window.clarity) {
      try {
        // Clear any existing Clarity state
        delete (window as any).clarity;
      } catch (error) {
        // Ignore errors when trying to disable
      }
    }

    logger.debug('Clarity: Completely disabled and stopped');
  }

  /**
   * Track page views (called automatically by router)
   * @param pageName - Name/path of the page
   */
  trackPageView(pageName: string): void {
    this.trackEvent(`page_view_${pageName}`);
    this.setUserProperty('current_page', pageName);
  }

  /**
   * Track chat-specific events
   */
  trackChatEvents = {
    startChat: () => this.trackEvent('chat_started'),
    sendMessage: (messageType: 'text' | 'image' | 'voice' = 'text') => 
      this.trackEvent(`message_sent_${messageType}`),
    joinChat: () => this.trackEvent('chat_joined'),
    leaveChat: () => this.trackEvent('chat_left'),
    blockUser: () => this.trackEvent('user_blocked'),
    reportUser: () => this.trackEvent('user_reported'),
    voiceMessage: () => this.trackEvent('voice_message_sent'),
    imageMessage: () => this.trackEvent('image_message_sent'),
    vipUpgrade: () => this.trackEvent('vip_upgrade_attempted'),
  };

  /**
   * Track admin-specific events
   */
  trackAdminEvents = {
    login: () => this.trackEvent('admin_login'),
    userAction: (action: string) => this.trackEvent(`admin_user_${action}`),
    settingsChange: () => this.trackEvent('admin_settings_changed'),
    moderationAction: (action: string) => this.trackEvent(`moderation_${action}`),
  };
}

// Create and export singleton instance
export const clarityService = new ClarityService();

// NOTE: Auto-initialization removed to prevent issues on feedback page
// Components that need analytics should initialize manually in their onMount() hook
// Example: clarityService.init(import.meta.env.VITE_CLARITY_PROJECT_ID)