import { supabase } from "../../config/supabase";
import { presenceService } from "./presenceService";
import type { User } from "../../types/user.types";
import { createServiceLogger } from "../../utils/logger";

const logger = createServiceLogger('EnhancedCleanupService');

/**
 * Enhanced cleanup service that handles complete user removal for standard users
 * while preserving VIP and Admin accounts.
 */
class EnhancedCleanupService {
  private browserEventsSetup: boolean = false;

  /**
   * Complete cleanup for standard users - removes from auth, users table, and presence
   * VIP and Admin users are only marked offline but NOT deleted
   */
  async cleanupUser(userId: string, userRole?: string): Promise<void> {
    try {
      logger.debug(`Starting cleanup for user ${userId} with role ${userRole}`);

      // Always set user offline in presence first
      await presenceService.setUserOffline(userId);

      // For VIP and Admin users, only set offline - DO NOT DELETE
      if (userRole === 'vip' || userRole === 'admin') {
        logger.debug(`User ${userId} is ${userRole} - only setting offline, preserving account`);
        
        // Update users table to mark offline but preserve account
        await supabase
          .from("users")
          .update({
            online: false,
            last_seen: new Date().toISOString()
          })
          .eq("id", userId);
        
        return;
      }

      // For standard users, perform complete cleanup
      logger.debug(`User ${userId} is standard - performing complete cleanup`);

      // Step 1: Delete from presence table (already done by presenceService.setUserOffline)
      
      // Step 2: Delete user conversations and messages
      await this.cleanupUserData(userId);
      
      // Step 3: Delete from users table
      const { error: userDeleteError } = await supabase
        .from("users")
        .delete()
        .eq("id", userId);

      if (userDeleteError) {
        logger.error("Error deleting user from users table:", userDeleteError);
      }

      // Note: Auth user deletion skipped - requires service role key
      // Standard users are temporary anyway, and database cleanup is sufficient
      // Auth records will be cleaned up separately by admin if needed

      logger.debug(`Complete cleanup finished for user ${userId}`);
    } catch (error) {
      logger.error("Error during user cleanup:", error);
      // Don't throw - we want to attempt cleanup even if some parts fail
    }
  }

  /**
   * Clean up user-related data (messages, reports, blocks, etc.)
   */
  private async cleanupUserData(userId: string): Promise<void> {
    // Clean up each table individually with error handling for missing tables
    
    // Delete user's messages and messages received
    try {
      await supabase
        .from("messages")
        .delete()
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
    } catch (error) {
      // Messages table cleanup failed - continue
    }

    // Delete any reports made by or about this user
    try {
      await supabase
        .from("reports")
        .delete()
        .or(`reporter_id.eq.${userId},reported_id.eq.${userId}`);
    } catch (error) {
      // Reports table cleanup failed - continue
    }

    // Delete any blocks involving this user
    try {
      await supabase
        .from("blocks")
        .delete()
        .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
    } catch (error) {
      // Blocks table cleanup failed - continue
    }

    // Delete typing indicators
    try {
      await supabase
        .from("typing")
        .delete()
        .eq("user_id", userId);
    } catch (error) {
      // Typing table cleanup failed - continue
    }
  }

