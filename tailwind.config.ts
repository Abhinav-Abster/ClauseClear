import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        legal: {
          50: "#f0f7ff",
          100: "#e0effe",
          200: "#bae0fd",
          300: "#7cc4fb",
          400: "#36a3f6",
          500: "#0c85e8",
          600: "#0267c7",
          700: "#0352a1",
          800: "#074585",
          900: "#0c3b6e",
          950: "#082549",
        },
      },
    },
  },
  plugins: [],
};

export default config;
