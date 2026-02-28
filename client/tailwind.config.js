/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        primary: "#2563eb",      // Blue
        secondary: "#0f172a",    // Dark background
        accent: "#22c55e",       // Green
        danger: "#ef4444",       // Red
      },

      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },

      borderRadius: {
        xl: "1rem",
      },

      boxShadow: {
        soft: "0 4px 14px 0 rgba(0, 0, 0, 0.1)",
      },
    },
  },

  plugins: [],
};