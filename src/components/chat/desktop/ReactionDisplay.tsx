import { createSignal, createEffect, For, Show, onCleanup } from 'solid-js';
import { reactionService } from '../../../services/supabase';
import type { MessageReaction, ReactionSummary } from '../../../types/message.types';

interface ReactionDisplayProps {
  messageId: string;
  currentUserId: string;
  userNickname?: string;
  className?: string;
}

export default function ReactionDisplay(props: ReactionDisplayProps) {
  const [reactions, setReactions] = createSignal<MessageReaction[]>([]);
  const [reactionSummaries, setReactionSummaries] = createSignal<ReactionSummary[]>([]);
  const [showTooltip, setShowTooltip] = createSignal<{ emoji: string; users: string[] } | null>(null);
  const [tooltipPosition, setTooltipPosition] = createSignal({ x: 0, y: 0 });
  
  let unsubscribe: (() => void) | null = null;
  let tooltipTimeout: NodeJS.Timeout | null = null;

  // Listen to reactions for this message
  createEffect(() => {
    if (props.messageId) {
      // Clean up previous listener
      if (unsubscribe) {
        unsubscribe();
      }

      // Listen to reactions
      unsubscribe = reactionService.listenToMessageReactions(
        props.messageId,
        (messageReactions) => {
          setReactions(messageReactions);
          // Process reactions into summaries
          const summaries = reactionService.processReactionsToSummary(
            messageReactions,
            props.currentUserId
          );
          setReactionSummaries(summaries);
        }
      );
    }
  });

  onCleanup(() => {
    if (unsubscribe) {
      unsubscribe();
    }
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
    }
  });

  const handleReactionClick = async (emoji: string) => {
    try {
      await reactionService.toggleReaction(props.messageId, emoji, props.userNickname);
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
  };

  const handleMouseEnter = (e: MouseEvent, summary: ReactionSummary) => {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    
    // Get user nicknames for this reaction
    const userNicknames = reactions()
      .filter(r => r.emoji === summary.emoji)
      .map(r => r.userNickname || 'Anonymous');

    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 8
    });

    setShowTooltip({
      emoji: summary.emoji,
      users: userNicknames
    });

    // Clear any existing timeout
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
    }
  };

  const handleMouseLeave = () => {
    // Delay hiding tooltip to prevent flicker
    tooltipTimeout = setTimeout(() => {
      setShowTooltip(null);
    }, 100);
  };

  const getTooltipText = (tooltip: { emoji: string; users: string[] }) => {
    const users = tooltip.users;
    if (users.length === 0) return '';
    
    if (users.length === 1) {
      return `${users[0]} reacted with ${tooltip.emoji}`;
    } else if (users.length === 2) {
      return `${users[0]} and ${users[1]} reacted with ${tooltip.emoji}`;
    } else if (users.length === 3) {
      return `${users[0]}, ${users[1]} and ${users[2]} reacted with ${tooltip.emoji}`;
    } else {
      return `${users[0]}, ${users[1]} and ${users.length - 2} others reacted with ${tooltip.emoji}`;
    }
  };

  // Don't render if no reactions
  if (reactionSummaries().length === 0) {
    return null;
  }

  return (
    <>
      <div class={`flex flex-wrap gap-1 mt-1 ${props.className || ''}`}>
        <For each={reactionSummaries()}>
          {(summary) => (
            <button
              onClick={() => handleReactionClick(summary.emoji)}
              onMouseEnter={(e) => handleMouseEnter(e, summary)}
              onMouseLeave={handleMouseLeave}
              class={`
                inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all duration-200
                border hover:scale-105 active:scale-95
                ${summary.userReacted
                  ? 'bg-secondary-100 border-secondary-300 text-secondary-700 dark:bg-secondary-900 dark:border-secondary-600 dark:text-secondary-300'
                  : 'bg-neutral-100 border-neutral-200 text-neutral-700 hover:bg-neutral-150 dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-650'
                }
              `}
              title={`React with ${summary.emoji}`}
            >
              <span class="text-sm">{summary.emoji}</span>
              <Show when={summary.count > 1}>
                <span class="font-medium">{summary.count}</span>
              </Show>
            </button>
          )}
        </For>
      </div>

      {/* Reaction Tooltip */}
      <Show when={showTooltip()}>
        <div
          class="fixed z-50 px-2 py-1 bg-neutral-900 text-white text-xs rounded shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full"
          style={{
            left: `${tooltipPosition().x}px`,
            top: `${tooltipPosition().y}px`
          }}
        >
          {getTooltipText(showTooltip()!)}
          {/* Tooltip arrow */}
          <div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-neutral-900"></div>
        </div>
      </Show>
    </>
  );
}