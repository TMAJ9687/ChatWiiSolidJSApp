import { Component } from "solid-js";

interface LogoProps {
  class?: string;
}

const Logo: Component<LogoProps> = (props) => {
  return (
    <div class={`flex items-center ${props.class || ""}`}>
      <img src="/logo/logo.png" alt="ChatWii" class="w-10 h-10" />
    </div>
  );
};

export default Logo;
