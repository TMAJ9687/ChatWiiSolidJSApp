import { supabase } from "../../config/supabase";
import type { Database } from "../../types/database.types";
import { createServiceLogger } from "../../utils/logger";

const logger = createServiceLogger('ConversationService');

interface ConversationStats {
  totalMessages: number;
  textMessages: number;
  imageMessages: number;
  voiceMessages: number;
  oldestMessage: number;
  newestMessage: number;
}

interface Conversation {
  id: string;
  userId1: string;
  userId2: string;
  lastMessage: string;
  lastMessageId: string;
  lastMessageSender: string;
  updatedAt: string;
  createdAt: string;
}

class ConversationService {
  /**
   * Get list of conversations for a user (based on messages)
   */
  async getUserConversations(userId: string): Promise<Conversation[]> {
    try {
      // Get all messages where user is sender or receiver, grouped by conversation
      const { data, error } = await supabase
        .from("messages")
        .select(`
          conversation_id,
          sender_id,
          receiver_id,
          content,
          created_at,
          id,
          sender_nickname
        `)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Group messages by conversation_id and get the latest message for each
      const conversationMap = new Map<string, any>();
      
      for (const message of data) {
        const conversationId = message.conversation_id;
        
        if (!conversationMap.has(conversationId)) {
          // Determine the other user ID
          const otherUserId = message.sender_id === userId ? message.receiver_id : message.sender_id;
          
          conversationMap.set(conversationId, {
            id: conversationId,
            userId1: userId,
            userId2: otherUserId,
            lastMessage: message.content || '',
            lastMessageId: message.id,
            lastMessageSender: message.sender_nickname || 'Unknown',
            updatedAt: message.created_at,
            createdAt: message.created_at
          });
        }
      }

      return Array.from(conversationMap.values())
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch (error) {
      logger.error('Error getting user conversations:', error);
      return [];
    }
  }

  /**
   * Get conversation statistics between two users
   */
  async getConversationStats(userId1: string, userId2: string): Promise<ConversationStats> {
    try {
      const conversationId = this.getConversationId(userId1, userId2);
      
      const { data, error } = await supabase
        .from("messages")
        .select("type, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        throw error;
      }

      const messages = data || [];

      // Calculate statistics
      const stats: ConversationStats = {
        totalMessages: messages.length,
        textMessages: messages.filter(m => m.type === 'text').length,
        imageMessages: messages.filter(m => m.type === 'image').length,
        voiceMessages: messages.filter(m => m.type === 'voice').length,
        oldestMessage: messages.length > 0 ? new Date(messages[0].created_at).getTime() : 0,
        newestMessage: messages.length > 0 ? new Date(messages[messages.length - 1].created_at).getTime() : 0
      };

      return stats;
    } catch (error) {
      logger.error('Error getting conversation stats:', error);
      return {
        totalMessages: 0,
        textMessages: 0,
        imageMessages: 0,
        voiceMessages: 0,
        oldestMessage: 0,
        newestMessage: 0
      };
    }
  }

  /**
   * Clear all messages in a conversation between two users
   */
  async clearConversation(userId1: string, userId2: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId1) {
      throw new Error('User not authenticated or not authorized');
    }

    try {
      const conversationId = this.getConversationId(userId1, userId2);

      // Get all messages in the conversation
      const { data: messages, error: fetchError } = await supabase
        .from("messages")
        .select("id")
        .eq("conversation_id", conversationId);

      if (fetchError) {
        throw fetchError;
      }

      if (!messages || messages.length === 0) {
        return true; // Nothing to delete
      }

      const messageIds = messages.map(m => m.id);

      // Delete reactions first (foreign key constraint)
      const { error: reactionsError } = await supabase
        .from("reactions")
        .delete()
        .in("message_id", messageIds);

      if (reactionsError) {
        logger.error("Error deleting reactions:", reactionsError);
        // Continue even if reactions deletion fails
      }

      // Delete messages
      const { error: messagesError } = await supabase
        .from("messages")
        .delete()
        .eq("conversation_id", conversationId);

      if (messagesError) {
        throw messagesError;
      }

      // Conversation cleared successfully
      return true;
    } catch (error) {
      logger.error('Error clearing conversation:', error);
      throw error;
    }
  }

  /**
   * Clear only messages sent by the current user
   */
  async clearMyMessages(userId1: string, userId2: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId1) {
      throw new Error('User not authenticated or not authorized');
    }