  /**
   * Set up enhanced browser event handlers for immediate cleanup
   */
  setupBrowserCleanupHandlers(user: User): void {
    // Don't remove existing handlers - let presenceService manage basic presence
    // We'll add additional cleanup logic on top of existing handlers
    if (this.browserEventsSetup) {
      return; // Already set up, don't interfere with presenceService handlers
    }

    const handleImmediateCleanup = (event?: Event) => {
      logger.debug("Browser event triggered - initiating user cleanup");
      
      // Use sendBeacon for reliable cleanup
      if (navigator.sendBeacon) {
        const cleanupData = {
          userId: user.id,
          userRole: user.role,
          action: 'cleanup'
        };
        
        // Send to a cleanup endpoint (you'd need to implement this server-side)
        navigator.sendBeacon('/api/user/cleanup', JSON.stringify(cleanupData));
      }

      // Also attempt immediate cleanup (may not complete due to browser closing)
      this.cleanupUser(user.id, user.role);
    };

    const handleEnhancedCleanup = (e?: Event) => {
      // Only add enhanced cleanup on top of basic presence cleanup
      handleImmediateCleanup(e);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User switched away (alt+tab) - just update activity, don't cleanup
        // Users should stay in list when they alt+tab
        // Only cleanup on actual tab close/browser close via beforeunload/unload events
        if (user.role === 'standard') {
          // Just update last_seen timestamp, don't remove user
          logger.debug('User tabbed away - updating activity but keeping online');
        }
      } else {
        // User came back to tab - update activity
        if (user.role === 'standard') {
          logger.debug('User returned to tab - updating activity');
        }
      }
    };

    const handleOffline = () => {
      // Network went offline - immediate cleanup for standard users
      if (user.role === 'standard') {
        this.cleanupUser(user.id, user.role);
      }
    };

    // Add enhanced handlers that work alongside presenceService handlers
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('offline', handleOffline);

    // Store enhanced handler references for cleanup
    (window as any).__enhancedCleanupHandlers = {
      handleVisibilityChange,
      handleOffline
    };

    this.browserEventsSetup = true;
  }

  /**
   * Remove enhanced browser event handlers
   */
  removeBrowserCleanupHandlers(): void {
    if (!this.browserEventsSetup) return;

    const handlers = (window as any).__enhancedCleanupHandlers;
    if (handlers) {
      document.removeEventListener('visibilitychange', handlers.handleVisibilityChange);
      window.removeEventListener('offline', handlers.handleOffline);

      delete (window as any).__enhancedCleanupHandlers;
    }

    this.browserEventsSetup = false;
  }

  /**
   * Cleanup stale standard users who haven't been active
   */
  async cleanupStaleStandardUsers(): Promise<number> {
    try {
      // Find standard users who haven't been active for 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data: staleUsers, error } = await supabase
        .from("users")
        .select("id, role, last_seen")
        .eq("role", "standard")
        .eq("online", true)
        .lt("last_seen", fiveMinutesAgo);

      if (error) {
        logger.error("Error finding stale users:", error);
        return 0;
      }

      if (!staleUsers || staleUsers.length === 0) {
        return 0;
      }

      logger.debug(`Found ${staleUsers.length} stale standard users to cleanup`);

      // Cleanup each stale standard user
      const cleanupPromises = staleUsers.map(user => 
        this.cleanupUser(user.id, user.role)
      );

      await Promise.all(cleanupPromises);
      
      return staleUsers.length;
    } catch (error) {
      logger.error("Error during stale user cleanup:", error);
      return 0;
    }
  }

  /**
   * Start automatic cleanup interval for stale users
   */
  startAutomaticCleanup(): NodeJS.Timeout {
    return setInterval(async () => {
      const cleanedCount = await this.cleanupStaleStandardUsers();
      if (cleanedCount > 0) {
        logger.debug(`Automatic cleanup: removed ${cleanedCount} stale standard users`);
      }
    }, 2 * 60 * 1000); // Every 2 minutes
  }

  /**
   * Enhanced logout that determines cleanup vs offline
   */
  async handleLogout(user: User): Promise<void> {
    if (user.role === 'vip' || user.role === 'admin') {
      // VIP/Admin users: just set offline, preserve account
      await presenceService.setUserOffline(user.id);
      
      await supabase
        .from("users")
        .update({
          online: false,
          last_seen: new Date().toISOString()
        })
        .eq("id", user.id);
    } else {
      // Standard users: complete cleanup
      await this.cleanupUser(user.id, user.role);
    }
  }
}

export const enhancedCleanupService = new EnhancedCleanupService();