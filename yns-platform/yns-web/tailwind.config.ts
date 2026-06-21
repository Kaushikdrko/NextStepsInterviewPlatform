import type { Config } from "tailwindcss";

/**
 * Your Next Steps-US brand theme.
 * Primary = maroon/burgundy, accent = dark golden yellow.
 * Status colors map to student readiness: great / amazing / needs help.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          // Maroon / burgundy primary
          50: "#fbeef0",
          100: "#f5d3d8",
          200: "#e7a3ac",
          300: "#d67380",
          400: "#bf4554",
          500: "#9c2738",
          600: "#7a1e2e",
          700: "#651825",
          800: "#50131d",
          900: "#3c0e16",
          DEFAULT: "#7a1e2e",
        },
        gold: {
          // Dark golden yellow accent
          50: "#fdf6e7",
          100: "#f9e7bd",
          200: "#f1cf7e",
          300: "#e8b748",
          400: "#d99a1c",
          500: "#c0860f",
          600: "#9c6b0c",
          DEFAULT: "#d99a1c",
        },
        status: {
          great: "#16a34a",
          amazing: "#d99a1c",
          help: "#dc2626",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)",
        "card-hover":
          "0 4px 12px rgba(16, 24, 40, 0.08), 0 2px 4px rgba(16, 24, 40, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
