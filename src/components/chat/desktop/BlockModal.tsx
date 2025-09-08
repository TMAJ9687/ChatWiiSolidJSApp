import { Component, Show } from 'solid-js';
import { FiX } from 'solid-icons/fi';

interface BlockModalProps {
  isOpen: boolean;
  userNickname: string;
  isBlocking: boolean; // true for block, false for unblock
  onConfirm: () => void;
  onCancel: () => void;
}

const BlockModal: Component<BlockModalProps> = (props) => {
  return (
    <Show when={props.isOpen}>
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div class="bg-white dark:bg-neutral-800 rounded-xl max-w-md w-full p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-text-1000 dark:text-text-0">
              {props.isBlocking ? 'Block User' : 'Unblock User'}
            </h3>
            <button
              onClick={props.onCancel}
              class="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              <FiX class="w-5 h-5 text-text-600 dark:text-text-400" />
            </button>
          </div>

          <p class="text-text-600 dark:text-text-400 mb-6">
            {props.isBlocking ? (
              <>
                Are you sure you want to block <span class="font-semibold text-text-1000 dark:text-text-0">{props.userNickname}</span>?
                <br /><br />
                Blocked users:
                <ul class="list-disc list-inside mt-2 text-sm">
                  <li>Cannot send you messages</li>
                  <li>Cannot see when you're online</li>
                  <li>Will appear grayed out in your list</li>
                </ul>
              </>
            ) : (
              <>
                Are you sure you want to unblock <span class="font-semibold text-text-1000 dark:text-text-0">{props.userNickname}</span>?
                <br /><br />
                They will be able to send you messages again.
              </>
            )}
          </p>

          <div class="flex gap-3">
            <button
              onClick={props.onCancel}
              class="flex-1 py-2 px-4 rounded-lg bg-neutral-200 dark:bg-neutral-700 text-text-800 dark:text-text-200 hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={props.onConfirm}
              class={`flex-1 py-2 px-4 rounded-lg text-white transition-colors
                      ${props.isBlocking 
                        ? 'bg-danger-500 hover:bg-danger-600' 
                        : 'bg-success-500 hover:bg-success-600'}`}
            >
              {props.isBlocking ? 'Block User' : 'Unblock User'}
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default BlockModal;