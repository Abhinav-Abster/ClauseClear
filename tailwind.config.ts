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
      fontFamily: {
        sans: ["var(--font-roboto)", "Roboto", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
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
        // Material You (MD3) Tonal System - Seed #6750A4 (Purple)
        md: {
          primary: "#6750A4",
          "on-primary": "#FFFFFF",
          "primary-container": "#EADDFF",
          "on-primary-container": "#21005D",
          secondary: "#625B71",
          "on-secondary": "#FFFFFF",
          "secondary-container": "#E8DEF8",
          "on-secondary-container": "#1D192B",
          tertiary: "#7D5260",
          "on-tertiary": "#FFFFFF",
          "tertiary-container": "#FFD8E4",
          "on-tertiary-container": "#31111D",
          error: "#B3261E",
          "on-error": "#FFFFFF",
          "error-container": "#F9DEDC",
          "on-error-container": "#410E0B",
          background: "#FFFBFE",
          "on-background": "#1C1B1F",
          surface: "#FFFBFE",
          "on-surface": "#1C1B1F",
          "surface-variant": "#E7E0EC",
          "on-surface-variant": "#49454F",
          "surface-container-lowest": "#FFFFFF",
          "surface-container-low": "#F7F2FA",
          "surface-container": "#F3EDF7",
          "surface-container-high": "#ECE6F0",
          "surface-container-highest": "#E6E0E9",
          outline: "#79747E",
          "outline-variant": "#CAC4D0",
          scrim: "#000000",
        },
      },
      borderRadius: {
        "md-xs": "8px",
        "md-sm": "12px",
        "md-md": "16px",
        "md-lg": "24px",
        "md-xl": "28px",
        "md-2xl": "32px",
        "md-3xl": "48px",
        "md-full": "9999px",
      },
      transitionTimingFunction: {
        "md-emphasized": "cubic-bezier(0.2, 0, 0, 1)",
      },
      boxShadow: {
        "md-elevation-1": "0px 1px 3px 1px rgba(0, 0, 0, 0.08), 0px 1px 2px 0px rgba(0, 0, 0, 0.06)",
        "md-elevation-2": "0px 2px 6px 2px rgba(0, 0, 0, 0.08), 0px 1px 2px 0px rgba(0, 0, 0, 0.06)",
        "md-elevation-3": "0px 4px 12px 3px rgba(0, 0, 0, 0.08), 0px 1px 3px 0px rgba(0, 0, 0, 0.06)",
        "md-elevation-4": "0px 6px 16px 4px rgba(0, 0, 0, 0.10), 0px 2px 4px 0px rgba(0, 0, 0, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
