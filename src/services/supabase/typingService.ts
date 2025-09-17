import { supabase } from "../../config/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createServiceLogger } from "../../utils/logger";

const logger = createServiceLogger('TypingService');

interface TypingIndicator {
  userId: string;
  nickname: string;
  conversationId: string;
  isTyping: boolean;
  timestamp: number;
}

class TypingService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private readonly TYPING_TIMEOUT = 3000; // 3 seconds

  /**
   * Start typing indicator for a conversation
   */
  async startTyping(conversationId: string, userId: string, nickname: string): Promise<void> {
    try {
      const channel = this.getOrCreateChannel(conversationId);
      
      const typingData: TypingIndicator = {
        userId,
        nickname,
        conversationId,
        isTyping: true,
        timestamp: Date.now()
      };

      // Send typing indicator
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: typingData
      });

      // Set timeout to automatically stop typing
      this.clearTypingTimeout(userId);
      const timeout = setTimeout(() => {
        this.stopTyping(conversationId, userId, nickname);
      }, this.TYPING_TIMEOUT);
      
      this.typingTimeouts.set(userId, timeout);
    } catch (error) {
      logger.error('Error starting typing indicator:', error);
    }
  }

  /**
   * Stop typing indicator for a conversation
   */
  async stopTyping(conversationId: string, userId: string, nickname: string): Promise<void> {
    try {
      const channel = this.channels.get(`typing:${conversationId}`);
      if (!channel) return;

      const typingData: TypingIndicator = {
        userId,
        nickname,
        conversationId,
        isTyping: false,
        timestamp: Date.now()
      };

      // Send stop typing indicator
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: typingData
      });

      // Clear timeout
      this.clearTypingTimeout(userId);
    } catch (error) {
      logger.error('Error stopping typing indicator:', error);
    }
  }

  /**
   * Listen to typing indicators for a conversation
   */
  listenToTyping(
    conversationId: string,
    currentUserId: string,
    callback: (typingUsers: { userId: string; nickname: string }[]) => void
  ): () => void {
    const channel = this.getOrCreateChannel(conversationId);
    const typingUsers = new Map<string, { userId: string; nickname: string; timestamp: number }>();

    // Listen for typing events
    const unsubscribe = channel.on('broadcast', { event: 'typing' }, (payload) => {
      const data = payload.payload as TypingIndicator;
      
      // Ignore own typing events
      if (data.userId === currentUserId) return;

      if (data.isTyping) {
        typingUsers.set(data.userId, {
          userId: data.userId,
          nickname: data.nickname,
          timestamp: data.timestamp
        });
      } else {
        typingUsers.delete(data.userId);
      }

      // Clean up old typing indicators (older than 5 seconds)
      const now = Date.now();
      for (const [userId, user] of typingUsers.entries()) {
        if (now - user.timestamp > 5000) {
          typingUsers.delete(userId);
        }
      }

      // Notify with current typing users
      callback(Array.from(typingUsers.values()).map(user => ({
        userId: user.userId,
        nickname: user.nickname
      })));
    });

    // Cleanup old typing indicators every 2 seconds
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      let hasChanges = false;
      
      for (const [userId, user] of typingUsers.entries()) {
        if (now - user.timestamp > 5000) {
          typingUsers.delete(userId);
          hasChanges = true;
        }
      }

      if (hasChanges) {
        callback(Array.from(typingUsers.values()).map(user => ({
          userId: user.userId,
          nickname: user.nickname
        })));
      }
    }, 2000);

    return () => {
      clearInterval(cleanupInterval);
      this.removeChannel(conversationId);
    };
  }

  /**
   * Get or create a typing channel for a conversation
   */
  private getOrCreateChannel(conversationId: string): RealtimeChannel {
    const channelId = `typing:${conversationId}`;
    let channel = this.channels.get(channelId);

    if (!channel) {
      channel = supabase.channel(channelId, {
        config: {
          broadcast: { self: true }
        }
      });

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Connected to typing channel
        }
      });

      this.channels.set(channelId, channel);
    }

    return channel;
  }

  /**
   * Remove a typing channel
   */
  private removeChannel(conversationId: string): void {
    const channelId = `typing:${conversationId}`;
    const channel = this.channels.get(channelId);
    
    if (channel) {
      channel.unsubscribe();
      this.channels.delete(channelId);
    }
  }

  /**
   * Clear typing timeout for a user
   */
  private clearTypingTimeout(userId: string): void {
    const timeout = this.typingTimeouts.get(userId);
    if (timeout) {
      clearTimeout(timeout);
      this.typingTimeouts.delete(userId);
    }
  }

  /**
   * Update typing indicator (called on keypress)
   */
  async updateTyping(conversationId: string, userId: string, nickname: string): Promise<void> {
    await this.startTyping(conversationId, userId, nickname);
  }

  /**
   * Cleanup all channels and timeouts
   */
  cleanup(): void {
    // Clear all timeouts
    this.typingTimeouts.forEach(timeout => clearTimeout(timeout));
    this.typingTimeouts.clear();

    // Unsubscribe from all channels
    this.channels.forEach(channel => channel.unsubscribe());
    this.channels.clear();
  }

  /**
   * Get active typing channels count
   */
  getActiveChannelsCount(): number {
    return this.channels.size;
  }
}

export const typingService = new TypingService();
export type { TypingIndicator };