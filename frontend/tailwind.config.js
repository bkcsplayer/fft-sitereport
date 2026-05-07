/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eef7ff",
          100: "#d9edff",
          200: "#bce0ff",
          300: "#8eceff",
          400: "#59b2ff",
          500: "#3391ff",
          600: "#1a6ff5",
          700: "#1459e1",
          800: "#1748b6",
          900: "#193f8f",
          950: "#142857",
        },
        dark: {
          50: "#f6f6f7",
          100: "#e1e3e6",
          200: "#c3c6cd",
          300: "#9da2ab",
          400: "#787e89",
          500: "#5e636e",
          600: "#4a4e57",
          700: "#3d4048",
          800: "#1a1d24",
          900: "#12141a",
          950: "#0a0c10",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
