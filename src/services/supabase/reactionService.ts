import { supabase } from "../../config/supabase";
import type { MessageReaction, ReactionSummary } from "../../types/message.types";
import type { Database } from "../../types/database.types";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createServiceLogger } from "../../utils/logger";

const logger = createServiceLogger('ReactionService');

type SupabaseReaction = Database['public']['Tables']['reactions']['Row'];
type SupabaseReactionInsert = Database['public']['Tables']['reactions']['Insert'];

class ReactionService {
  private listeners: Map<string, RealtimeChannel> = new Map();

  /**
   * Add a reaction to a message
   */
  async addReaction(messageId: string, emoji: string, userNickname?: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const reactionData: SupabaseReactionInsert = {
        message_id: messageId,
        user_id: user.id,
        user_nickname: userNickname || 'Anonymous',
        emoji
      };

      const { error } = await supabase
        .from('reactions')
        .insert([reactionData]);

      if (error) {
        // Check if it's a unique constraint error (user already reacted with this emoji)
        if (error.code === '23505') {
          throw new Error('Already reacted with this emoji');
        }
        throw error;
      }
    } catch (error) {
      logger.error('Error adding reaction:', error);
      throw error;
    }
  }

  /**
   * Remove a reaction from a message
   */
  async removeReaction(messageId: string, emoji: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const { error } = await supabase
        .from('reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji);

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error('Error removing reaction:', error);
      throw error;
    }
  }

  /**
   * Toggle a reaction (add if not exists, remove if exists)
   */
  async toggleReaction(messageId: string, emoji: string, userNickname?: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      // Check if reaction already exists
      const { data: existingReaction, error: checkError } = await supabase
        .from('reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw checkError;
      }

      if (existingReaction) {
        // Remove existing reaction
        await this.removeReaction(messageId, emoji);
      } else {
        // Add new reaction
        await this.addReaction(messageId, emoji, userNickname);
      }
    } catch (error) {
      logger.error('Error toggling reaction:', error);
      throw error;
    }
  }

  /**
   * Get all reactions for a message
   */
  async getMessageReactions(messageId: string): Promise<MessageReaction[]> {
    try {
      const { data, error } = await supabase
        .from('reactions')
        .select('*')
        .eq('message_id', messageId)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      return (data || []).map(this.convertSupabaseReaction);
    } catch (error) {
      logger.error('Error getting message reactions:', error);
      return [];
    }
  }

  /**
   * Listen to reactions for a specific message
   */
  listenToMessageReactions(messageId: string, callback: (reactions: MessageReaction[]) => void): () => void {
    const channel = supabase
      .channel(`reactions:${messageId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "reactions",
        filter: `message_id=eq.${messageId}`
      }, () => {
        // Fetch updated reactions when any change occurs
        this.getMessageReactions(messageId).then(callback);
      })
      .subscribe();

    // Store listener for cleanup
    this.listeners.set(messageId, channel);

    // Fetch initial reactions
    this.getMessageReactions(messageId).then(callback);

    return () => this.removeListener(messageId);
  }

  /**
   * Process reactions into summary format for display
   */
  processReactionsToSummary(reactions: MessageReaction[], currentUserId: string): ReactionSummary[] {
    const reactionMap = new Map<string, ReactionSummary>();

    reactions.forEach(reaction => {
      const existing = reactionMap.get(reaction.emoji);
      if (existing) {
        existing.count++;
        existing.userIds.push(reaction.userId);
        if (reaction.userId === currentUserId) {
          existing.userReacted = true;
        }
      } else {
        reactionMap.set(reaction.emoji, {
          emoji: reaction.emoji,
          count: 1,
          userIds: [reaction.userId],
          userReacted: reaction.userId === currentUserId
        });
      }
    });

    return Array.from(reactionMap.values())
      .sort((a, b) => b.count - a.count); // Sort by count, most popular first
  }

  /**
   * Get popular emojis for quick reactions
   */
  getPopularEmojis(): string[] {
    return [
      '👍', '👎', '❤️', '😂', '😮', '😢', '😡', '🔥',
      '👏', '🎉', '💯', '🚀', '💀', '🤔', '😍', '🥳'
    ];
  }

  /**
   * Check if current user has reacted to a message with specific emoji
   */
  async hasUserReacted(messageId: string, emoji: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from('reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !!data;
    } catch (error) {
      logger.error('Error checking user reaction:', error);
      return false;
    }
  }

  /**
   * Remove listener for a message
   */
  removeListener(messageId: string): void {
    const channel = this.listeners.get(messageId);
    if (channel) {
      channel.unsubscribe();
      this.listeners.delete(messageId);
    }
  }

  /**
   * Clean up all listeners
   */
  cleanup(): void {
    this.listeners.forEach(channel => channel.unsubscribe());
    this.listeners.clear();
  }

  /**
   * Convert Supabase reaction format to app format
   */
  private convertSupabaseReaction(supabaseReaction: SupabaseReaction): MessageReaction {
    return {
      id: supabaseReaction.id,
      messageId: supabaseReaction.message_id,
      userId: supabaseReaction.user_id,
      userNickname: supabaseReaction.user_nickname,
      emoji: supabaseReaction.emoji,
      createdAt: new Date(supabaseReaction.created_at).getTime()
    };
  }
}

export const reactionService = new ReactionService();