import { createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { presenceService } from "./supabase";
import { createServiceLogger } from "../utils/logger";

const logger = createServiceLogger('IdleService');

class IdleService {
  private idleTimeout: number = 30 * 60 * 1000; // 30 minutes
  private idleTimer: NodeJS.Timeout | null = null;
  private lastActivity: number = Date.now();
  private userId: string | null = null;
  private navigate: any = null;

  // Initialize idle detection
  initialize(userId: string, navigate: any) {
    this.userId = userId;
    this.navigate = navigate;
    this.resetIdleTimer();
    this.setupEventListeners();
  }

  // Setup activity event listeners
  private setupEventListeners() {
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];

    events.forEach((event) => {
      document.addEventListener(event, () => this.handleActivity(), true);
    });

    // Also track visibility change
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        this.handleActivity();
      }
    });
  }

  // Handle user activity
  private handleActivity() {
    this.lastActivity = Date.now();

    // Update presence activity (no error handling needed - it's synchronous)
    if (this.userId) {
      try {
        presenceService.updateActivity(this.userId);
      } catch (error) {
        logger.warn("Failed to update presence activity:", error);
        // Don't throw error, just log it - presence is not critical
      }
    }

    this.resetIdleTimer();
  }

  // Reset idle timer
  private resetIdleTimer() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    this.idleTimer = setTimeout(() => {
      this.handleIdle();
    }, this.idleTimeout);
  }

  // Handle idle state
  private handleIdle() {
    if (this.navigate) {
      // Navigate to idle page with current session info
      this.navigate("/idle", {
        state: {
          userId: this.userId,
          idleAt: Date.now(),
        },
      });
    }
  }

  // Cleanup
  cleanup() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];
    events.forEach((event) => {
      document.removeEventListener(event, () => this.handleActivity(), true);
    });
  }

  // Get time until idle
  getTimeUntilIdle(): number {
    const elapsed = Date.now() - this.lastActivity;
    return Math.max(0, this.idleTimeout - elapsed);
  }
}

export const idleService = new IdleService();
