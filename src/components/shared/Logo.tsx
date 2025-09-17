import { Component } from "solid-js";

interface LogoProps {
  class?: string;
}

const Logo: Component<LogoProps> = (props) => {
  return (
    <div class={`flex items-center ${props.class || ""}`}>
      <img src="/logo/logo.png?v=3" alt="ChatWii" class="w-10 h-10" width="40" height="40" />
    </div>
  );
};

export default Logo;
