import {
  Component,
  Show,
  createSignal,
  createEffect,
  onCleanup,
} from "solid-js";
import { FiX, FiMoreVertical, FiSmile, FiImage, FiSend, FiMic, FiSlash } from "solid-icons/fi";
import MessageList from "./MessageList";
import TypingIndicator from "./TypingIndicator";
import { 
  messageService, 
  typingService, 
  imageService, 
  photoTrackingService, 
  voiceService, 
  conversationService,
  replyService,
  reportingService,
  type ImageUploadResult, 
  type VoiceUploadResult 
} from "../../../services/supabase";
import { blockingServiceWorkaround as blockingService } from "../../../services/supabase/blockingServiceWorkaround";
import { supabase } from "../../../config/supabase";
import ChatOptionsMenu from "./ChatOptionsMenu";
import BlockModal from "./BlockModal";
import ReportModal from "./ReportModal";
import ImageUpload from "./ImageUpload";
import ImageModal from "./ImageModal";
import ReplyInput from "./ReplyInput";
import VoiceRecorder from "./VoiceRecorder";
import ClearConversationModal from "./ClearConversationModal";
import EmojiPicker from "./EmojiPicker";
import type { User } from "../../../types/user.types";
import type { Message } from "../../../types/message.types";

interface ChatAreaProps {
  currentUser: User | null;
  selectedUser: User | null;
  onCloseChat: () => void;
}

