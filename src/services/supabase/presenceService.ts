import { supabase } from "../../config/supabase";
import type { User } from "../../types/user.types";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createServiceLogger } from "../../utils/logger";
import { sessionManager } from "../sessionManager";

const logger = createServiceLogger('PresenceService');

interface PresenceData {
  user_id: string;
  online: boolean;
  last_seen: string;
  nickname: string;
  gender: "male" | "female";
  age: number;
  country: string;
  role: string;
  avatar: string;
  joined_at: string;
}

class PresenceService {
  private presenceChannel: RealtimeChannel | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private cleanupTimeoutInterval: NodeJS.Timeout | null = null;
  private listeners: (() => void)[] = [];
  private lastActivityUpdate: number = 0;
  private activityUpdateThrottle: number = 30000; // 30 seconds throttle
  private currentUserId: string | null = null;
  private browserEventsSetup: boolean = false;
  // Store actual handler references for proper cleanup
  private browserHandlers: {
    handleBeforeUnload?: (e: BeforeUnloadEvent) => any;
    handleUnload?: () => void;
    handleVisibilityChange?: () => void;
  } = {};

  // Set user online
  async setUserOnline(user: User): Promise<void> {
    const userId = user.id;
    this.currentUserId = userId;
    
    // Set up browser event handlers for cleanup
    this.setupBrowserEventHandlers();
    
    // Set up enhanced cleanup for this user
    const { enhancedCleanupService } = await import('./enhancedCleanupService');
    enhancedCleanupService.setupBrowserCleanupHandlers(user);
    
    const presenceData: PresenceData = {
      user_id: user.id,
      online: true,
      last_seen: new Date().toISOString(),
      nickname: user.nickname,
      gender: user.gender,
      age: user.age,
      country: user.country,
      role: user.role,
      avatar: user.avatar || `/avatars/standard/${user.gender}.png`,
      joined_at: new Date().toISOString(),
    };

    try {
      // Upsert user presence in database
      const { error } = await supabase
        .from("presence")
        .upsert([presenceData], {
          onConflict: "user_id"
        });

      if (error) {
        logger.error("Error setting user online:", error);
        throw error;
      }

      // Set up realtime presence channel
      this.presenceChannel = supabase.channel(`presence:${userId}`, {
        config: {
          presence: {
            key: userId,
          },
        },
      });

      // Track user in realtime presence
      await this.presenceChannel
        .on("presence", { event: "sync" }, () => {
          // Handle presence sync
        })
        .on("presence", { event: "join" }, ({ key, newPresences }) => {
          // Handle user join
        })
        .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
          // Handle user leave
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            // Track this user's presence
            await this.presenceChannel?.track(presenceData);
          }
        });

      // DISABLED: Heartbeat was causing auth failures and user disappearing
      // Instead, rely on sessionManager for session health
      // this.heartbeatInterval = setInterval(() => {
      //   this.updateActivity(userId);
      // }, 30000);

      // Set up automatic cleanup for stale users every 2 minutes
      this.cleanupTimeoutInterval = setInterval(() => {
        this.cleanupStaleUsers();
      }, 120000); // 2 minutes

      this.listeners.push(() => {
        if (this.heartbeatInterval) {
          clearInterval(this.heartbeatInterval);
          this.heartbeatInterval = null;
        }
        if (this.cleanupTimeoutInterval) {
          clearInterval(this.cleanupTimeoutInterval);
          this.cleanupTimeoutInterval = null;
        }
      });
    } catch (error) {
      logger.error("Error setting up presence:", error);
      throw error;
    }
  }

  // Set user offline and cleanup
  async setUserOffline(userId: string): Promise<void> {
    try {
      // First, remove from presence table (most important for user list)
      await supabase
        .from("presence")
        .delete()
        .eq("user_id", userId);

      // Update any remaining presence records to offline
      await supabase
        .from("presence")
        .update({
          online: false,
          last_seen: new Date().toISOString()
        })
        .eq("user_id", userId);

      // Clean up heartbeat and intervals first
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      if (this.cleanupTimeoutInterval) {
        clearInterval(this.cleanupTimeoutInterval);
        this.cleanupTimeoutInterval = null;
      }

      // Clean up all listeners
      this.listeners.forEach((cleanup) => cleanup());
      this.listeners = [];

      // Finally, unsubscribe from presence channel
      if (this.presenceChannel) {
        await this.presenceChannel.unsubscribe();
        this.presenceChannel = null;
      }
    } catch (error) {
      logger.error("Error setting user offline:", error);
    }
  }

  // Listen to online users
  listenToOnlineUsers(callback: (users: User[]) => void): () => void {
    // Set up realtime subscription for presence table
    const subscription = supabase
      .channel("presence-table")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "presence"
      }, (payload) => {
        // Refresh online users when presence changes
        this.getOnlineUsers().then(callback);
      })
      .subscribe();

    // Also get initial online users
    this.getOnlineUsers().then(callback);

    // Return unsubscribe function
    return () => {
      subscription.unsubscribe();
    };
  }

  // Get online users from database
  private async getOnlineUsers(): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from("presence")
        .select("*")
        .eq("online", true)
        .order("joined_at", { ascending: false });

      if (error) {
        logger.error("Error fetching online users:", error);
        return [];
      }

      // Convert to User format
      return (data || []).map((presence: PresenceData) => ({
        id: presence.user_id,
        nickname: presence.nickname,
        gender: presence.gender,
        age: presence.age,
        country: presence.country,
        role: presence.role,
        status: "active" as const,
        online: presence.online,
        avatar: presence.avatar,
        createdAt: presence.joined_at,
      }));
    } catch (error) {
      logger.error("Error getting online users:", error);
      return [];
    }
  }

  // Update user activity (safe version using sessionManager)
  updateActivity(userId: string): void {
    // Simply update session manager activity - no risky DB calls
    sessionManager.updateActivity();

    // Update throttle timestamp
    this.lastActivityUpdate = Date.now();
  }

  // Check if user exists online (for nickname uniqueness)
  async isNicknameOnline(nickname: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from("presence")
        .select("user_id")
        .eq("online", true)
        .ilike("nickname", nickname);

      if (error) {
        logger.error("Error checking nickname:", error);
        return false;
      }

      return (data?.length || 0) > 0;
    } catch (error) {
      logger.error("Error checking nickname:", error);
      return false;
    }
  }

  // Get online user count
  async getOnlineCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from("presence")
        .select("*", { count: "exact", head: true })
        .eq("online", true);

      if (error) {
        logger.error("Error getting online count:", error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      logger.error("Error getting online count:", error);
      return 0;
    }
  }

  // Clean up all resources
  async cleanup(): Promise<void> {
    if (this.currentUserId) {
      await this.setUserOffline(this.currentUserId);
    }
    this.removeBrowserEventHandlers();
    
    // Clean up enhanced cleanup handlers
    const { enhancedCleanupService } = await import('./enhancedCleanupService');
    enhancedCleanupService.removeBrowserCleanupHandlers();
  }

  // Set up browser event handlers for proper cleanup
  private setupBrowserEventHandlers(): void {
    if (this.browserEventsSetup) return;

    // Handle tab close, refresh, navigation away
    this.browserHandlers.handleBeforeUnload = () => {
      if (this.currentUserId) {
        // Try immediate synchronous cleanup first (most reliable)
        try {
          // Use synchronous XMLHttpRequest for better reliability during unload
          const xhr = new XMLHttpRequest();
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

          // Immediate presence deletion (most critical)
          xhr.open('DELETE', `${supabaseUrl}/rest/v1/presence?user_id=eq.${this.currentUserId}`, false);
          xhr.setRequestHeader('apikey', anonKey);
          xhr.setRequestHeader('Authorization', `Bearer ${anonKey}`);
          xhr.send();
        } catch (error) {
          logger.warn('Sync cleanup failed:', error);
        }

        // Backup: Use sendBeacon for emergency cleanup
        if (navigator.sendBeacon) {
          const cleanupPayload = JSON.stringify({
            user_id: this.currentUserId,
            cleanup_timestamp: new Date().toISOString()
          });

          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

          // Try sendBeacon to emergency function
          navigator.sendBeacon(
            `${supabaseUrl}/rest/v1/rpc/emergency_user_offline?apikey=${anonKey}`,
            new Blob([cleanupPayload], {
              type: 'application/json'
            })
          );
        }

        // Also try async cleanup (might not complete but worth trying)
        this.setUserOffline(this.currentUserId);
      }
    };

    this.browserHandlers.handleUnload = () => {
      if (this.currentUserId) {
        // Final attempt at cleanup with synchronous request
        try {
          const xhr = new XMLHttpRequest();
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

          // Quick synchronous presence deletion
          xhr.open('DELETE', `${supabaseUrl}/rest/v1/presence?user_id=eq.${this.currentUserId}`, false);
          xhr.setRequestHeader('apikey', anonKey);
          xhr.setRequestHeader('Authorization', `Bearer ${anonKey}`);
          xhr.send();
        } catch (error) {
          // Silently fail - this is a last-ditch effort
        }
      }
    };

    this.browserHandlers.handleVisibilityChange = () => {
      if (document.hidden && this.currentUserId) {
        // User switched to another tab/app - update activity but don't set offline
        this.updateActivity(this.currentUserId);
      }
    };

    window.addEventListener('beforeunload', this.browserHandlers.handleBeforeUnload);
    window.addEventListener('unload', this.browserHandlers.handleUnload);
    window.addEventListener('pagehide', this.browserHandlers.handleUnload);
    document.addEventListener('visibilitychange', this.browserHandlers.handleVisibilityChange);

    this.browserEventsSetup = true;
  }

  // Remove browser event handlers
  private removeBrowserEventHandlers(): void {
    if (!this.browserEventsSetup) return;

    // Remove actual handler references
    if (this.browserHandlers.handleBeforeUnload) {
      window.removeEventListener('beforeunload', this.browserHandlers.handleBeforeUnload);
    }
    if (this.browserHandlers.handleUnload) {
      window.removeEventListener('unload', this.browserHandlers.handleUnload);
      window.removeEventListener('pagehide', this.browserHandlers.handleUnload);
    }
    if (this.browserHandlers.handleVisibilityChange) {
      document.removeEventListener('visibilitychange', this.browserHandlers.handleVisibilityChange);
    }

    // Clear handler references
    this.browserHandlers = {};
    this.browserEventsSetup = false;
  }

  // Clean up stale users (no activity for more than 5 minutes)
  private async cleanupStaleUsers(): Promise<void> {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { error } = await supabase
        .from("presence")
        .update({ online: false })
        .lt('last_seen', fiveMinutesAgo)
        .eq('online', true);

      if (error) {
        logger.error('Error cleaning up stale users:', error);
      } else {
        // Cleaned up stale users
      }
    } catch (error) {
      logger.error('Error in cleanupStaleUsers:', error);
    }
  }
}

export const presenceService = new PresenceService();