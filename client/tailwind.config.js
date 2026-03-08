/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        // Custom palette - 60% Background, 30% Secondary, 10% Accent
        "bg-primary": "#FAF3E1",      // 60% - Page background (Cream/White)
        "bg-secondary": "#F5E7C6",    // 30% - Section highlights (Beige)
        "accent": "#FA8112",           // 10% - Buttons/highlights (Orange)
        "dark-text": "#222222",        // Text color
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