import { createEffect, onMount } from 'solid-js';
import { clarityService } from '../services/analytics/clarityService';

/**
 * SolidJS hook for Microsoft Clarity analytics integration
 * Provides seamless tracking capabilities without affecting UI
 */
export function useAnalytics() {
  // Initialize analytics on mount
  onMount(() => {
    // Don't initialize analytics on feedback page
    if (window.location.pathname === '/feedback') {
      return;
    }

    // Initialize with project ID from environment variables
    const projectId = import.meta.env.VITE_CLARITY_PROJECT_ID;

    if (projectId && projectId !== 'DEFAULT_PROJECT_ID') {
      clarityService.init(projectId);
    }
  });

  return {
    // Page tracking
    trackPageView: (pageName: string) => clarityService.trackPageView(pageName),
    
    // User identification (for authenticated users)
    identifyUser: (userId: string, nickname?: string) => 
      clarityService.identifyUser(userId, undefined, nickname),
    
    // Custom events
    trackEvent: (eventName: string) => clarityService.trackEvent(eventName),
    
    // User properties
    setUserProperty: (key: string, value: string | number | boolean) => 
      clarityService.setUserProperty(key, value),
    
    // Chat-specific tracking
    chat: clarityService.trackChatEvents,
    
    // Admin-specific tracking
    admin: clarityService.trackAdminEvents,
    
    // Privacy controls
    setConsent: (granted: boolean) => clarityService.setConsent(granted),
    setEnabled: (enabled: boolean) => clarityService.setEnabled(enabled),
  };
}

/**
 * Simple page tracker component for automatic page view tracking
 * Usage: <PageTracker pageName="landing" />
 */
export function createPageTracker(pageName: string) {
  const analytics = useAnalytics();
  
  createEffect(() => {
    analytics.trackPageView(pageName);
  });

  return null; // This component doesn't render anything
}