import { Component } from "solid-js";

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const LogoutConfirmModal: Component<LogoutConfirmModalProps> = (props) => {
  return (
    <div
      class={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${
        props.isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Backdrop */}
      <div 
        class="absolute inset-0 bg-black bg-opacity-50"
        onClick={props.onCancel}
      />
      
      {/* Modal */}
      <div class="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
        {/* Header */}
        <div class="text-center mb-6">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Leaving so soon?
          </h2>
          <p class="text-gray-600 dark:text-gray-300">
            We hope to see you again!
          </p>
        </div>

        {/* Icon */}
        <div class="flex justify-center mb-6">
          <div class="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
        </div>

        {/* Buttons */}
        <div class="flex space-x-3">
          <button
            onClick={props.onCancel}
            class="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors duration-200"
          >
            No, Stay
          </button>
          <button
            onClick={props.onConfirm}
            class="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors duration-200"
          >
            Yes, Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutConfirmModal;