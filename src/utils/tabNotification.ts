import { createServiceLogger } from './logger';

const logger = createServiceLogger('TabNotification');

/**
 * Simple utility to add browser tab notifications without breaking existing functionality
 * This only manages the page title, doesn't interfere with inbox counters or other features
 */

class TabNotification {
  private originalTitle: string = 'ChatWii';
  private currentUnreadCount: number = 0;

  /**
   * Initialize with the original page title
   */
  init() {
    // Get the actual current title from the document (set by SEOHead component)
    // Only fall back to 'ChatWii' if no title is set at all
    this.originalTitle = document.title || 'ChatWii';
    logger.debug('TabNotification init - captured title:', this.originalTitle);
  }

  /**
   * Set the original title manually (for use with SEO component)
   */
  setOriginalTitle(title: string) {
    this.originalTitle = title;
  }

  /**
   * Update the page title with unread count
   */
  updateTitle(unreadCount: number) {
    this.currentUnreadCount = unreadCount;
    
    if (unreadCount > 0) {
      const displayCount = unreadCount > 99 ? '99+' : unreadCount.toString();
      document.title = `${this.originalTitle} (${displayCount})`;
    } else {
      document.title = this.originalTitle;
    }
  }

  /**
   * Reset title to original
   */
  resetTitle() {
    document.title = this.originalTitle;
    this.currentUnreadCount = 0;
  }

  /**
   * Get current unread count
   */
  getUnreadCount(): number {
    return this.currentUnreadCount;
  }
}

export const tabNotification = new TabNotification();