    try {
      const conversationId = this.getConversationId(userId1, userId2);

      // Get messages sent by current user
      const { data: messages, error: fetchError } = await supabase
        .from("messages")
        .select("id")
        .eq("conversation_id", conversationId)
        .eq("sender_id", userId1);

      if (fetchError) {
        throw fetchError;
      }

      if (!messages || messages.length === 0) {
        return true; // Nothing to delete
      }

      const messageIds = messages.map(m => m.id);

      // Delete reactions first (foreign key constraint)
      const { error: reactionsError } = await supabase
        .from("reactions")
        .delete()
        .in("message_id", messageIds);

      if (reactionsError) {
        logger.error("Error deleting reactions:", reactionsError);
        // Continue even if reactions deletion fails
      }

      // Delete messages
      const { error: messagesError } = await supabase
        .from("messages")
        .delete()
        .eq("conversation_id", conversationId)
        .eq("sender_id", userId1);

      if (messagesError) {
        throw messagesError;
      }

      // My messages cleared successfully
      return true;
    } catch (error) {
      logger.error('Error clearing my messages:', error);
      throw error;
    }
  }

  /**
   * Check if user can clear conversations (rate limiting)
   */
  canClearConversation(userId: string): { canClear: boolean; reason?: string } {
    try {
      const lastClearKey = `last-conversation-clear-${userId}`;
      const lastClear = localStorage.getItem(lastClearKey);
      
      if (lastClear) {
        const lastClearTime = parseInt(lastClear);
        const now = Date.now();
        const cooldownPeriod = 24 * 60 * 60 * 1000; // 24 hours
        
        if (now - lastClearTime < cooldownPeriod) {
          const remainingTime = cooldownPeriod - (now - lastClearTime);
          const hoursRemaining = Math.ceil(remainingTime / (60 * 60 * 1000));
          
          return {
            canClear: false,
            reason: `You can clear conversations again in ${hoursRemaining} hours`
          };
        }
      }
      
      return { canClear: true };
    } catch {
      return { canClear: true };
    }
  }

  /**
   * Record that user cleared a conversation
   */
  recordConversationClear(userId: string): void {
    try {
      const lastClearKey = `last-conversation-clear-${userId}`;
      localStorage.setItem(lastClearKey, Date.now().toString());
    } catch (error) {
      logger.warn('Could not record conversation clear:', error);
    }
  }

  /**
   * Generate conversation ID (same method as messageService)
   */
  private getConversationId(userId1: string, userId2: string): string {
    return [userId1, userId2].sort().join("_");
  }

  /**
   * Format conversation statistics for display
   */
  formatStats(stats: ConversationStats): string {
    const parts: string[] = [];
    
    if (stats.totalMessages === 0) {
      return 'No messages in this conversation';
    }

    parts.push(`${stats.totalMessages} messages`);
    
    const breakdown: string[] = [];
    if (stats.textMessages > 0) breakdown.push(`${stats.textMessages} text`);
    if (stats.imageMessages > 0) breakdown.push(`${stats.imageMessages} images`);
    if (stats.voiceMessages > 0) breakdown.push(`${stats.voiceMessages} voice`);
    
    if (breakdown.length > 0) {
      parts.push(`(${breakdown.join(', ')})`);
    }

    if (stats.oldestMessage > 0) {
      const oldestDate = new Date(stats.oldestMessage);
      parts.push(`since ${oldestDate.toLocaleDateString()}`);
    }

    return parts.join(' ');
  }

  /**
   * Validate clear operation
   */
  validateClearOperation(stats: ConversationStats, clearType: 'all' | 'mine'): { valid: boolean; warning?: string } {
    if (stats.totalMessages === 0) {
      return { valid: false, warning: 'No messages to clear' };
    }

    if (stats.totalMessages > 1000) {
      return { 
        valid: true, 
        warning: `This will delete ${stats.totalMessages} messages. This action cannot be undone.` 
      };
    }

    if (clearType === 'all' && stats.totalMessages > 100) {
      return {
        valid: true,
        warning: `This will permanently delete the entire conversation history (${stats.totalMessages} messages). This cannot be undone.`
      };
    }

    return { valid: true };
  }

  /**
   * Get conversation history for export
   */
  async exportConversation(userId1: string, userId2: string): Promise<any[]> {
    try {
      const conversationId = this.getConversationId(userId1, userId2);
      
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          reactions (*)
        `)
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error exporting conversation:', error);
      return [];
    }
  }
}

export const conversationService = new ConversationService();
export type { ConversationStats, Conversation };