const ChatArea: Component<ChatAreaProps> = (props) => {
  const [message, setMessage] = createSignal("");
  const [messages, setMessages] = createSignal<Message[]>([]);
  const [sending, setSending] = createSignal(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = createSignal(false);
  const [isBlocked, setIsBlocked] = createSignal(false);
  const [isBlockedBy, setIsBlockedBy] = createSignal(false);
  const [showBlockModal, setShowBlockModal] = createSignal(false);
  const [isBlockAction, setIsBlockAction] = createSignal(true);
  const [blockingMessage, setBlockingMessage] = createSignal<string | null>(null);
  const [selectedFile, setSelectedFile] = createSignal<File | null>(null);
  const [showImageUpload, setShowImageUpload] = createSignal(false);
  const [showImageModal, setShowImageModal] = createSignal(false);
  const [modalImageUrl, setModalImageUrl] = createSignal('');
  const [replyingTo, setReplyingTo] = createSignal<Message | null>(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = createSignal(false);
  const [showClearModal, setShowClearModal] = createSignal(false);
  const [showReportModal, setShowReportModal] = createSignal(false);
  const [showEmojiPicker, setShowEmojiPicker] = createSignal(false);
  // Dynamic message length based on user role
  const maxLength = () => {
    if (props.currentUser?.role === 'vip' || props.currentUser?.role === 'admin') {
      return 250;
    }
    return 160;
  };

  let unsubscribe: (() => void) | null = null;
  let typingUnsubscribe: (() => void) | null = null;
  let typingTimer: NodeJS.Timeout | null = null;

  // Listen to messages when user is selected
  createEffect(() => {
    if (props.selectedUser && props.currentUser) {
      // Check bidirectional blocking
      Promise.all([
        blockingService.isUserBlocked(props.currentUser.id, props.selectedUser.id),
        blockingService.isBlockedBy(props.selectedUser.id)
      ]).then(([blocked, blockedBy]) => {
        setIsBlocked(blocked);
        setIsBlockedBy(blockedBy);
        
        // Clear any previous blocking message
        setBlockingMessage(null);
      });

      // Mark messages as read (silently handle errors)
      try {
        messageService.markMessagesAsRead(
          props.currentUser.id,
          props.selectedUser.id
        );
      } catch (error) {
        // No messages to mark as read - silently continue
      }

      // Listen to messages
      try {
        unsubscribe = messageService.listenToMessages(
          props.currentUser.id,
          props.selectedUser.id,
          (msgs) => {
            setMessages(msgs);
            
            // Mark messages as read whenever we receive new messages in an open conversation
            // This ensures inbox notifications are cleared in real-time
            messageService.markMessagesAsRead(
              props.currentUser.id,
              props.selectedUser.id
            ).catch((error) => {
              // Silently handle auto-mark read errors
            });
          }
        );
      } catch (error) {
        // Starting fresh conversation - no existing messages
        setMessages([]);
      }

      // Listen to typing indicator
      const conversationId = [props.currentUser.id, props.selectedUser.id].sort().join('_');
      typingUnsubscribe = typingService.listenToTyping(
        conversationId,
        props.currentUser.id,
        (typingUsers) => {
          // Check if anyone (other than current user) is typing
          setIsOtherUserTyping(typingUsers.length > 0);
        }
      );
    } else {
      setMessages([]);
      setIsOtherUserTyping(false);
      setIsBlocked(false);
      setIsBlockedBy(false);
      setBlockingMessage(null);
      
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      if (typingUnsubscribe) {
        typingUnsubscribe();
        typingUnsubscribe = null;
      }
    }
  });

  // Mark messages as read when window gains focus (user returns to conversation)
  createEffect(() => {
    if (!props.currentUser || !props.selectedUser) return;
    
    const handleWindowFocus = () => {
      // Check if users are still available before marking as read
      if (props.currentUser && props.selectedUser) {
        messageService.markMessagesAsRead(
          props.currentUser.id,
          props.selectedUser.id
        ).catch((error) => {
          // Silently handle mark read errors
        });
      }
    };
    
    window.addEventListener('focus', handleWindowFocus);
    
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  });

  // Set up real-time blocking updates for the chat area
  createEffect(() => {
    if (!props.currentUser || !props.selectedUser) return;

    const channel = supabase
      .channel(`chat-area-blocks-${props.currentUser!.id}-${props.selectedUser!.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'blocks',
        filter: `or(and(blocker_id.eq.${props.currentUser!.id},blocked_id.eq.${props.selectedUser!.id}),and(blocker_id.eq.${props.selectedUser!.id},blocked_id.eq.${props.currentUser!.id}))`
      }, async () => {
        // Refresh blocking status when blocks change for this conversation
        try {
          const [blocked, blockedBy] = await Promise.all([
            blockingService.isUserBlocked(props.currentUser!.id, props.selectedUser!.id),
            blockingService.isBlockedBy(props.selectedUser!.id)
          ]);
          setIsBlocked(blocked);
          setIsBlockedBy(blockedBy);
          setBlockingMessage(null); // Clear any error messages
        } catch (error) {
          console.error('Error refreshing blocking status:', error);
        }
      })
      .subscribe();

    onCleanup(() => {
      channel.unsubscribe();
    });
  });

  onCleanup(() => {
    if (unsubscribe) unsubscribe();
    if (typingUnsubscribe) typingUnsubscribe();
    if (typingTimer) clearTimeout(typingTimer);
    typingService.cleanup();
  });

  // Handle typing detection
  const handleInputChange = (value: string) => {
    setMessage(value);
    
    if (props.currentUser && props.selectedUser) {
      // Set typing to true
      const conversationId = [props.currentUser.id, props.selectedUser.id].sort().join('_');
      typingService.startTyping(conversationId, props.currentUser.id, props.currentUser.nickname);
      
      // Clear existing timer
      if (typingTimer) clearTimeout(typingTimer);
      
      // Set new timer to stop typing after 2 seconds of no input
      typingTimer = setTimeout(() => {
        if (props.currentUser && props.selectedUser) {
          const conversationId = [props.currentUser.id, props.selectedUser.id].sort().join('_');
          typingService.stopTyping(conversationId, props.currentUser.id, props.currentUser.nickname);
        }
      }, 2000);
    }
  };

  const handleSend = async () => {
    const msg = message().trim();
    if (!msg || !props.currentUser || !props.selectedUser || sending()) return;

    // Check if communication is blocked (bidirectional)
    if (isBlocked() || isBlockedBy()) {
      if (isBlocked()) {
        setBlockingMessage("You have blocked this user. Unblock them to send messages.");
      } else {
        setBlockingMessage("This user has blocked you. You cannot send messages to them.");
      }
      // Clear message after 5 seconds
      setTimeout(() => setBlockingMessage(null), 5000);
      return;
    }

    // Stop typing indicator
    if (typingTimer) clearTimeout(typingTimer);
    if (props.currentUser && props.selectedUser) {
      const conversationId = [props.currentUser.id, props.selectedUser.id].sort().join('_');
      typingService.stopTyping(conversationId, props.currentUser.id, props.currentUser.nickname);
    }

    setSending(true);
    try {
      const replyToMessage = replyingTo();
      if (replyToMessage) {
        // Sending a reply
        await replyService.sendReply(
          replyToMessage.id,
          props.selectedUser.id,
          msg,
          "text",
          props.currentUser.nickname
        );
        setReplyingTo(null); // Clear reply state
      } else {
        // Regular message
        await messageService.sendMessage(
          props.currentUser.id,
          props.selectedUser.id,
          msg,
          "text",
          undefined,
          undefined,
          props.currentUser.nickname
        );
      }
      setMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Block/Unblock handlers
  const handleBlock = () => {
    setIsBlockAction(true);
    setShowBlockModal(true);
  };

  const handleUnblock = () => {
    setIsBlockAction(false);
    setShowBlockModal(true);
  };

  // Confirm block/unblock action
  const confirmBlockAction = async () => {
    if (!props.currentUser || !props.selectedUser) return;
    
    try {
      if (isBlockAction()) {
        // Blocking user - update UI immediately before API call
        setIsBlocked(true);
        await blockingService.blockUser(props.selectedUser.id);
      } else {
        // Unblocking user - update UI immediately before API call
        setIsBlocked(false);
        await blockingService.unblockUser(props.selectedUser.id);
      }
      
      // Force refresh the service cache
      await blockingService.forceRefresh();
      
      // Double-check the status after a short delay
      setTimeout(async () => {
        try {
          const [blocked, blockedBy] = await Promise.all([
            blockingService.isUserBlocked(props.currentUser!.id, props.selectedUser!.id),
            blockingService.isBlockedBy(props.selectedUser!.id)
          ]);
          setIsBlocked(blocked);
          setIsBlockedBy(blockedBy);
        } catch (error) {
          // Error refreshing block status
        }
      }, 200);
      
      // Close modal
      setShowBlockModal(false);
    } catch (error) {
      console.error('Error blocking/unblocking user:', error);
      // Revert UI state on error
      setIsBlocked(!isBlockAction());
      setShowBlockModal(false);
    }
  };

  // Report handlers
  const handleReport = () => {
    setShowReportModal(true);
  };

  const handleReportSuccess = () => {
    // Could show a success toast or notification here
    // Report submitted successfully
  };

  // Emoji picker handlers
  const handleEmojiToggle = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    const newState = !showEmojiPicker();
    setShowEmojiPicker(newState);
  };

  const handleEmojiSelect = (emoji: string) => {
    const currentMsg = message();
    setMessage(currentMsg + emoji);
    setShowEmojiPicker(false);
  };

  // VIP/Admin check for voice messages
  const canSendVoice = () => {
    const userRole = props.currentUser?.role || 'standard';
    const canSend = ['vip', 'admin'].includes(userRole);
    // Voice access check for role-based permissions
    return canSend;
  };

  // VIP/Admin exclusive visibility for typing indicators
  const canSeeTypingIndicator = () => {
    const userRole = props.currentUser?.role || 'standard';
    return ['vip', 'admin'].includes(userRole);
  };


  // Image handling functions
  const handleImageSelect = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (file) {
      // Check photo limit first
      const canSend = await photoTrackingService.canSendPhoto(props.currentUser.id, props.currentUser.role);
      if (!canSend.canSend) {
        alert(canSend.message || `Daily photo limit reached (${canSend.limit}).`);
        input.value = '';
        return;
      }

      // Validate file
      const error = imageService.validateImage(file);
      if (error) {
        alert(error.message);
        input.value = '';
        return;
      }
      
      setSelectedFile(file);
      setShowImageUpload(true);
    }
    
    // Reset input value so the same file can be selected again
    input.value = '';
  };

  const handleImageUploadCancel = () => {
    setSelectedFile(null);
    setShowImageUpload(false);
  };

  const handleImageUploadSend = async (imageResult: ImageUploadResult) => {
    if (!props.currentUser || !props.selectedUser) return;

    // Check if communication is blocked
    if (isBlocked() || isBlockedBy()) {
      if (isBlocked()) {
        setBlockingMessage("You have blocked this user. Unblock them to send messages.");
      } else {
        setBlockingMessage("This user has blocked you. You cannot send messages to them.");
      }
      setTimeout(() => setBlockingMessage(null), 5000);
      return;
    }

    try {
      // Send the message
      await messageService.sendMessage(
        props.currentUser.id,
        props.selectedUser.id,
        imageResult.url,
        "image",
        undefined,
        undefined,
        props.currentUser.nickname
      );

      // Record photo sent for tracking
      await photoTrackingService.recordPhotoSent();
      
      setSelectedFile(null);
      setShowImageUpload(false);
    } catch (error) {
      console.error("Failed to send image message:", error);
    }
  };

  const handleImageClick = (imageUrl: string) => {
    setModalImageUrl(imageUrl);
    setShowImageModal(true);
  };

  const handleImageModalClose = () => {
    setShowImageModal(false);
    setModalImageUrl('');
  };

  // Reply handlers - VIP/Admin only
  const handleReplyClick = (message: Message) => {
    // Only allow VIP/Admin users to reply
    const userRole = props.currentUser?.role || 'standard';
    if (['vip', 'admin'].includes(userRole)) {
      setReplyingTo(message);
    }
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  // Voice message handlers
  const handleVoiceRecordClick = () => {
    if (voiceService.canSendVoiceMessage(props.currentUser?.role || 'user')) {
      setShowVoiceRecorder(true);
    }
  };

  const handleVoiceRecordCancel = () => {
    setShowVoiceRecorder(false);
  };

  const handleVoiceRecordSend = async (recording: VoiceRecording) => {
    if (!props.currentUser || !props.selectedUser) return;

    // Check if communication is blocked
    if (isBlocked() || isBlockedBy()) {
      if (isBlocked()) {
        setBlockingMessage("You have blocked this user. Unblock them to send messages.");
      } else {
        setBlockingMessage("This user has blocked you. You cannot send messages to them.");
      }
      setTimeout(() => setBlockingMessage(null), 5000);
      return;
    }

    try {
      setSending(true);
      
      // Upload the voice file to Supabase Storage
      const voiceUrl = await imageService.uploadFile(recording.blob, props.currentUser.id);
      
      // Create voice data
      const voiceData = voiceService.createVoiceData(voiceUrl, recording.duration, recording.blob.size);

      // Send the voice message
      await messageService.sendMessage(
        props.currentUser.id,
        props.selectedUser.id,
        voiceUrl, // content is the voice URL
        "voice",
        undefined,
        undefined,
        props.currentUser.nickname,
        { url: voiceUrl, duration: recording.duration }
      );

      // Clean up the local recording URL
      voiceService.revokeObjectURL(recording.url);
      
      setShowVoiceRecorder(false);
    } catch (error) {
      console.error("Failed to send voice message:", error);
    } finally {
      setSending(false);
    }
  };

  // Conversation management handlers
  const handleClearChatClick = () => {
    setShowClearModal(true);
  };

  const handleClearConversation = async (clearType: 'all' | 'mine') => {
    if (!props.currentUser || !props.selectedUser) return;

    try {
      if (clearType === 'all') {
        await conversationService.clearConversation(props.currentUser.id, props.selectedUser.id);
      } else {
        await conversationService.clearMyMessages(props.currentUser.id, props.selectedUser.id);
      }
      
      // Refresh the message list by forcing a re-fetch
      // The real-time listener should update automatically
      // Conversation cleared successfully
    } catch (error) {
      console.error('Failed to clear conversation:', error);
    }
  };

  const handleClearModalCancel = () => {
    setShowClearModal(false);
  };

  const getFlagSrc = (country: string) => {
    const code = country.toLowerCase();
    return code === "il" ? "/flags/ps.svg" : `/flags/${code}.svg`;
  };

  const getCharCountColor = () => {
    const length = message().length;
    const max = maxLength();
    if (length >= max) return "text-danger-500";
    if (length >= max - 10) return "text-warning-500";
    if (length >= max - 20) return "text-warning-300";
    return "text-text-400 dark:text-text-600";
  };

  return (
    <div class="flex-1 flex flex-col bg-neutral-50 dark:bg-neutral-900">
      <Show
        when={props.selectedUser}
        fallback={
          <div class="flex-1 flex items-center justify-center">
            <div class="text-center">
              <h3 class="text-xl font-medium text-text-600 dark:text-text-400 mb-2">
                Select a user to start chatting
              </h3>
              <p class="text-text-400 dark:text-text-600">
                Choose someone from the online users list
              </p>
            </div>
          </div>
        }
      >
        {/* Chat Header */}
        <div class="h-16 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 px-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class={`rounded-full p-0.5 ${props.selectedUser?.gender === 'male' ? 'ring-2 ring-blue-500' : 'ring-2 ring-pink-500'}`}>
              <img
                src={props.selectedUser?.avatar || `/avatars/standard/${props.selectedUser?.gender}.png`}
                alt={props.selectedUser?.nickname}
                class="w-10 h-10 rounded-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = `/avatars/standard/male.png`;
                }}
              />
            </div>
            <div>
              <div class="font-medium text-text-1000 dark:text-text-0 mb-1">
                {props.selectedUser?.nickname}
              </div>
              <div class="flex items-center gap-2">
                <img
                  src={getFlagSrc(props.selectedUser?.country || "us")}
                  alt={props.selectedUser?.country}
                  class="w-5 h-3 object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "/flags/us.svg";
                  }}
                />
                <span class={`text-sm ${props.selectedUser?.gender === 'male' ? 'text-blue-500' : 'text-pink-500'}`}>
                  • {props.selectedUser?.gender} • {props.selectedUser?.age}
                </span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              onClick={props.onCloseChat}
              class="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              aria-label="Close chat"
            >
              <FiX class="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <ChatOptionsMenu
              user={props.selectedUser}
              isBlocked={isBlocked()}
              onBlock={handleBlock}
              onUnblock={handleUnblock}
              onReport={handleReport}
              onClearChat={() => {}}
            />
          </div>
        </div>

        {/* Blocked Notice */}
        <Show when={isBlocked() || isBlockedBy()}>
          <div class="bg-warning-100 dark:bg-warning-500/20 border border-warning-200 dark:border-warning-500/30 p-3 mx-4 mb-2 rounded-lg">
            <p class="text-sm text-warning-700 dark:text-warning-400">
              {isBlocked() ? "You have blocked this user. Unblock to send messages." : 
               "This user has blocked you. You cannot send messages to them."}
            </p>
          </div>
        </Show>

        {/* Messages Area */}
        <MessageList
          messages={messages()}
          currentUserId={props.currentUser?.id || ""}
          userNickname={props.currentUser?.nickname}
          currentUserRole={props.currentUser?.role}
          onReplyClick={handleReplyClick}
        />

        {/* Typing Indicator - VIP/Admin exclusive visibility */}
        <Show when={canSeeTypingIndicator()}>
          <TypingIndicator 
            nickname={props.selectedUser?.nickname || ''} 
            isTyping={isOtherUserTyping()} 
          />
        </Show>

        {/* Reply Input */}
        <ReplyInput 
          replyingTo={replyingTo()}
          onCancelReply={handleCancelReply}
        />

        {/* Blocking Message */}
        <Show when={blockingMessage()}>
          <div class="bg-white dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 px-4 py-2">
            <div class="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
              <FiSlash class="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
              <span class="text-sm text-red-700 dark:text-red-300">{blockingMessage()}</span>
            </div>
          </div>
        </Show>

        {/* Message Input */}
        <div class="bg-white dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 p-4">
          <div class="flex items-center gap-2">
            <label class="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer">
              <FiImage class="w-5 h-5 text-text-600 dark:text-text-400" />
              <input
                type="file"
                accept="image/*"
                class="hidden"
                onChange={handleImageSelect}
                disabled={isBlocked() || isBlockedBy()}
              />
            </label>


            <div class="flex-1 relative">
              <input
                type="text"
                value={message()}
                onInput={(e) => handleInputChange(e.currentTarget.value)}
                onKeyPress={handleKeyPress}
                maxLength={maxLength()}
                placeholder={
                  isBlocked() ? "You blocked this user" : 
                  isBlockedBy() ? "This user blocked you" : 
                  "Type a message..."
                }
                disabled={sending() || isBlocked() || isBlockedBy()}
                class="w-full pl-10 pr-24 py-2 bg-neutral-100 dark:bg-neutral-700 rounded-lg
                       text-text-1000 dark:text-text-0 placeholder:text-text-400 dark:placeholder:text-text-600
                       focus:outline-none focus:ring-2 focus:ring-secondary-500
                       disabled:opacity-50 disabled:cursor-not-allowed"
              />
              
              {/* Emoji picker button - far left */}
              <button 
                onClick={handleEmojiToggle}
                onMouseDown={(e) => e.stopPropagation()}
                disabled={isBlocked() || isBlockedBy()}
                class="absolute left-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50"
                aria-label="Add emoji"
              >
                <FiSmile class="w-4 h-4 text-text-400 dark:text-text-600" />
              </button>

              {/* Voice message button - far right inside input */}
              <div 
                class="absolute right-12 top-1/2 -translate-y-1/2"
                title={canSendVoice() ? "Send voice message" : "VIP feature only"}
              >
                <button 
                  onClick={handleVoiceRecordClick}
                  disabled={isBlocked() || sending() || !canSendVoice()}
                  class={`p-1 rounded transition-colors ${
                    canSendVoice() 
                      ? 'hover:bg-neutral-200 dark:hover:bg-neutral-600' 
                      : 'opacity-40 cursor-not-allowed'
                  }`}
                  aria-label="Send voice message"
                >
                  <FiMic class="w-4 h-4 text-text-400 dark:text-text-600" />
                </button>
              </div>
              
              {/* Character count */}
              <span
                class={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${getCharCountColor()}`}
              >
                {message().length}/{maxLength()}
              </span>

              {/* Emoji Picker - positioned relative to input */}
              <EmojiPicker
                isOpen={showEmojiPicker()}
                onEmojiSelect={handleEmojiSelect}
                onClose={() => setShowEmojiPicker(false)}
                position="top"
              />
            </div>

            <button
              onClick={handleSend}
              disabled={message().length === 0 || sending() || isBlocked() || isBlockedBy()}
              class={`p-2 rounded-lg transition-colors
                      ${
                        message().length > 0 && !sending() && !isBlocked() && !isBlockedBy()
                          ? "bg-secondary-500 hover:bg-secondary-600 text-white"
                          : "bg-neutral-200 dark:bg-neutral-700 text-text-400 cursor-not-allowed"
                      }`}
            >
              <FiSend class="w-5 h-5" />
            </button>
          </div>
        </div>
      </Show>
      
      {/* Block Modal */}
      <BlockModal
        isOpen={showBlockModal()}
        userNickname={props.selectedUser?.nickname || ''}
        isBlocking={isBlockAction()}
        onConfirm={confirmBlockAction}
        onCancel={() => setShowBlockModal(false)}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal()}
        userNickname={props.selectedUser?.nickname || ''}
        userId={props.selectedUser?.id || ''}
        onClose={() => setShowReportModal(false)}
        onSuccess={handleReportSuccess}
      />

      {/* Image Upload Modal */}
      <ImageUpload
        isOpen={showImageUpload()}
        selectedFile={selectedFile()}
        onCancel={handleImageUploadCancel}
        onSend={handleImageUploadSend}
        currentUserId={props.currentUser?.id || ''}
        conversationId={`${props.currentUser?.id}_${props.selectedUser?.id}`}
      />

      {/* Image Viewer Modal */}
      <ImageModal
        isOpen={showImageModal()}
        imageUrl={modalImageUrl()}
        onClose={handleImageModalClose}
      />

      {/* Voice Recorder Modal */}
      <VoiceRecorder
        isOpen={showVoiceRecorder()}
        onSend={handleVoiceRecordSend}
        onCancel={handleVoiceRecordCancel}
        disabled={sending()}
        userRole={props.currentUser?.role || 'user'}
      />

    </div>
  );
};

export default ChatArea;
