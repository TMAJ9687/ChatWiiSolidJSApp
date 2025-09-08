import { Component, createSignal, onMount } from "solid-js";
import { BiRegularSun, BiSolidMoon } from "solid-icons/bi";

const ThemeToggle: Component = () => {
  const [isDark, setIsDark] = createSignal(false);

  onMount(() => {
    const theme = localStorage.getItem("theme");
    if (
      theme === "dark" ||
      (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    }
  });

  const toggleTheme = () => {
    const newTheme = !isDark();
    setIsDark(newTheme);

    if (newTheme) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <button
      onClick={toggleTheme}
      class="p-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
      aria-label="Toggle theme"
    >
      {isDark() ? (
        <BiSolidMoon class="w-5 h-5 text-text-600 dark:text-text-200" />
      ) : (
        <BiRegularSun class="w-5 h-5 text-text-600 dark:text-text-200" />
      )}
    </button>
  );
};

export default ThemeToggle;
