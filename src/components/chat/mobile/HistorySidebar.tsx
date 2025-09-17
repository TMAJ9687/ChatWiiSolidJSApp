import { Component, For, Show, createSignal, createEffect, onCleanup } from 'solid-js';
import { FiX, FiClock } from 'solid-icons/fi';
import type { Message } from '../../../types/message.types';
import type { User } from '../../../types/user.types';
import { conversationService, type Conversation } from '../../../services/supabase';
import { createServiceLogger } from '../../../utils/logger';

const logger = createServiceLogger('HistorySidebar');

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onlineUsers: User[];
  onSelectUser: (user: User) => void;
}

interface HistoryItem {
  userId: string;
  user: User | null;
  lastMessage: Message;
  messageCount: number;
}

const HistorySidebar: Component<HistorySidebarProps> = (props) => {
  const [historyItems, setHistoryItems] = createSignal<HistoryItem[]>([]);
  let unsubscribe: (() => void) | null = null;

  createEffect(async () => {
    if (!props.currentUser || !props.isOpen) {
      setHistoryItems([]);
      return;
    }

    try {
      // Get conversation list using the conversation service
      const conversations = await conversationService.getUserConversations(props.currentUser.id);
      
      // Transform conversations to history items
      const items: HistoryItem[] = [];
      
      for (const conv of conversations) {
        // Determine the other user ID
        const otherUserId = conv.userId1 === props.currentUser.id ? conv.userId2 : conv.userId1;
        
        // Find user in online users or create basic user object
        let user = props.onlineUsers.find(u => u.id === otherUserId) || null;
        if (!user) {
          // Create a basic user object with the nickname from conversation
          user = {
            id: otherUserId,
            nickname: conv.lastMessageSender || 'Unknown User',
            role: 'standard',
            gender: 'male',
            age: 0,
            country: 'Unknown',
            avatar: '/avatars/standard/male.png',
            createdAt: new Date().toISOString(),
            status: 'active',
            online: false
          };
        }
        
        // Determine message type and content based on the content
        let messageType: 'text' | 'image' | 'voice' = 'text';
        let displayContent = conv.lastMessage || 'No messages yet';
        
        // Check if the content looks like an image URL
        if (displayContent && (displayContent.includes('chat-images') || displayContent.startsWith('http') && (displayContent.includes('.jpg') || displayContent.includes('.jpeg') || displayContent.includes('.png') || displayContent.includes('.gif') || displayContent.includes('.webp')))) {
          messageType = 'image';
          displayContent = '📷 Photo';
        } else if (displayContent && (displayContent.includes('voice-messages') || displayContent.includes('.webm') || displayContent.includes('.ogg') || displayContent.includes('.mp3') || displayContent.includes('.wav'))) {
          messageType = 'voice';
          displayContent = '🎵 Voice message';
        }

        // Create last message object
        const lastMessage: Message = {
          id: conv.lastMessageId || '',
          senderId: otherUserId,
          receiverId: props.currentUser.id,
          content: displayContent,
          type: messageType,
          status: 'sent',
          read: true, // History shows read messages
          createdAt: new Date(conv.updatedAt).getTime(),
          timestamp: formatMessageTime(new Date(conv.updatedAt)),
          conversationId: conv.id,
          imageUrl: messageType === 'image' ? conv.lastMessage : undefined
        };
        
        items.push({
          userId: otherUserId,
          user,
          lastMessage,
          messageCount: 1 // We don't track message count in this simple implementation
        });
      }
      
      // Sort by most recent message
      items.sort((a, b) => b.lastMessage.createdAt - a.lastMessage.createdAt);
      setHistoryItems(items);
    } catch (error) {
      logger.error('Error loading history:', error);
      setHistoryItems([]);
    }
  });

  onCleanup(() => {
    if (unsubscribe) {
      unsubscribe();
    }
  });

  const formatMessageTime = (date: Date | undefined): string => {
    if (!date) return '';
    
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const handleSelectUser = (item: HistoryItem) => {
    if (item.user) {
      props.onSelectUser(item.user);
      props.onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <Show when={props.isOpen}>
        <div 
          class="fixed inset-0 bg-black/20 z-40"
          onClick={props.onClose}
        />
      </Show>

      {/* Sidebar */}
      <div class={`fixed top-16 right-0 h-[calc(100vh-4rem)] w-96 bg-white dark:bg-neutral-800 shadow-xl z-60 transform transition-transform duration-300 ease-in-out
                  ${props.isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div class="flex flex-col h-full">
          <div class="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
            <div class="flex items-center gap-2">
              <FiClock class="w-5 h-5 text-secondary-500" />
              <h2 class="text-lg font-semibold text-text-1000 dark:text-text-0">History</h2>
            </div>
            <button
              onClick={props.onClose}
              class="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              <FiX class="w-5 h-5 text-text-600 dark:text-text-400" />
            </button>
          </div>

          <div class="flex-1 overflow-y-auto">
            <Show 
              when={historyItems().length > 0}
              fallback={
                <div class="flex flex-col items-center justify-center h-full p-8 text-center">
                  <FiClock class="w-16 h-16 text-text-300 dark:text-text-700 mb-4" />
                  <p class="text-text-600 dark:text-text-400">No conversations yet</p>
                  <p class="text-sm text-text-400 dark:text-text-600 mt-2">
                    Your chat history will appear here
                  </p>
                </div>
              }
            >
              <For each={historyItems()}>
                {(item) => (
                  <button
                    onClick={() => handleSelectUser(item)}
                    class="w-full p-4 flex items-start gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors border-b border-neutral-100 dark:border-neutral-700/50"
                  >
                    <img
                      src={item.user?.avatar || `/avatars/standard/${item.user?.gender || 'male'}.png`}
                      alt={item.user?.nickname || 'Unknown'}
                      class="w-12 h-12 rounded-full object-cover flex-shrink-0"
                    />
                    
                    <div class="flex-1 text-left min-w-0">
                      <div class="flex items-center justify-between mb-1">
                        <span class="font-medium text-text-800 dark:text-text-200">
                          {item.user?.nickname || 'Unknown User'}
                        </span>
                        <span class="text-xs text-text-400 dark:text-text-600">
                          {item.messageCount} {item.messageCount === 1 ? 'message' : 'messages'}
                        </span>
                      </div>
                      <p class="text-sm text-text-600 dark:text-text-400 truncate">
                        {item.lastMessage.senderId === props.currentUser?.id ? 'You: ' : ''}
                        {item.lastMessage.content}
                      </p>
                      <p class="text-xs text-text-400 dark:text-text-600 mt-1">
                        {item.lastMessage.timestamp}
                      </p>
                    </div>
                  </button>
                )}
              </For>
            </Show>
          </div>
        </div>
      </div>
    </>
  );
};

export default HistorySidebar;