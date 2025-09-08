import { Component, Show } from 'solid-js';

interface TypingIndicatorProps {
  nickname: string;
  isTyping: boolean;
}

const TypingIndicator: Component<TypingIndicatorProps> = (props) => {
  return (
    <Show when={props.isTyping}>
      <div class="px-4 py-2 flex items-center gap-2">
        <span class="text-sm text-text-600 dark:text-text-400">
          {props.nickname} is typing
        </span>
        <div class="flex gap-1">
          <span class="w-2 h-2 bg-text-400 dark:bg-text-600 rounded-full animate-bounce" 
                style={{ "animation-delay": "0ms" }} />
          <span class="w-2 h-2 bg-text-400 dark:bg-text-600 rounded-full animate-bounce" 
                style={{ "animation-delay": "150ms" }} />
          <span class="w-2 h-2 bg-text-400 dark:bg-text-600 rounded-full animate-bounce" 
                style={{ "animation-delay": "300ms" }} />
        </div>
      </div>
    </Show>
  );
};

export default TypingIndicator;