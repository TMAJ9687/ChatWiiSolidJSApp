import { Component } from "solid-js";

interface CountryFlagProps {
  countryCode: string;
  countryName?: string;
  class?: string;
}

const CountryFlag: Component<CountryFlagProps> = (props) => {
  const flagSrc = () => {
    if (!props.countryCode) return "/flags/us.svg"; // Default to US flag
    const code = props.countryCode.toLowerCase();
    // Special case for Israel -> Palestine
    if (code === "il") return "/flags/ps.svg";
    return `/flags/${code}.svg`;
  };

  return (
    <div class={`flex items-center justify-center gap-2 ${props.class || ""}`}>
      <img
        src={flagSrc()}
        alt={props.countryName || props.countryCode}
        class="w-6 h-4 object-cover"
        onError={(e) => {
          // Fallback to US flag if not found
          e.currentTarget.src = "/flags/us.svg";
        }}
      />
      <span class="text-text-600 dark:text-text-400 text-sm">
        Connecting from {props.countryName || "United States"}
      </span>
    </div>
  );
};

export default CountryFlag;
