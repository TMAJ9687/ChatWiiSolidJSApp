import { Component, For, Show, createSignal, createEffect, onCleanup } from 'solid-js';
import { FiX, FiInbox } from 'solid-icons/fi';
import type { Message } from '../../../types/message.types';
import type { User } from '../../../types/user.types';
import { messageService, conversationService } from '../../../services/supabase';

interface InboxSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onlineUsers: User[];
  onSelectUser: (user: User) => void;
}

interface InboxItem {
  userId: string;
  user: User | null;
  lastMessage: Message;
  unreadCount: number;
}

const InboxSidebar: Component<InboxSidebarProps> = (props) => {
  const [inboxItems, setInboxItems] = createSignal<InboxItem[]>([]);
  let unsubscribe: (() => void) | null = null;

  createEffect(async () => {
    if (!props.currentUser || !props.isOpen) {
      setInboxItems([]);
      return;
    }

    try {
      // Get conversation list using the conversation service
      const conversations = await conversationService.getUserConversations(props.currentUser.id);
      
      // Transform conversations to inbox items
      const items: InboxItem[] = [];
      
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
        
        // Get unread count for this conversation
        const unreadCount = await messageService.getUnreadCountFromUser(props.currentUser.id, otherUserId);
        
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
          read: unreadCount === 0,
          createdAt: new Date(conv.updatedAt).getTime(),
          timestamp: formatMessageTime(new Date(conv.updatedAt)),
          conversationId: conv.id,
          imageUrl: messageType === 'image' ? conv.lastMessage : undefined
        };
        
        items.push({
          userId: otherUserId,
          user,
          lastMessage,
          unreadCount
        });
      }
      
      // Sort by unread first, then by most recent
      items.sort((a, b) => {
        if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
        if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
        return b.lastMessage.createdAt - a.lastMessage.createdAt;
      });
      
      setInboxItems(items);
    } catch (error) {
      console.error('Error loading inbox:', error);
      setInboxItems([]);
    }
  });

  onCleanup(() => {
    if (unsubscribe) {
      unsubscribe();
    }
  });

  const formatMessageTime = (date: Date | undefined): string => {
    if (!date) return '';
    const now = new Date();
    const messageDate = new Date(date);
    
    // Today: show time only
    if (messageDate.toDateString() === now.toDateString()) {
      return messageDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    }
    
    // Yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // Within a week: show day name
    const daysDiff = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff < 7) {
      return messageDate.toLocaleDateString('en-US', { weekday: 'short' });
    }
    
    // Older: show date
    return messageDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const handleSelectUser = (item: InboxItem) => {
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
              <FiInbox class="w-5 h-5 text-secondary-500" />
              <h2 class="text-lg font-semibold text-text-1000 dark:text-text-0">Inbox</h2>
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
              when={inboxItems().length > 0}
              fallback={
                <div class="flex flex-col items-center justify-center h-full p-8 text-center">
                  <FiInbox class="w-16 h-16 text-text-300 dark:text-text-700 mb-4" />
                  <p class="text-text-600 dark:text-text-400">No messages yet</p>
                  <p class="text-sm text-text-400 dark:text-text-600 mt-2">
                    Incoming messages will appear here
                  </p>
                </div>
              }
            >
              <For each={inboxItems()}>
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
                        <span class={`font-medium ${item.unreadCount > 0 ? 'text-text-1000 dark:text-text-0' : 'text-text-800 dark:text-text-200'}`}>
                          {item.user?.nickname || 'Unknown User'}
                        </span>
                        <span class="text-xs text-text-400 dark:text-text-600">
                          {item.lastMessage.timestamp}
                        </span>
                      </div>
                      <p class={`text-sm truncate ${item.unreadCount > 0 ? 'text-text-800 dark:text-text-200 font-medium' : 'text-text-600 dark:text-text-400'}`}>
                        {item.lastMessage.content}
                      </p>
                    </div>

                    <Show when={item.unreadCount > 0}>
                      <div class="w-6 h-6 bg-danger-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                        {item.unreadCount > 9 ? '9+' : item.unreadCount}
                      </div>
                    </Show>
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

export default InboxSidebar;