import { createSignal, For, Show, onMount, onCleanup } from 'solid-js';
import { FiSmile, FiPlus } from 'solid-icons/fi';
import EmojiPicker from './EmojiPicker';
import { reactionService } from '../../../services/supabase';

interface ReactionPickerProps {
  messageId: string;
  userNickname?: string;
  onReactionAdded?: (emoji: string) => void;
  className?: string;
}

export default function ReactionPicker(props: ReactionPickerProps) {
  const [showQuickReactions, setShowQuickReactions] = createSignal(false);
  const [showEmojiPicker, setShowEmojiPicker] = createSignal(false);
  const [isReacting, setIsReacting] = createSignal(false);
  
  let pickerRef: HTMLDivElement | undefined;
  let hoverTimeout: NodeJS.Timeout | null = null;

  const quickReactions = reactionService.getPopularEmojis().slice(0, 8);

  const handleQuickReaction = async (emoji: string) => {
    if (isReacting()) return;
    
    setIsReacting(true);
    try {
      await reactionService.toggleReaction(props.messageId, emoji, props.userNickname);
      props.onReactionAdded?.(emoji);
      setShowQuickReactions(false);
    } catch (error) {
      console.error('Error adding quick reaction:', error);
    } finally {
      setIsReacting(false);
    }
  };

  const handleEmojiSelect = async (emoji: string) => {
    if (isReacting()) return;
    
    setIsReacting(true);
    try {
      await reactionService.toggleReaction(props.messageId, emoji, props.userNickname);
      props.onReactionAdded?.(emoji);
      setShowEmojiPicker(false);
      setShowQuickReactions(false);
    } catch (error) {
      console.error('Error adding emoji reaction:', error);
    } finally {
      setIsReacting(false);
    }
  };

  const handleButtonClick = () => {
    setShowQuickReactions(!showQuickReactions());
  };

  const handleButtonHover = () => {
    if (!showQuickReactions()) {
      setShowQuickReactions(true);
    }
  };

  const handleClickOutside = (e: Event) => {
    if (pickerRef && !pickerRef.contains(e.target as Node)) {
      setShowQuickReactions(false);
    }
  };

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
  });

  onCleanup(() => {
    document.removeEventListener('click', handleClickOutside);
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
  });

  return (
    <div 
      ref={pickerRef} 
      class={`relative ${props.className || ''}`}
    >
      {/* Reaction Button */}
      <button
        onClick={handleButtonClick}
        onMouseEnter={handleButtonHover}
        disabled={isReacting()}
        class={`
          p-1.5 rounded-lg transition-all duration-200
          ${showQuickReactions() 
            ? 'bg-secondary-100 text-secondary-600 dark:bg-secondary-900 dark:text-secondary-400' 
            : 'hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400'
          }
          ${isReacting() ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
        `}
        title="Add reaction"
      >
        <FiSmile class="w-4 h-4" />
      </button>

      {/* Quick Reactions Popup */}
      <Show when={showQuickReactions()}>
        <div class="absolute bottom-full left-0 mb-2 z-50 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-xl p-2 min-w-max"
             style="filter: drop-shadow(0 10px 8px rgb(0 0 0 / 0.04)) drop-shadow(0 4px 3px rgb(0 0 0 / 0.1));"
        >
          {/* Quick Reaction Buttons */}
          <div class="flex items-center gap-1 mb-2">
            <For each={quickReactions}>
              {(emoji) => (
                <button
                  onClick={() => handleQuickReaction(emoji)}
                  disabled={isReacting()}
                  class="p-2 text-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors disabled:opacity-50"
                  title={`React with ${emoji}`}
                >
                  {emoji}
                </button>
              )}
            </For>
            
            {/* More Emojis Button */}
            <button
              onClick={() => setShowEmojiPicker(true)}
              disabled={isReacting()}
              class="p-2 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors disabled:opacity-50"
              title="More emojis"
            >
              <FiPlus class="w-4 h-4" />
            </button>
          </div>

          {/* Usage Hint */}
          <div class="text-xs text-neutral-400 dark:text-neutral-500 px-1">
            Click to react • Click again to remove
          </div>
        </div>
      </Show>

      {/* Full Emoji Picker */}
      <EmojiPicker
        isOpen={showEmojiPicker()}
        onEmojiSelect={handleEmojiSelect}
        onClose={() => setShowEmojiPicker(false)}
        position="top"
      />
    </div>
  );
}