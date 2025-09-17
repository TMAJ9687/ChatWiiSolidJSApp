import { createSignal, createEffect, Show } from 'solid-js';
import { FiTrash2, FiAlertTriangle, FiLoader, FiX, FiMessageCircle, FiUser } from 'solid-icons/fi';
import { conversationService, type ConversationStats } from '../../../services/supabase';
import { createServiceLogger } from '../../../utils/logger';

const logger = createServiceLogger('ClearConversationModal');

interface ClearConversationModalProps {
  isOpen: boolean;
  currentUserId: string;
  otherUserId: string;
  otherUserNickname: string;
  onConfirm: (clearType: 'all' | 'mine') => void;
  onCancel: () => void;
}

export default function ClearConversationModal(props: ClearConversationModalProps) {
  const [isLoading, setIsLoading] = createSignal(false);
  const [stats, setStats] = createSignal<ConversationStats | null>(null);
  const [clearType, setClearType] = createSignal<'all' | 'mine'>('mine');
  const [confirmationStep, setConfirmationStep] = createSignal(false);
  const [error, setError] = createSignal('');

  // Load conversation stats when modal opens
  createEffect(async () => {
    if (props.isOpen && props.currentUserId && props.otherUserId) {
      setIsLoading(true);
      setError('');
      try {
        const conversationStats = await conversationService.getConversationStats(
          props.currentUserId,
          props.otherUserId
        );
        setStats(conversationStats);
      } catch (error) {
        logger.error('Failed to load conversation stats:', error);
        setError('Failed to load conversation statistics');
      } finally {
        setIsLoading(false);
      }
    }
  });

  const handleClearTypeChange = (type: 'all' | 'mine') => {
    setClearType(type);
    setConfirmationStep(false);
  };

  const handleProceed = () => {
    const currentStats = stats();
    if (!currentStats) return;

    const validation = conversationService.validateClearOperation(currentStats, clearType());
    if (!validation.valid) {
      setError(validation.warning || 'Cannot clear conversation');
      return;
    }

    const canClear = conversationService.canClearConversation(props.currentUserId);
    if (!canClear.canClear) {
      setError(canClear.reason || 'Cannot clear conversation at this time');
      return;
    }

    setConfirmationStep(true);
    setError('');
  };

  const handleConfirm = () => {
    conversationService.recordConversationClear(props.currentUserId);
    props.onConfirm(clearType());
    handleCancel();
  };

  const handleCancel = () => {
    setConfirmationStep(false);
    setClearType('mine');
    setStats(null);
    setError('');
    props.onCancel();
  };

  const getClearTypeDescription = (type: 'all' | 'mine'): string => {
    if (type === 'all') {
      return `Delete the entire conversation between you and ${props.otherUserNickname}. This removes all messages from both sides permanently.`;
    }
    return `Delete only the messages you sent to ${props.otherUserNickname}. Their messages will remain visible to you.`;
  };

  const getConfirmationWarning = (): string => {
    const currentStats = stats();
    if (!currentStats) return '';

    if (clearType() === 'all') {
      return `This will permanently delete all ${currentStats.totalMessages} messages in your conversation with ${props.otherUserNickname}. This action cannot be undone.`;
    }
    
    const myMessagesCount = Math.floor(currentStats.totalMessages / 2); // Rough estimate
    return `This will permanently delete your messages in this conversation. This action cannot be undone.`;
  };

  return (
    <Show when={props.isOpen}>
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div class="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div class="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
            <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Clear Conversation
            </h3>
            <button
              onClick={handleCancel}
              class="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
            >
              <FiX class="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
            </button>
          </div>

          {/* Content */}
          <div class="p-6">
            <Show
              when={!isLoading()}
              fallback={
                <div class="flex items-center justify-center py-8">
                  <FiLoader class="w-6 h-6 animate-spin text-neutral-500" />
                  <span class="ml-2 text-neutral-600 dark:text-neutral-400">
                    Loading conversation...
                  </span>
                </div>
              }
            >
              <Show when={!confirmationStep()}>
                {/* Initial Step: Choose clear type */}
                <div class="space-y-4">
                  {/* Conversation Stats */}
                  <Show when={stats()}>
                    <div class="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4">
                      <div class="flex items-center gap-2 mb-2">
                        <FiMessageCircle class="w-4 h-4 text-neutral-500" />
                        <span class="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          Conversation with {props.otherUserNickname}
                        </span>
                      </div>
                      <p class="text-sm text-neutral-600 dark:text-neutral-400">
                        {conversationService.formatStats(stats()!)}
                      </p>
                    </div>
                  </Show>

                  {/* Clear Type Options */}
                  <div class="space-y-3">
                    <div class="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      What would you like to clear?
                    </div>

                    {/* Clear My Messages */}
                    <label class={`
                      flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                      ${clearType() === 'mine' 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/50'
                      }
                    `}>
                      <input
                        type="radio"
                        name="clearType"
                        value="mine"
                        checked={clearType() === 'mine'}
                        onChange={() => handleClearTypeChange('mine')}
                        class="mt-0.5 text-blue-500 focus:ring-blue-500"
                      />
                      <div>
                        <div class="flex items-center gap-2 mb-1">
                          <FiUser class="w-4 h-4" />
                          <span class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                            My Messages Only
                          </span>
                        </div>
                        <p class="text-xs text-neutral-600 dark:text-neutral-400">
                          {getClearTypeDescription('mine')}
                        </p>
                      </div>
                    </label>

                    {/* Clear All Messages */}
                    <label class={`
                      flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                      ${clearType() === 'all' 
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                        : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/50'
                      }
                    `}>
                      <input
                        type="radio"
                        name="clearType"
                        value="all"
                        checked={clearType() === 'all'}
                        onChange={() => handleClearTypeChange('all')}
                        class="mt-0.5 text-red-500 focus:ring-red-500"
                      />
                      <div>
                        <div class="flex items-center gap-2 mb-1">
                          <FiTrash2 class="w-4 h-4" />
                          <span class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                            Entire Conversation
                          </span>
                        </div>
                        <p class="text-xs text-neutral-600 dark:text-neutral-400">
                          {getClearTypeDescription('all')}
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Error Display */}
                  <Show when={error()}>
                    <div class="flex items-center gap-2 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                      <FiAlertTriangle class="w-4 h-4 text-red-500 flex-shrink-0" />
                      <p class="text-sm text-red-600 dark:text-red-400">
                        {error()}
                      </p>
                    </div>
                  </Show>
                </div>
              </Show>

              <Show when={confirmationStep()}>
                {/* Confirmation Step */}
                <div class="space-y-4">
                  <div class="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <FiAlertTriangle class="w-6 h-6 text-red-500 flex-shrink-0" />
                    <div>
                      <h4 class="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                        Permanent Action
                      </h4>
                      <p class="text-sm text-red-600 dark:text-red-400">
                        {getConfirmationWarning()}
                      </p>
                    </div>
                  </div>

                  <div class="text-center">
                    <p class="text-sm text-neutral-600 dark:text-neutral-400">
                      Are you absolutely sure you want to proceed?
                    </p>
                  </div>
                </div>
              </Show>
            </Show>
          </div>

          {/* Actions */}
          <div class="flex items-center justify-end gap-2 p-6 border-t border-neutral-200 dark:border-neutral-700">
            <button
              onClick={handleCancel}
              class="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
            >
              Cancel
            </button>

            <Show when={!confirmationStep()}>
              <button
                onClick={handleProceed}
                disabled={isLoading() || !stats()}
                class={`
                  px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                  ${clearType() === 'all'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }
                `}
              >
                Continue
              </button>
            </Show>

            <Show when={confirmationStep()}>
              <button
                onClick={() => setConfirmationStep(false)}
                class="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
              >
                Back
              </button>
              
              <button
                onClick={handleConfirm}
                class="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Yes, Clear Forever
              </button>
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
}