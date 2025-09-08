import { Component, Show, createSignal } from 'solid-js';
import { FiAlertTriangle, FiCheck, FiX } from 'solid-icons/fi';

interface SiteRulesModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

const SiteRulesModal: Component<SiteRulesModalProps> = (props) => {
  const [showWarning, setShowWarning] = createSignal(false);

  const handleDecline = () => {
    setShowWarning(true);
  };

  const handleWarningYes = () => {
    // Kick user out - redirect to landing page or logout
    props.onDecline();
  };

  const handleWarningNo = () => {
    setShowWarning(false);
  };

  const handleAccept = () => {
    props.onAccept();
  };

  return (
    <Show when={props.isOpen}>
      <div class="fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center p-4">
        <div class="bg-white dark:bg-neutral-800 rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-neutral-200 dark:border-neutral-700">
          
          {/* Warning Dialog */}
          <Show when={showWarning()}>
            <div class="absolute inset-0 bg-black/50 z-10 flex items-center justify-center p-4">
              <div class="bg-white dark:bg-neutral-800 rounded-xl p-6 max-w-md w-full shadow-2xl border-2 border-danger-200 dark:border-danger-800">
                <div class="flex items-center gap-3 mb-4">
                  <div class="w-12 h-12 bg-danger-100 dark:bg-danger-900/20 rounded-full flex items-center justify-center">
                    <FiAlertTriangle class="w-6 h-6 text-danger-600 dark:text-danger-400" />
                  </div>
                  <div>
                    <h3 class="text-lg font-semibold text-text-1000 dark:text-text-0">Warning</h3>
                    <p class="text-sm text-text-600 dark:text-text-400">Compliance Required</p>
                  </div>
                </div>
                
                <p class="text-text-800 dark:text-text-200 mb-6">
                  If you are not willing to comply with our site rules, you will be removed from the platform. 
                  Are you sure you want to decline?
                </p>
                
                <div class="flex gap-3">
                  <button
                    onClick={handleWarningYes}
                    class="flex-1 px-4 py-2 bg-danger-600 hover:bg-danger-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Yes, Remove Me
                  </button>
                  <button
                    onClick={handleWarningNo}
                    class="flex-1 px-4 py-2 bg-neutral-200 dark:bg-neutral-600 text-neutral-800 dark:text-neutral-100 rounded-lg font-medium hover:bg-neutral-300 dark:hover:bg-neutral-500 transition-colors"
                  >
                    No, Go Back
                  </button>
                </div>
              </div>
            </div>
          </Show>

          {/* Main Modal Content */}
          <div class="p-4">
            {/* Header */}
            <div class="text-center mb-4">
              <h2 class="text-xl font-bold text-text-1000 dark:text-text-0 mb-1">
                Welcome to ChatWii
              </h2>
              <p class="text-sm text-text-600 dark:text-text-400">
                Please review and accept our site rules
              </p>
            </div>

            {/* Disclaimer */}
            <div class="bg-danger-50 dark:bg-danger-900/10 border border-danger-200 dark:border-danger-800 rounded-lg p-3 mb-4">
              <p class="text-danger-700 dark:text-danger-300 font-bold text-center text-sm">
                I hereby acknowledge that ChatWii staff aren't responsible for any misuse of the chat
              </p>
            </div>

            {/* Site Rules */}
            <div class="space-y-3 mb-6">
              <h3 class="text-base font-semibold text-text-1000 dark:text-text-0 border-b border-neutral-200 dark:border-neutral-700 pb-1">
                Site Rules
              </h3>
              
              <div class="space-y-2">
                {/* Age Restriction */}
                <div class="flex items-start gap-2 p-2 bg-danger-50 dark:bg-danger-900/10 rounded border border-danger-200 dark:border-danger-800">
                  <span class="text-danger-600 dark:text-danger-400 font-bold text-xs mt-0.5">1.</span>
                  <div>
                    <p class="font-bold text-danger-700 dark:text-danger-300 text-sm">
                      Age Restriction: Must be 18 or older
                    </p>
                  </div>
                </div>

                {/* Other Rules */}
                <div class="flex items-start gap-2 p-2 bg-neutral-50 dark:bg-neutral-700/50 rounded">
                  <span class="text-text-600 dark:text-text-400 font-bold text-xs mt-0.5">2.</span>
                  <p class="text-sm text-text-800 dark:text-text-200">
                    <span class="font-semibold">Respectful Communication:</span> No harassment or hate speech
                  </p>
                </div>

                <div class="flex items-start gap-2 p-2 bg-neutral-50 dark:bg-neutral-700/50 rounded">
                  <span class="text-text-600 dark:text-text-400 font-bold text-xs mt-0.5">3.</span>
                  <p class="text-sm text-text-800 dark:text-text-200">
                    <span class="font-semibold">No NSFW Content:</span> No explicit or inappropriate content
                  </p>
                </div>

                <div class="flex items-start gap-2 p-2 bg-neutral-50 dark:bg-neutral-700/50 rounded">
                  <span class="text-text-600 dark:text-text-400 font-bold text-xs mt-0.5">4.</span>
                  <p class="text-sm text-text-800 dark:text-text-200">
                    <span class="font-semibold">Protect Privacy:</span> Don't share personal information
                  </p>
                </div>

                <div class="flex items-start gap-2 p-2 bg-neutral-50 dark:bg-neutral-700/50 rounded">
                  <span class="text-text-600 dark:text-text-400 font-bold text-xs mt-0.5">5.</span>
                  <p class="text-sm text-text-800 dark:text-text-200">
                    <span class="font-semibold">No Spam:</span> No unsolicited messages or advertising
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div class="flex gap-3">
              <button
                onClick={handleDecline}
                class="flex-1 px-4 py-2 bg-neutral-200 dark:bg-neutral-600 text-neutral-800 dark:text-neutral-100 rounded-lg font-medium hover:bg-neutral-300 dark:hover:bg-neutral-500 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <FiX class="w-4 h-4" />
                Decline
              </button>
              <button
                onClick={handleAccept}
                class="flex-1 px-4 py-2 bg-secondary-600 hover:bg-secondary-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <FiCheck class="w-4 h-4" />
                Accept
              </button>
            </div>

            {/* Footer */}
            <div class="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-700">
              <p class="text-xs text-text-500 dark:text-text-400 text-center">
                By accepting, you agree to comply with these rules. Violations may result in account restrictions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default SiteRulesModal;