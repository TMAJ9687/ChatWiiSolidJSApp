import { Component, Show, createSignal } from 'solid-js';
import { FiX, FiFlag } from 'solid-icons/fi';
import { reportingService, type ReportReason } from '../../../services/supabase/reportingService';
import { createServiceLogger } from '../../../utils/logger';

const logger = createServiceLogger('ReportModal');

interface ReportModalProps {
  isOpen: boolean;
  userNickname: string;
  userId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const ReportModal: Component<ReportModalProps> = (props) => {
  const [selectedReason, setSelectedReason] = createSignal<ReportReason | ''>('');
  const [customReason, setCustomReason] = createSignal('');
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [error, setError] = createSignal('');
  const [success, setSuccess] = createSignal('');

  const reasons: Array<{ value: ReportReason; label: string; description: string }> = [
    {
      value: 'under_age',
      label: 'Under Age',
      description: 'User is less than 18 years old'
    },
    {
      value: 'abusive',
      label: 'Abusive Behavior',
      description: 'Threatening, hateful, or abusive behavior'
    },
    {
      value: 'scams',
      label: 'Financial Scams',
      description: 'Attempting financial scams or fraud'
    },
    {
      value: 'spam',
      label: 'Spam Messages',
      description: 'Sending unsolicited spam messages'
    },
    {
      value: 'inappropriate',
      label: 'Inappropriate Content',
      description: 'Sharing inappropriate or explicit content'
    },
    {
      value: 'other',
      label: 'Other',
      description: 'Other reason (please specify below)'
    }
  ];

  const resetForm = () => {
    setSelectedReason('');
    setCustomReason('');
    setError('');
    setSuccess('');
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    props.onClose();
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    
    const reason = selectedReason();
    if (!reason) {
      setError('Please select a reason for reporting');
      return;
    }

    if (reason === 'other' && customReason().trim().length === 0) {
      setError('Please provide a custom reason');
      return;
    }

    if (customReason().length > 100) {
      setError('Custom reason cannot exceed 100 characters');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await reportingService.submitReport(props.userId, {
        reason,
        customReason: reason === 'other' ? customReason().trim() : undefined
      });

      // Success - show success message for 2 seconds then close
      setSuccess('Report submitted successfully! Thank you for helping keep our community safe.');
      props.onSuccess?.();
      
      // Auto-close after 2 seconds
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error: any) {
      logger.error('Error submitting report:', error);
      
      // Provide friendly error messages
      let friendlyMessage = 'Failed to submit report. Please try again.';
      
      if (error.message) {
        if (error.message.includes('already reported')) {
          friendlyMessage = 'You have already reported this user. Each user can only be reported once.';
        } else if (error.message.includes('Cannot report yourself')) {
          friendlyMessage = 'You cannot report yourself.';
        } else if (error.message.includes('not authenticated')) {
          friendlyMessage = 'Please log in again to submit a report.';
        } else if (error.message.includes('Custom reason is required')) {
          friendlyMessage = 'Please provide a reason when selecting "Other".';
        } else if (error.message.includes('exceed 100 characters')) {
          friendlyMessage = 'Please keep your custom reason under 100 characters.';
        } else {
          friendlyMessage = error.message;
        }
      }
      
      setError(friendlyMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReasonChange = (reason: ReportReason) => {
    setSelectedReason(reason);
    setError('');
    setSuccess('');
    
    // Clear custom reason if not selecting "other"
    if (reason !== 'other') {
      setCustomReason('');
    }
  };

  const handleCustomReasonInput = (e: Event) => {
    const target = e.target as HTMLTextAreaElement;
    const value = target.value;
    
    if (value.length <= 100) {
      setCustomReason(value);
    }
    
    setError('');
    setSuccess('');
  };

  return (
    <Show when={props.isOpen}>
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div class="bg-white dark:bg-neutral-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
          {/* Header */}
          <div class="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-danger-100 dark:bg-danger-900/20 rounded-full flex items-center justify-center">
                <FiFlag class="w-5 h-5 text-danger-600 dark:text-danger-400" />
              </div>
              <div>
                <h2 class="text-lg font-semibold text-text-1000 dark:text-text-0">
                  Report User
                </h2>
                <p class="text-sm text-text-600 dark:text-text-400">
                  Report {props.userNickname}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              class="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              <FiX class="w-5 h-5 text-text-600 dark:text-text-400" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} class="p-6 space-y-6">
            {/* Reason Selection */}
            <div>
              <label class="block text-sm font-medium text-text-800 dark:text-text-200 mb-3">
                Why are you reporting this user?
              </label>
              <div class="space-y-3">
                {reasons.map((reason) => (
                  <label class="flex items-start gap-3 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="reason"
                      value={reason.value}
                      checked={selectedReason() === reason.value}
                      onChange={() => handleReasonChange(reason.value)}
                      class="mt-0.5 w-4 h-4 text-danger-600 border-neutral-300 focus:ring-danger-500 dark:border-neutral-600 dark:bg-neutral-700"
                    />
                    <div class="flex-1">
                      <div class="font-medium text-text-800 dark:text-text-200">
                        {reason.label}
                      </div>
                      <div class="text-sm text-text-600 dark:text-text-400 mt-1">
                        {reason.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Custom Reason Input */}
            <Show when={selectedReason() === 'other'}>
              <div>
                <label class="block text-sm font-medium text-text-800 dark:text-text-200 mb-2">
                  Please specify the reason
                </label>
                <div class="relative">
                  <textarea
                    value={customReason()}
                    onInput={handleCustomReasonInput}
                    placeholder="Describe the issue in detail..."
                    maxLength={100}
                    rows={3}
                    class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-text-900 dark:text-text-100 placeholder-text-500 dark:placeholder-text-500 focus:outline-none focus:ring-2 focus:ring-danger-500 focus:border-transparent resize-none"
                  />
                  <div class="absolute bottom-2 right-2 text-xs text-text-500 dark:text-text-500">
                    {customReason().length}/100
                  </div>
                </div>
              </div>
            </Show>

            {/* Error Message */}
            <Show when={error()}>
              <div class="p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg">
                <p class="text-sm text-danger-700 dark:text-danger-300">
                  {error()}
                </p>
              </div>
            </Show>

            {/* Success Message */}
            <Show when={success()}>
              <div class="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p class="text-sm text-green-700 dark:text-green-300">
                  {success()}
                </p>
              </div>
            </Show>

            {/* Actions */}
            <div class="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting()}
                class="flex-1 px-4 py-2 text-text-800 dark:text-text-200 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting() || !selectedReason() || (selectedReason() === 'other' && customReason().trim().length === 0)}
                class="flex-1 px-4 py-2 bg-danger-600 hover:bg-danger-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Show when={isSubmitting()}>
                  <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </Show>
                {isSubmitting() ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>

            {/* Disclaimer */}
            <div class="text-xs text-text-500 dark:text-text-500 pt-2 border-t border-neutral-200 dark:border-neutral-700">
              <p>
                Reports are reviewed by administrators within 48 hours. False reports may result in restrictions to your account.
              </p>
            </div>
          </form>
        </div>
      </div>
    </Show>
  );
};

export default ReportModal;