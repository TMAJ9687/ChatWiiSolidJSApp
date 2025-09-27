import { supabase } from "../config/supabase";
import { authService } from "./supabase/authService";
import { presenceService } from "./supabase/presenceService";
import { createServiceLogger } from "../utils/logger";
import type { User } from "../types/user.types";

const logger = createServiceLogger('SessionManager');

class SessionManager {
  private user: User | null = null;
  private sessionValid: boolean = false;
  private lastSessionCheck: number = 0;
  private sessionCheckInterval: number = 60000; // 1 minute
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private sessionRefreshInterval: NodeJS.Timeout | null = null;
  private navigateFunction: any = null;

  // Initialize session manager
  async initialize(user: User, navigate: any): Promise<void> {
    this.user = user;
    this.navigateFunction = navigate;
    this.sessionValid = true;
    this.lastSessionCheck = Date.now();

    logger.info("SessionManager initialized for user:", user.nickname);

    // Start session monitoring
    this.startSessionMonitoring();
    this.startSessionRefresh();
  }

  // Start session monitoring without making auth calls
  private startSessionMonitoring(): void {
    // Check session validity every minute WITHOUT making API calls
    this.heartbeatInterval = setInterval(() => {
      this.checkSessionHealth();
    }, this.sessionCheckInterval);
  }

  // Check session health without API calls
  private checkSessionHealth(): void {
    const now = Date.now();

    // If we haven't checked session in a while, mark as potentially stale
    if (now - this.lastSessionCheck > 5 * 60 * 1000) { // 5 minutes
      logger.warn("Session potentially stale, will refresh on next activity");
    }

    // Update activity timestamp to prevent idle logout
    this.lastSessionCheck = now;
  }

  // Start proactive session refresh every 45 minutes
  private startSessionRefresh(): void {
    this.sessionRefreshInterval = setInterval(async () => {
      await this.refreshSession();
    }, 45 * 60 * 1000); // 45 minutes
  }

  // Refresh session proactively
  private async refreshSession(): Promise<void> {
    // Don't refresh if session is already invalid or user is null
    if (!this.sessionValid || !this.user) {
      logger.debug("Skipping session refresh - session invalid or user logged out");
      return;
    }

    try {
      logger.info("Proactively refreshing session...");

      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        logger.error("Session refresh failed:", error);
        await this.handleSessionExpiry();
      } else {
        logger.info("Session refreshed successfully");
        this.sessionValid = true;
        this.lastSessionCheck = Date.now();
      }
    } catch (error) {
      logger.error("Error refreshing session:", error);
      await this.handleSessionExpiry();
    }
  }

  // Handle session expiry gracefully
  private async handleSessionExpiry(): Promise<void> {
    logger.warn("Session expired, cleaning up and redirecting...");

    this.sessionValid = false;

    try {
      // Clean up user presence without auth calls
      if (this.user) {
        await this.cleanupUserPresence();
      }
    } catch (error) {
      logger.error("Error during session cleanup:", error);
    }

    // Redirect to landing page (feedback disabled)
    if (this.navigateFunction) {
      this.navigateFunction("/");
    }
  }

  // Clean up user presence without auth calls
  private async cleanupUserPresence(): Promise<void> {
    if (!this.user?.id) {
      logger.warn("Cannot cleanup presence: user or user ID is null");
      return;
    }

    try {
      // Just update presence table directly without auth verification
      await supabase
        .from("presence")
        .delete()
        .eq("user_id", this.user.id);

      logger.info("User presence cleaned up");
    } catch (error) {
      logger.warn("Could not clean up presence:", error);
      // Don't throw - this is cleanup, not critical
    }
  }

  // Safe database operation wrapper
  async safeDbOperation<T>(operation: () => Promise<T>): Promise<T | null> {
    // If session is known to be invalid, don't even try
    if (!this.sessionValid) {
      logger.warn("Skipping DB operation - session invalid");
      return null;
    }

    try {
      const result = await operation();
      // Operation succeeded, session is still valid
      this.lastSessionCheck = Date.now();
      return result;
    } catch (error: any) {
      // Check for auth errors
      if (error.message?.includes('403') ||
          error.message?.includes('Forbidden') ||
          error.status === 403) {
        logger.warn("DB operation failed with auth error, marking session invalid");
        this.sessionValid = false;
        // Don't handle expiry immediately, let the next heartbeat do it
      }
      throw error;
    }
  }

  // Get current user safely
  getCurrentUser(): User | null {
    return this.sessionValid ? this.user : null;
  }

  // Check if session is valid
  isSessionValid(): boolean {
    return this.sessionValid;
  }

  // Manual session refresh trigger
  async forceRefresh(): Promise<boolean> {
    try {
      await this.refreshSession();
      return this.sessionValid;
    } catch (error) {
      return false;
    }
  }

  // Cleanup
  cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.sessionRefreshInterval) {
      clearInterval(this.sessionRefreshInterval);
      this.sessionRefreshInterval = null;
    }

    this.user = null;
    this.sessionValid = false;
  }

  // Update activity without making API calls
  updateActivity(): void {
    this.lastSessionCheck = Date.now();

    // If session was marked invalid but user is active, try to refresh
    // But only if user is still logged in
    if (!this.sessionValid && this.user) {
      logger.info("User active with invalid session, attempting refresh...");
      this.refreshSession();
    }
  }
}

export const sessionManager = new SessionManager();