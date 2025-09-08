import { Component } from "solid-js";

interface GenderSelectionProps {
  value: "male" | "female" | null;
  onChange: (gender: "male" | "female") => void;
}

const GenderSelection: Component<GenderSelectionProps> = (props) => {
  return (
    <div class="space-y-2">
      <label class="text-sm font-medium text-text-800 dark:text-text-200">
        Gender
      </label>
      <div class="grid grid-cols-2 gap-3">
        <button
          onClick={() => props.onChange("male")}
          class={`py-3 px-4 rounded-lg border-2 transition-all flex items-center justify-center
                  ${
                    props.value === "male"
                      ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                      : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                  }`}
        >
          <span class="font-medium text-text-900 dark:text-text-100">Male</span>
        </button>
        <button
          onClick={() => props.onChange("female")}
          class={`py-3 px-4 rounded-lg border-2 transition-all flex items-center justify-center
                  ${
                    props.value === "female"
                      ? "border-pink-400 bg-pink-50 dark:bg-pink-900/20"
                      : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                  }`}
        >
          <span class="font-medium text-text-900 dark:text-text-100">Female</span>
        </button>
      </div>
    </div>
  );
};

export default GenderSelection;
