import { supabase } from "../../config/supabase";
import type { User } from "../../types/user.types";
import type { RealtimeChannel } from "@supabase/supabase-js";

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
        console.error("Error setting user online:", error);
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

      // Set up heartbeat to update last_seen every 30 seconds
      this.heartbeatInterval = setInterval(() => {
        this.updateActivity(userId);
      }, 30000);

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
      console.error("Error setting up presence:", error);
      throw error;
    }
  }

  // Set user offline and cleanup
  async setUserOffline(userId: string): Promise<void> {
    try {
      // Update presence in database
      await supabase
        .from("presence")
        .update({
          online: false,
          last_seen: new Date().toISOString()
        })
        .eq("user_id", userId);

      // Unsubscribe from presence channel
      if (this.presenceChannel) {
        await this.presenceChannel.unsubscribe();
        this.presenceChannel = null;
      }

      // Clean up heartbeat
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      // Clean up all listeners
      this.listeners.forEach((cleanup) => cleanup());
      this.listeners = [];

      // Remove from presence table
      await supabase
        .from("presence")
        .delete()
        .eq("user_id", userId);
    } catch (error) {
      console.error("Error setting user offline:", error);
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
        console.error("Error fetching online users:", error);
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
      console.error("Error getting online users:", error);
      return [];
    }
  }

  // Update user activity (called on user interaction)
  updateActivity(userId: string): void {
    const now = Date.now();
    
    // Throttle activity updates to prevent spam
    if (now - this.lastActivityUpdate < this.activityUpdateThrottle) {
      return; // Skip update if within throttle period
    }
    
    this.lastActivityUpdate = now;
    
    supabase
      .from("presence")
      .update({
        last_seen: new Date().toISOString()
      })
      .eq("user_id", userId)
      .then(({ error }) => {
        if (error) {
          console.error("Error updating activity:", error);
        }
      });
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
        console.error("Error checking nickname:", error);
        return false;
      }

      return (data?.length || 0) > 0;
    } catch (error) {
      console.error("Error checking nickname:", error);
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
        console.error("Error getting online count:", error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error("Error getting online count:", error);
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
    const handleBeforeUnload = () => {
      if (this.currentUserId) {
        // Use sendBeacon for reliable cleanup on page unload
        const data = JSON.stringify({ user_id: this.currentUserId });
        navigator.sendBeacon('/api/presence/offline', data);
        
        // Also try immediate cleanup (might not complete)
        this.setUserOffline(this.currentUserId);
      }
    };

    const handleUnload = () => {
      if (this.currentUserId) {
        this.setUserOffline(this.currentUserId);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && this.currentUserId) {
        // User switched to another tab/app - update activity but don't set offline
        this.updateActivity(this.currentUserId);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    this.browserEventsSetup = true;
  }

  // Remove browser event handlers
  private removeBrowserEventHandlers(): void {
    if (!this.browserEventsSetup) return;

    const handleBeforeUnload = () => {};
    const handleUnload = () => {};
    const handleVisibilityChange = () => {};

    window.removeEventListener('beforeunload', handleBeforeUnload);
    window.removeEventListener('unload', handleUnload);
    window.removeEventListener('pagehide', handleUnload);
    document.removeEventListener('visibilitychange', handleVisibilityChange);

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
        console.error('Error cleaning up stale users:', error);
      } else {
        // Cleaned up stale users
      }
    } catch (error) {
      console.error('Error in cleanupStaleUsers:', error);
    }
  }
}

export const presenceService = new PresenceService();