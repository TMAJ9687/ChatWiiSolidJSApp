import { supabase } from "../../config/supabase";
import { messageService } from "./messageService";
import type { Message } from "../../types/message.types";

class ReplyService {
  /**
   * Send a reply to an existing message
   */
  async sendReply(
    originalMessageId: string,
    receiverId: string,
    replyContent: string,
    type: 'text' | 'image' | 'voice' = 'text',
    senderNickname?: string
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      // First, get the original message details
      const { data: originalMessage, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('id', originalMessageId)
        .single();

      if (fetchError || !originalMessage) {
        throw new Error('Original message not found');
      }

      // Create the reply message data
      const replyToMessage = {
        id: originalMessage.id,
        senderId: originalMessage.sender_id,
        content: originalMessage.content,
        type: originalMessage.type,
        senderNickname: originalMessage.sender_nickname,
        imageUrl: originalMessage.image_url
      };

      // Send the reply using the message service
      await messageService.sendMessage(
        user.id,
        receiverId,
        replyContent,
        type,
        originalMessageId,
        replyToMessage,
        senderNickname
      );
    } catch (error) {
      console.error('Error sending reply:', error);
      throw error;
    }
  }

  /**
   * Format reply preview text
   */
  formatReplyPreview(originalMessage: Message, maxLength: number = 50): string {
    let preview = '';
    
    switch (originalMessage.type) {
      case 'text':
        preview = originalMessage.content;
        break;
      case 'image':
        preview = '📷 Image';
        break;
      case 'voice':
        preview = '🎵 Voice message';
        break;
      default:
        preview = 'Message';
    }
    
    if (preview.length > maxLength) {
      preview = preview.substring(0, maxLength) + '...';
    }
    
    return preview;
  }

  /**
   * Check if message can be replied to
   */
  canReplyToMessage(message: Message, currentUserId: string): boolean {
    // Can reply to any message that's not from blocked users
    // Additional business logic can be added here
    return message.senderId !== currentUserId || message.receiverId !== currentUserId;
  }

  /**
   * Get reply chain for a message
   */
  async getReplyChain(messageId: string): Promise<Message[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('reply_to_id', messageId)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      // Convert to Message format
      return (data || []).map(msg => ({
        id: msg.id,
        senderId: msg.sender_id,
        receiverId: msg.receiver_id,
        content: msg.content,
        type: msg.type,
        status: msg.status,
        read: msg.read,
        createdAt: new Date(msg.created_at).getTime(),
        timestamp: new Date(msg.created_at).toLocaleString(),
        conversationId: msg.conversation_id,
        imageUrl: msg.image_url,
        voiceData: msg.voice_data,
        replyToId: msg.reply_to_id,
        replyToMessage: msg.reply_to_message,
        senderNickname: msg.sender_nickname
      }));
    } catch (error) {
      console.error('Error getting reply chain:', error);
      return [];
    }
  }
}

export const replyService = new ReplyService();