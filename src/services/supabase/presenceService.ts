import { supabase } from "../../config/supabase";
import type { User } from "../../types/user.types";
import { createServiceLogger } from "../../utils/logger";

const logger = createServiceLogger('PresenceService');

export interface PresenceUser {
  user_id: string;
  nickname: string;
  gender: 'male' | 'female';
  age: number;
  country: string;
  role: 'standard' | 'vip' | 'admin';
  avatar: string;
  online: boolean;
  last_seen: string;
  joined_at: string;
}

class PresenceService {
  private heartbeatInterval: number | null = null;
  private sessionId: string;
  private currentUserId: string | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly CLEANUP_INTERVAL = 60000; // 1 minute
  private cleanupInterval: number | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupBeforeUnloadHandler();
    this.startCleanupScheduler();
  }

  // Generate unique session ID
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Setup handler for when user closes browser/tab
  private setupBeforeUnloadHandler(): void {
    if (typeof window !== 'undefined') {
      // Handle page unload (browser close, tab close, navigation)
      window.addEventListener('beforeunload', () => {
        if (this.currentUserId) {
          // Use sendBeacon for reliable delivery even when page is unloading
          const data = JSON.stringify({
            user_id: this.currentUserId,
            session_id: this.sessionId
          });
          
          if (navigator.sendBeacon) {
            // This is the most reliable way to send data on page unload
            navigator.sendBeacon('/api/user-disconnect', data);
          }
          
          // Also try the synchronous approach as fallback
          this.markOfflineSync();
        }
      });

      // Handle visibility change (tab switching, minimizing)
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          // User switched away from tab - reduce heartbeat frequency
          this.reduceHeartbeatFrequency();
        } else {
          // User returned to tab - resume normal heartbeat
          this.resumeNormalHeartbeat();
        }
      });

      // Handle online/offline events
      window.addEventListener('offline', () => {
        logger.debug('User went offline');
        if (this.currentUserId) {
          this.markOffline(this.currentUserId);
        }
      });

      window.addEventListener('online', () => {
        logger.debug('User came back online');
        if (this.currentUserId) {
          this.sendHeartbeat();
        }
      });
    }
  }

  // Start the cleanup scheduler
  private startCleanupScheduler(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = window.setInterval(async () => {
      try {
        await this.runScheduledCleanup();
      } catch (error) {
        logger.error('Error in scheduled cleanup:', error);
      }
    }, this.CLEANUP_INTERVAL);
  }

  // Join user to presence system
  async joinPresence(userId: string): Promise<void> {
    try {
      this.currentUserId = userId;
      
      // Update user heartbeat and mark as online
      const { error } = await supabase.rpc('update_user_heartbeat', {
        p_user_id: userId,
        p_session_id: this.sessionId,
        p_user_agent: navigator.userAgent,
        p_ip_address: null // Will be set by server if needed
      });

      if (error) {
        throw new Error(error.message);
      }

      // Start heartbeat interval
      this.startHeartbeat();

      logger.debug(`User ${userId} joined presence with session ${this.sessionId}`);
    } catch (error) {
      logger.error('Error joining presence:', error);
      throw error;
    }
  }

  // Leave presence system
  async leavePresence(): Promise<void> {
    try {
      if (this.currentUserId) {
        await this.markOffline(this.currentUserId);
        this.currentUserId = null;
      }
      
      this.stopHeartbeat();
      logger.debug('Left presence system');
    } catch (error) {
      logger.error('Error leaving presence:', error);
    }
  }

  // Start sending heartbeats
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = window.setInterval(() => {
      this.sendHeartbeat();
    }, this.HEARTBEAT_INTERVAL);

    // Send initial heartbeat
    this.sendHeartbeat();
  }

  // Stop sending heartbeats
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Send heartbeat to keep user marked as online
  private async sendHeartbeat(): Promise<void> {
    if (!this.currentUserId) return;

    try {
      const { error } = await supabase.rpc('update_user_heartbeat', {
        p_user_id: this.currentUserId,
        p_session_id: this.sessionId
      });

      if (error) {
        logger.error('Heartbeat error:', error);
        // Try to reconnect on next heartbeat
      }
    } catch (error) {
      logger.error('Error sending heartbeat:', error);
    }
  }

  // Mark user as offline
  async markOffline(userId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('handle_user_disconnect', {
        p_user_id: userId,
        p_session_id: this.sessionId
      });

      if (error) {
        logger.error('Error marking user offline:', error);
      }
    } catch (error) {
      logger.error('Error in markOffline:', error);
    }
  }

  // Synchronous version for page unload
  private markOfflineSync(): void {
    if (!this.currentUserId) return;

    try {
      // Use fetch with keepalive for better reliability during page unload
      fetch('/api/user-disconnect', {
        method: 'POST',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: this.currentUserId,
          session_id: this.sessionId
        })
      }).catch(error => {
        logger.error('Error in sync offline:', error);
      });
    } catch (error) {
      logger.error('Error in markOfflineSync:', error);
    }
  }

  // Get list of active users
  async getActiveUsers(): Promise<PresenceUser[]> {
    try {
      const { data, error } = await supabase.rpc('get_active_users');

      if (error) {
        throw new Error(error.message);
      }

      return data || [];
    } catch (error) {
      logger.error('Error getting active users:', error);
      return [];
    }
  }

  // Subscribe to presence changes
  subscribeToPresenceChanges(
    onUserJoined: (user: PresenceUser) => void,
    onUserLeft: (userId: string) => void,
    onUserUpdated: (user: PresenceUser) => void
  ): () => void {
    const channel = supabase
      .channel('presence_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'presence'
        },
        (payload) => {
          const eventType = payload.eventType;
          const user = payload.new as PresenceUser;
          const oldUser = payload.old as PresenceUser;

          if (eventType === 'INSERT' && user?.online) {
            onUserJoined(user);
          } else if (eventType === 'DELETE' || (eventType === 'UPDATE' && !user?.online)) {
            const userId = user?.user_id || oldUser?.user_id;
            if (userId) {
              onUserLeft(userId);
            }
          } else if (eventType === 'UPDATE' && user?.online) {
            onUserUpdated(user);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  // Run scheduled cleanup
  private async runScheduledCleanup(): Promise<void> {
    try {
      const { error } = await supabase.rpc('scheduled_presence_cleanup');
      
      if (error) {
        logger.error('Scheduled cleanup error:', error);
      }
    } catch (error) {
      logger.error('Error in scheduled cleanup:', error);
    }
  }

  // Reduce heartbeat frequency when tab is not visible
  private reduceHeartbeatFrequency(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      // Reduce to every 2 minutes when tab is hidden
      this.heartbeatInterval = window.setInterval(() => {
        this.sendHeartbeat();
      }, 120000);
    }
  }

  // Resume normal heartbeat frequency
  private resumeNormalHeartbeat(): void {
    if (this.currentUserId) {
      this.startHeartbeat();
    }
  }

  // Manual cleanup trigger (for admin use)
  async triggerCleanup(): Promise<{ cleaned: number }> {
    try {
      const { data, error } = await supabase.rpc('cleanup_stale_presence');

      if (error) {
        throw new Error(error.message);
      }

      return { cleaned: data || 0 };
    } catch (error) {
      logger.error('Error triggering cleanup:', error);
      return { cleaned: 0 };
    }
  }

  // Get presence statistics
  async getPresenceStats(): Promise<{
    totalOnline: number;
    totalUsers: number;
    staleUsers: number;
  }> {
    try {
      const { data: onlineData, error: onlineError } = await supabase
        .from('presence')
        .select('user_id', { count: 'exact' })
        .eq('online', true);

      const { data: totalData, error: totalError } = await supabase
        .from('users')
        .select('id', { count: 'exact' })
        .eq('status', 'active');

      const { data: staleData, error: staleError } = await supabase
        .from('presence')
        .select('user_id', { count: 'exact' })
        .eq('online', true)
        .lt('heartbeat_at', new Date(Date.now() - 2 * 60 * 1000).toISOString());

      if (onlineError || totalError || staleError) {
        throw new Error('Error fetching presence stats');
      }

      return {
        totalOnline: onlineData?.length || 0,
        totalUsers: totalData?.length || 0,
        staleUsers: staleData?.length || 0
      };
    } catch (error) {
      logger.error('Error getting presence stats:', error);
      return {
        totalOnline: 0,
        totalUsers: 0,
        staleUsers: 0
      };
    }
  }

  // Cleanup on service destruction
  cleanup(): void {
    this.stopHeartbeat();
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.currentUserId) {
      this.markOffline(this.currentUserId);
    }
  }
}

export const presenceService = new PresenceService();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    presenceService.cleanup();
  });
}