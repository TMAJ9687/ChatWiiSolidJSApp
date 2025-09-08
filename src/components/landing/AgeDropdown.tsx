import { Component, createSignal, For } from "solid-js";
import { FiChevronDown } from "solid-icons/fi";

interface AgeDropdownProps {
  value: number | null;
  onChange: (age: number) => void;
}

const AgeDropdown: Component<AgeDropdownProps> = (props) => {
  const ages = () => Array.from({ length: 73 }, (_, i) => i + 18); // 18 to 90

  return (
    <div class="space-y-2">
      <label class="text-sm font-medium text-text-800 dark:text-text-200">
        Age
      </label>
      <div class="relative">
        <select
          value={props.value || ""}
          onChange={(e) => props.onChange(parseInt(e.currentTarget.value))}
          class="w-full px-4 py-3 pr-10 border border-neutral-200 dark:border-neutral-700 rounded-lg
                 bg-white dark:bg-neutral-800 text-text-1000 dark:text-text-0
                 appearance-none cursor-pointer
                 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent"
        >
          <option value="" disabled>
            Select your age
          </option>
          <For each={ages()}>{(age) => <option value={age}>{age}</option>}</For>
        </select>
        <FiChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-400 pointer-events-none" />
      </div>
      <p class="text-xs text-text-600 dark:text-text-400">
        You must be 18 or older to use ChatWii
      </p>
    </div>
  );
};

export default AgeDropdown;
