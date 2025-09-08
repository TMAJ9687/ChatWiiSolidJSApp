export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: 'text' | 'image' | 'voice';
  status: 'sending' | 'sent' | 'delivered' | 'read';
  read: boolean;
  createdAt: number;
  timestamp: string;
  conversationId?: string;
  imageUrl?: string;
  voiceData?: {
    url: string;
    duration: number;
  };
  // Reply functionality
  replyToId?: string;
  replyToMessage?: {
    id: string;
    senderId: string;
    content: string;
    type: 'text' | 'image' | 'voice';
    senderNickname?: string;
    imageUrl?: string;
  };
  // Reactions
  reactions?: MessageReaction[];
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  userNickname?: string;
  emoji: string;
  createdAt: number;
}

export interface EmojiData {
  emoji: string;
  name: string;
  category: string;
  keywords: string[];
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  userIds: string[];
  userReacted: boolean; // Whether current user reacted with this emoji
}
