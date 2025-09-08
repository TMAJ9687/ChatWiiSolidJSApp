import { Component, Show, createSignal, onCleanup } from 'solid-js';
import { FiMoreVertical, FiSlash, FiAlertTriangle, FiTrash2 } from 'solid-icons/fi';
import type { User } from '../../../types/user.types';

interface ChatOptionsMenuProps {
  user: User | null;
  isBlocked: boolean;
  onBlock: () => void;
  onUnblock: () => void;
  onReport: () => void;
  onClearChat: () => void;
}

const ChatOptionsMenu: Component<ChatOptionsMenuProps> = (props) => {
  const [isOpen, setIsOpen] = createSignal(false);
  let menuRef: HTMLDivElement | undefined;

  const handleClickOutside = (e: MouseEvent) => {
    if (menuRef && !menuRef.contains(e.target as Node)) {
      setIsOpen(false);
    }
  };

  const toggleMenu = (e: MouseEvent) => {
    e.stopPropagation();
    const newState = !isOpen();
    setIsOpen(newState);
    
    if (newState) {
      document.addEventListener('click', handleClickOutside);
    } else {
      document.removeEventListener('click', handleClickOutside);
    }
  };

  onCleanup(() => {
    document.removeEventListener('click', handleClickOutside);
  });

  return (
    <div class="relative" ref={menuRef}>
      <button
        onClick={toggleMenu}
        class="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
        aria-label="More options"
      >
        <FiMoreVertical class="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>

      <Show when={isOpen()}>
        <div class="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 py-2 z-50">
          {props.isBlocked ? (
            <button
              onClick={() => {
                props.onUnblock();
                setIsOpen(false);
              }}
              class="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
            >
              <FiSlash class="w-4 h-4 text-success-600" />
              <span class="text-gray-800 dark:text-gray-200">Unblock User</span>
            </button>
          ) : (
            <button
              onClick={() => {
                props.onBlock();
                setIsOpen(false);
              }}
              class="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
            >
              <FiSlash class="w-4 h-4 text-danger-500" />
              <span class="text-gray-800 dark:text-gray-200">Block User</span>
            </button>
          )}
          
          <button
            onClick={() => {
              props.onReport();
              setIsOpen(false);
            }}
            class="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
          >
            <FiAlertTriangle class="w-4 h-4 text-warning-500" />
            <span class="text-gray-800 dark:text-gray-200">Report User</span>
          </button>

          <div class="my-1 border-t border-neutral-200 dark:border-neutral-700" />

          <button
            onClick={() => {
              props.onClearChat();
              setIsOpen(false);
            }}
            class="w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
          >
            <FiTrash2 class="w-4 h-4 text-text-400" />
            <span class="text-gray-800 dark:text-gray-200">Clear Conversation</span>
          </button>
        </div>
      </Show>
    </div>
  );
};

export default ChatOptionsMenu;