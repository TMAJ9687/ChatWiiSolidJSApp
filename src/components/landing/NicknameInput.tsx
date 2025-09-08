import { Component, createSignal } from "solid-js";
import { FiRefreshCw } from "solid-icons/fi";

interface NicknameInputProps {
  value: string;
  onInput: (value: string) => void;
  error?: string;
  onRandomize: () => void;
}

const NicknameInput: Component<NicknameInputProps> = (props) => {
  const maxLength = 20;

  return (
    <div class="space-y-2">
      <label class="text-sm font-medium text-text-800 dark:text-text-200">
        Nickname
      </label>
      <div class="relative">
        <input
          type="text"
          value={props.value}
          onInput={(e) => props.onInput(e.currentTarget.value)}
          placeholder="Enter your nickname"
          maxLength={maxLength}
          class="w-full px-4 py-3 pr-24 border border-neutral-200 dark:border-neutral-700 rounded-lg
                 bg-white dark:bg-neutral-800 text-text-1000 dark:text-text-0
                 placeholder:text-text-400 dark:placeholder:text-text-600
                 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
        />
        <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <span class="text-sm text-text-400 dark:text-text-600">
            {props.value.length}/{maxLength}
          </span>
          <button
            onClick={props.onRandomize}
            class="p-2 rounded-lg bg-primary-500 hover:bg-primary-300 transition-colors"
            aria-label="Generate random nickname"
          >
            <FiRefreshCw class="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
      {props.error && <p class="text-sm text-danger-500">{props.error}</p>}
    </div>
  );
};

export default NicknameInput;
