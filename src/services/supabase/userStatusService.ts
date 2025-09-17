import { supabase } from "../../config/supabase";
import type { User } from "../../types/user.types";
import { createServiceLogger } from "../../utils/logger";

const logger = createServiceLogger('UserStatusService');

export interface UserStatusUpdate {
  userId: string;
  status: 'active' | 'kicked' | 'banned' | 'offline';
  online: boolean;
  lastSeen?: string;
  kickedAt?: string;
  kickReason?: string;
  banExpiresAt?: string;
  banReason?: string;
  updatedBy?: string;
  timestamp: string;
}

export interface PresenceUpdate {
  userId: string;
  online: boolean;
  lastSeen: string;
  status?: string;
}

class UserStatusService {
  private readonly USER_STATUS_CHANNEL = 'user_status_updates';
  private readonly PRESENCE_CHANNEL = 'presence_updates';
  private statusSubscriptions = new Map<string, () => void>();
  private presenceSubscriptions = new Map<string, () => void>();

  // Broadcast user status update to all admin components
  async broadcastUserStatusUpdate(update: UserStatusUpdate): Promise<void> {
    try {
      const { error } = await supabase
        .channel(this.USER_STATUS_CHANNEL)
        .send({
          type: 'broadcast',
          event: 'user_status_changed',
          payload: update
        });

      if (error) {
        logger.error("Error broadcasting user status update:", error);
      }
    } catch (error) {
      logger.error("Error broadcasting user status update:", error);
    }
  }

  // Broadcast presence update (online/offline status)
  async broadcastPresenceUpdate(update: PresenceUpdate): Promise<void> {
    try {
      const { error } = await supabase
        .channel(this.PRESENCE_CHANNEL)
        .send({
          type: 'broadcast',
          event: 'presence_changed',
          payload: update
        });

      if (error) {
        logger.error("Error broadcasting presence update:", error);
      }
    } catch (error) {
      logger.error("Error broadcasting presence update:", error);
    }
  }

  // Subscribe to user status updates for admin dashboard
  subscribeToUserStatusUpdates(
    onStatusUpdate: (update: UserStatusUpdate) => void,
    subscriptionId?: string
  ): () => void {
    const id = subscriptionId || `status_${Date.now()}_${Math.random()}`;
    
    const channel = supabase
      .channel(`user_status_${id}`)
      .on('broadcast', { event: 'user_status_changed' }, (payload) => {
        onStatusUpdate(payload.payload);
      })
      .subscribe();

    const unsubscribe = () => {
      supabase.removeChannel(channel);
      this.statusSubscriptions.delete(id);
    };

    this.statusSubscriptions.set(id, unsubscribe);
    return unsubscribe;
  }

  // Subscribe to presence updates for real-time user lists
  subscribeToPresenceUpdates(
    onPresenceUpdate: (update: PresenceUpdate) => void,
    subscriptionId?: string
  ): () => void {
    const id = subscriptionId || `presence_${Date.now()}_${Math.random()}`;
    
    const channel = supabase
      .channel(`presence_${id}`)
      .on('broadcast', { event: 'presence_changed' }, (payload) => {
        onPresenceUpdate(payload.payload);
      })
      .subscribe();

    const unsubscribe = () => {
      supabase.removeChannel(channel);
      this.presenceSubscriptions.delete(id);
    };

    this.presenceSubscriptions.set(id, unsubscribe);
    return unsubscribe;
  }

  // Subscribe to database changes for user table
  subscribeToUserTableChanges(
    onUserChange: (user: User, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void,
    subscriptionId?: string
  ): () => void {
    const id = subscriptionId || `user_table_${Date.now()}_${Math.random()}`;
    
    const channel = supabase
      .channel(`user_changes_${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users'
        },
        (payload) => {
          const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
          const user = payload.new as User || payload.old as User;
          onUserChange(user, eventType);
        }
      )
      .subscribe();

    const unsubscribe = () => {
      supabase.removeChannel(channel);
    };

    return unsubscribe;
  }

  // Subscribe to database changes for presence table
  subscribeToPresenceTableChanges(
    onPresenceChange: (presence: any, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void,
    subscriptionId?: string
  ): () => void {
    const id = subscriptionId || `presence_table_${Date.now()}_${Math.random()}`;
    
    const channel = supabase
      .channel(`presence_changes_${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'presence'
        },
        (payload) => {
          const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
          const presence = payload.new || payload.old;
          onPresenceChange(presence, eventType);
        }
      )
      .subscribe();

    const unsubscribe = () => {
      supabase.removeChannel(channel);
    };

    return unsubscribe;
  }

  // Update user status and broadcast the change
  async updateUserStatus(
    userId: string,
    status: 'active' | 'kicked' | 'banned' | 'offline',
    additionalData?: {
      kickReason?: string;
      banReason?: string;
      banExpiresAt?: string;
      updatedBy?: string;
    }
  ): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      
      // Update user in database
      const updateData: any = {
        status,
        updated_at: timestamp
      };

      if (status === 'kicked') {
        updateData.kicked_at = timestamp;
        updateData.kick_reason = additionalData?.kickReason;
        updateData.is_kicked = true;
        updateData.online = false;
      } else if (status === 'banned') {
        updateData.ban_reason = additionalData?.banReason;
        updateData.ban_expires_at = additionalData?.banExpiresAt;
        updateData.is_banned = true;
        updateData.online = false;
      } else if (status === 'active') {
        updateData.kicked_at = null;
        updateData.kick_reason = null;
        updateData.is_kicked = false;
        updateData.ban_reason = null;
        updateData.ban_expires_at = null;
        updateData.is_banned = false;
      } else if (status === 'offline') {
        updateData.online = false;
        updateData.last_seen = timestamp;
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId);

      if (error) {
        throw new Error(error.message);
      }

      // Update presence if needed
      if (status === 'kicked' || status === 'banned' || status === 'offline') {
        await supabase
          .from('presence')
          .update({
            online: false,
            last_seen: timestamp
          })
          .eq('user_id', userId);
      }

      // Broadcast the status update
      await this.broadcastUserStatusUpdate({
        userId,
        status,
        online: status === 'active',
        lastSeen: status === 'offline' ? timestamp : undefined,
        kickedAt: status === 'kicked' ? timestamp : undefined,
        kickReason: additionalData?.kickReason,
        banExpiresAt: additionalData?.banExpiresAt,
        banReason: additionalData?.banReason,
        updatedBy: additionalData?.updatedBy,
        timestamp
      });

      // Also broadcast presence update
      await this.broadcastPresenceUpdate({
        userId,
        online: status === 'active',
        lastSeen: timestamp,
        status
      });

    } catch (error) {
      logger.error("Error updating user status:", error);
      throw error;
    }
  }

  // Get current user status from database
  async getUserStatus(userId: string): Promise<UserStatusUpdate | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          status,
          online,
          last_seen,
          kicked_at,
          kick_reason,
          ban_expires_at,
          ban_reason,
          is_kicked,
          is_banned,
          updated_at
        `)
        .eq('id', userId)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        userId: data.id,
        status: data.status || 'active',
        online: data.online || false,
        lastSeen: data.last_seen,
        kickedAt: data.kicked_at,
        kickReason: data.kick_reason,
        banExpiresAt: data.ban_expires_at,
        banReason: data.ban_reason,
        timestamp: data.updated_at || new Date().toISOString()
      };
    } catch (error) {
      logger.error("Error getting user status:", error);
      return null;
    }
  }

  // Get all users with their current status
  async getAllUsersStatus(): Promise<UserStatusUpdate[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          status,
          online,
          last_seen,
          kicked_at,
          kick_reason,
          ban_expires_at,
          ban_reason,
          is_kicked,
          is_banned,
          updated_at
        `)
        .order('updated_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return (data || []).map(user => ({
        userId: user.id,
        status: user.status || 'active',
        online: user.online || false,
        lastSeen: user.last_seen,
        kickedAt: user.kicked_at,
        kickReason: user.kick_reason,
        banExpiresAt: user.ban_expires_at,
        banReason: user.ban_reason,
        timestamp: user.updated_at || new Date().toISOString()
      }));
    } catch (error) {
      logger.error("Error getting all users status:", error);
      return [];
    }
  }

  // Cleanup all subscriptions
  cleanup(): void {
    // Cleanup status subscriptions
    this.statusSubscriptions.forEach(unsubscribe => {
      try {
        unsubscribe();
      } catch (error) {
        logger.error("Error cleaning up status subscription:", error);
      }
    });
    this.statusSubscriptions.clear();

    // Cleanup presence subscriptions
    this.presenceSubscriptions.forEach(unsubscribe => {
      try {
        unsubscribe();
      } catch (error) {
        logger.error("Error cleaning up presence subscription:", error);
      }
    });
    this.presenceSubscriptions.clear();
  }

  // Connection management and reconnection handling
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second

  async handleConnectionLoss(): Promise<void> {
    logger.debug("Connection lost, attempting to reconnect...");
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error("Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;
    
    try {
      // Wait before attempting reconnection
      await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
      
      // Test connection with a simple query
      const { error } = await supabase
        .from('users')
        .select('id')
        .limit(1);

      if (!error) {
        logger.debug("Connection restored");
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000; // Reset delay
      } else {
        // Exponential backoff
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30 seconds
        await this.handleConnectionLoss();
      }
    } catch (error) {
      logger.error("Reconnection failed:", error);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
      await this.handleConnectionLoss();
    }
  }

  // Monitor connection status
  monitorConnection(): () => void {
    const channel = supabase
      .channel('connection_monitor')
      .on('system', {}, (payload) => {
        if (payload.status === 'CLOSED') {
          this.handleConnectionLoss();
        } else if (payload.status === 'CHANNEL_ERROR') {
          logger.error("Channel error:", payload);
          this.handleConnectionLoss();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

export const userStatusService = new UserStatusService();