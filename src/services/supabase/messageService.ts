import { supabase } from "../../config/supabase";
import type { Message } from "../../types/message.types";
import type { Database } from "../../types/database.types";
import type { RealtimeChannel } from "@supabase/supabase-js";

type SupabaseMessage = Database['public']['Tables']['messages']['Row'];
type SupabaseMessageInsert = Database['public']['Tables']['messages']['Insert'];

class MessageService {
  private listeners: Map<string, RealtimeChannel> = new Map();

  // Generate conversation ID (always same regardless of who initiated)
  private getConversationId(userId1: string, userId2: string): string {
    return [userId1, userId2].sort().join("_");
  }

  // Send a message (with optional reply support)
  async sendMessage(
    senderId: string,
    receiverId: string,
    content: string,
    type: "text" | "image" | "voice" = "text",
    replyToId?: string,
    replyToMessage?: any,
    senderNickname?: string,
    voiceData?: { url: string; duration: number }
  ): Promise<void> {
    try {
      const messageData: SupabaseMessageInsert = {
        sender_id: senderId,
        receiver_id: receiverId,
        content,
        type,
        status: 'sent',
        read: false,
        conversation_id: this.getConversationId(senderId, receiverId),
        sender_nickname: senderNickname || null,
        image_url: type === 'image' ? content : null,
        voice_data: type === 'voice' && voiceData ? voiceData : null,
        reply_to_id: replyToId || null,
        reply_to_message: replyToMessage || null,
      };

      const { error } = await supabase
        .from("messages")
        .insert([messageData]);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Error sending message:", error);
      throw new Error("Failed to send message");
    }
  }

  // Listen to messages between two users
  listenToMessages(
    userId1: string,
    userId2: string,
    callback: (messages: Message[]) => void
  ): () => void {
    const conversationId = this.getConversationId(userId1, userId2);

    // Remove existing listener if any
    this.removeListener(conversationId);

    // Create realtime subscription for this conversation
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        // Fetch all messages for this conversation when any change occurs
        this.fetchConversationMessages(userId1, userId2).then(callback);
      })
      .subscribe();

    // Store channel for cleanup
    this.listeners.set(conversationId, channel);

    // Fetch initial messages
    this.fetchConversationMessages(userId1, userId2).then(callback);

    // Return unsubscribe function
    return () => this.removeListener(conversationId);
  }

  // Fetch conversation messages
  private async fetchConversationMessages(userId1: string, userId2: string): Promise<Message[]> {
    try {
      const conversationId = this.getConversationId(userId1, userId2);
      
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        return [];
      }

      return (data || []).map((msg) => this.convertSupabaseMessage(msg));
    } catch (error) {
      console.error("Error fetching conversation messages:", error);
      return [];
    }
  }

  // Mark messages as read
  async markMessagesAsRead(userId: string, otherUserId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("messages")
        .update({
          read: true,
          status: "read",
        })
        .eq("sender_id", otherUserId)
        .eq("receiver_id", userId)
        .eq("read", false);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  }

  // Get unread message count for a user
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", userId)
        .eq("read", false);

      if (error) {
        console.error('Error getting unread count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Get unread message count from a specific user
  async getUnreadCountFromUser(userId: string, fromUserId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", userId)
        .eq("sender_id", fromUserId)
        .eq("read", false);

      if (error) {
        console.error('Error getting unread count from user:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting unread count from user:', error);
      return 0;
    }
  }

  // Get recent messages between two users
  async getRecentMessages(userId1: string, userId2: string, limitCount: number = 20): Promise<Message[]> {
    try {
      const conversationId = this.getConversationId(userId1, userId2);
      
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(limitCount);

      if (error) {
        console.error('Error getting recent messages:', error);
        return [];
      }

      // Sort by created_at ascending and return
      return (data || [])
        .map((msg) => this.convertSupabaseMessage(msg))
        .sort((a, b) => a.createdAt - b.createdAt);
    } catch (error) {
      console.error('Error getting recent messages:', error);
      return [];
    }
  }

  // Listen to unread message count changes
  listenToUnreadCount(
    userId: string,
    callback: (count: number) => void
  ): () => void {
    if (!userId) {
      callback(0);
      return () => {};
    }

    // Create realtime subscription for unread messages
    const channel = supabase
      .channel(`unread:${userId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "messages",
        filter: `receiver_id=eq.${userId}`
      }, () => {
        // Fetch unread count when messages change
        this.getUnreadCount(userId).then(callback);
      })
      .subscribe();

    // Fetch initial count
    this.getUnreadCount(userId).then(callback);

    return () => {
      channel.unsubscribe();
    };
  }

  // Convert Supabase message format to app format
  private convertSupabaseMessage(supabaseMessage: SupabaseMessage): Message {
    return {
      id: supabaseMessage.id,
      senderId: supabaseMessage.sender_id,
      receiverId: supabaseMessage.receiver_id,
      content: supabaseMessage.content,
      type: supabaseMessage.type,
      status: supabaseMessage.status,
      read: supabaseMessage.read,
      createdAt: new Date(supabaseMessage.created_at).getTime(),
      timestamp: this.formatTimestamp(new Date(supabaseMessage.created_at)),
      conversationId: supabaseMessage.conversation_id,
      imageUrl: supabaseMessage.image_url,
      voiceData: supabaseMessage.voice_data as any,
      replyToId: supabaseMessage.reply_to_id,
      replyToMessage: supabaseMessage.reply_to_message as any,
      senderNickname: supabaseMessage.sender_nickname,
    };
  }

  // Format timestamp for display
  private formatTimestamp(date: Date | undefined): string {
    if (!date) return "";

    const now = new Date();
    const messageDate = new Date(date);

    // Today: show time only
    if (messageDate.toDateString() === now.toDateString()) {
      return messageDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }

    // This year: show month and day
    if (messageDate.getFullYear() === now.getFullYear()) {
      return messageDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }

    // Other: show full date
    return messageDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  // Remove listener
  removeListener(conversationId: string): void {
    const channel = this.listeners.get(conversationId);
    if (channel) {
      channel.unsubscribe();
      this.listeners.delete(conversationId);
    }
  }

  // Cleanup all listeners
  cleanup(): void {
    this.listeners.forEach((channel) => channel.unsubscribe());
    this.listeners.clear();
  }
}

export const messageService = new MessageService();