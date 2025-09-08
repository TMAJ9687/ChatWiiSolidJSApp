/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Neutral Colors (Base UI)
        neutral: {
          0: "#FFFFFF",
          100: "#F3F4F6",
          200: "#E5E7EB",
          300: "#D1D5DB",
          700: "#374151",
          800: "#1F2937",
          900: "#111827",
          1000: "#000000",
        },
        // Primary Colors (Oranges - Brand Identity)
        primary: {
          100: "#FFEBE0",
          200: "#FFD5B9",
          300: "#FFB98A",
          500: "#F8954A",
        },
        // Secondary Colors (Teals - Accents)
        secondary: {
          100: "#D9F5F1",
          300: "#80DCD0",
          500: "#3AC6B3",
          600: "#00A991",
        },
        // Success Colors
        success: {
          100: "#DDF3E7",
          600: "#20A967",
        },
        // Danger Colors
        danger: {
          100: "#FFE4E3",
          500: "#F76F69",
        },
        // Warning Colors
        warning: {
          100: "#FFF5D9",
          500: "#FFCC3D",
        },
        // Text Colors
        text: {
          0: "#FFFFFF",
          100: "#E8EAF2",
          200: "#D1D6E4",
          400: "#929FB9",
          600: "#58698D",
          800: "#394A6F",
          1000: "#141E33",
        },
      },
      fontFamily: {
        sans: ["Open Sans", "system-ui", "sans-serif"],
      },
      animation: {
        bounce: 'bounce 1.4s infinite ease-in-out',
      },
    },
  },
  plugins: [],
};
