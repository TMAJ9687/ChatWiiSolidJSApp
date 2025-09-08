import { createSignal, Show } from 'solid-js';
import { FiX, FiCornerDownRight } from 'solid-icons/fi';
import type { Message } from '../../../types/message.types';

interface ReplyInputProps {
  replyingTo: Message | null;
  onCancelReply: () => void;
  className?: string;
}

export default function ReplyInput(props: ReplyInputProps) {
  const getReplyPreview = () => {
    if (!props.replyingTo) return '';
    
    const message = props.replyingTo;
    const senderName = message.senderId === 'currentUser' ? 'You' : 'User'; // Will be replaced with actual nickname
    
    if (message.type === 'image') {
      return `${senderName} • Photo`;
    }
    
    if (message.type === 'voice') {
      return `${senderName} • Voice message`;
    }
    
    // Truncate text content
    const maxLength = 50;
    const content = message.content;
    if (content.length <= maxLength) {
      return `${senderName} • ${content}`;
    }
    return `${senderName} • ${content.substring(0, maxLength)}...`;
  };

  return (
    <Show when={props.replyingTo}>
      <div class={`bg-neutral-100 dark:bg-neutral-750 border-l-4 border-secondary-500 ${props.className || ''}`}>
        <div class="flex items-center justify-between px-4 py-2">
          <div class="flex items-center gap-2 flex-1 min-w-0">
            <FiCornerDownRight class="w-4 h-4 text-secondary-500 flex-shrink-0" />
            <div class="flex-1 min-w-0">
              <div class="text-xs text-secondary-600 dark:text-secondary-400 font-medium">
                Replying to
              </div>
              <div class="text-sm text-neutral-700 dark:text-neutral-300 truncate">
                {getReplyPreview()}
              </div>
            </div>
          </div>
          
          <button
            onClick={props.onCancelReply}
            class="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
            title="Cancel reply"
          >
            <FiX class="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
          </button>
        </div>
      </div>
    </Show>
  );
}