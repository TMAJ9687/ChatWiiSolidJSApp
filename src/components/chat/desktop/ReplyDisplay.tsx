import { Show } from 'solid-js';
import { FiCornerDownRight, FiImage, FiMic } from 'solid-icons/fi';
import type { Message } from '../../../types/message.types';

interface ReplyDisplayProps {
  message: Message;
  onReplyClick?: (originalMessage: any) => void;
  className?: string;
}

export default function ReplyDisplay(props: ReplyDisplayProps) {
  const isReply = () => !!(props.message.replyToId && props.message.replyToMessage);
  
  const getOriginalContent = () => {
    if (!props.message.replyToMessage) return '';
    
    const original = props.message.replyToMessage;
    
    if (original.type === 'image') {
      return 'Photo';
    }
    
    if (original.type === 'voice') {
      return 'Voice message';
    }
    
    // Truncate text content
    const maxLength = 60;
    const content = original.content;
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength) + '...';
  };

  const getSenderName = () => {
    if (!props.message.replyToMessage) return 'User';
    return props.message.replyToMessage.senderNickname || 'Anonymous';
  };

  const getIcon = () => {
    if (!props.message.replyToMessage) return null;
    
    if (props.message.replyToMessage.type === 'image') {
      return <FiImage class="w-3 h-3" />;
    }
    
    if (props.message.replyToMessage.type === 'voice') {
      return <FiMic class="w-3 h-3" />;
    }
    
    return null;
  };

  const handleClick = () => {
    if (props.onReplyClick && props.message.replyToMessage) {
      props.onReplyClick(props.message.replyToMessage);
    }
  };

  return (
    <Show when={isReply()}>
      <div 
        class={`
          mb-2 border-l-2 border-neutral-300 dark:border-neutral-600 
          bg-neutral-50 dark:bg-neutral-800/50 rounded-r-md overflow-hidden
          ${props.onReplyClick ? 'cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700/50' : ''}
          ${props.className || ''}
        `}
        onClick={handleClick}
      >
        <div class="px-3 py-2">
          {/* Reply indicator and sender */}
          <div class="flex items-center gap-2 mb-1">
            <FiCornerDownRight class="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
            <span class="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              {getSenderName()}
            </span>
          </div>
          
          {/* Original message content */}
          <div class="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
            {getIcon()}
            <span class="flex-1 min-w-0 truncate">
              {getOriginalContent()}
            </span>
          </div>

          {/* Show image preview if original was an image */}
          <Show when={props.message.replyToMessage?.type === 'image' && props.message.replyToMessage?.imageUrl}>
            <div class="mt-2">
              <img
                src={props.message.replyToMessage!.imageUrl}
                alt="Original image"
                class="w-16 h-16 object-cover rounded border border-neutral-200 dark:border-neutral-600"
              />
            </div>
          </Show>
        </div>
      </div>
    </Show>
  );
}