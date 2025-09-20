import { supabase } from "../config/supabase";
import { createServiceLogger } from "../utils/logger";

const logger = createServiceLogger('AuthProxy');

/**
 * NUCLEAR SOLUTION: Complete auth call interception
 * This proxy intercepts ALL auth calls and prevents 403 cascades
 */
class AuthProxy {
  private sessionValid: boolean = true;
  private lastValidSession: any = null;
  private authCallsDisabled: boolean = false;
  private failureCount: number = 0;
  private maxFailures: number = 2;

  // Enable/disable all auth calls globally
  disableAuthCalls(): void {
    this.authCallsDisabled = true;
    this.sessionValid = false;
    logger.warn("All auth calls DISABLED due to persistent failures");
  }

  enableAuthCalls(): void {
    this.authCallsDisabled = false;
    this.failureCount = 0;
    logger.info("Auth calls re-enabled");
  }

  // Safe auth user getter - NEVER throws, NEVER spams
  async getSafeUser(): Promise<{ user: any | null; error: any | null }> {
    // If auth calls are disabled, return cached session
    if (this.authCallsDisabled) {
      return { user: this.lastValidSession, error: null };
    }

    // If we know session is invalid, don't even try
    if (!this.sessionValid) {
      return { user: null, error: new Error("Session known to be invalid") };
    }

    try {
      // Try to get session first (lighter call)
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        this.handleAuthFailure();
        return { user: null, error: sessionError || new Error("No session") };
      }

      // Session exists, try to get user
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        if (userError.message?.includes('403') || userError.status === 403) {
          this.handleAuthFailure();
          return { user: null, error: userError };
        }
        return { user: null, error: userError };
      }

      // Success - reset failure counter and cache valid session
      this.failureCount = 0;
      this.sessionValid = true;
      this.lastValidSession = user;

      return { user, error: null };

    } catch (error: any) {
      this.handleAuthFailure();
      return { user: null, error };
    }
  }

  // Handle auth failure with circuit breaker
  private handleAuthFailure(): void {
    this.failureCount++;
    this.sessionValid = false;

    if (this.failureCount >= this.maxFailures) {
      logger.error(`Auth failure limit reached (${this.failureCount}), disabling all auth calls`);
      this.disableAuthCalls();
    } else {
      logger.warn(`Auth failure ${this.failureCount}/${this.maxFailures}`);
    }
  }

  // Safe database operation wrapper
  async safeDbOperation<T>(operation: () => Promise<T>): Promise<T | null> {
    // If auth is disabled, block all DB operations
    if (this.authCallsDisabled || !this.sessionValid) {
      logger.warn("DB operation blocked - auth disabled or invalid");
      return null;
    }

    try {
      const result = await operation();
      return result;
    } catch (error: any) {
      // Check for auth errors
      if (error.message?.includes('403') ||
          error.message?.includes('401') ||
          error.message?.includes('Forbidden') ||
          error.status === 403 ||
          error.status === 401) {
        this.handleAuthFailure();
        throw new Error("Session expired. Please refresh the page.");
      }
      throw error;
    }
  }

  // Force session refresh (manual override)
  async forceRefresh(): Promise<boolean> {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        this.handleAuthFailure();
        return false;
      }

      // Success - re-enable auth calls
      this.sessionValid = true;
      this.failureCount = 0;
      this.authCallsDisabled = false;

      return true;
    } catch (error) {
      this.handleAuthFailure();
      return false;
    }
  }

  // Get current status
  getStatus(): { valid: boolean; disabled: boolean; failures: number } {
    return {
      valid: this.sessionValid,
      disabled: this.authCallsDisabled,
      failures: this.failureCount
    };
  }

  // Reset auth proxy (for new sessions)
  reset(): void {
    this.sessionValid = true;
    this.authCallsDisabled = false;
    this.failureCount = 0;
    this.lastValidSession = null;
    logger.info("Auth proxy reset for new session");
  }
}

export const authProxy = new AuthProxy();