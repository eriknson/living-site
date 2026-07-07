/** @type {import('tailwindcss').Config} */
module.exports = {
  // Use system preference for dark mode
  darkMode: "media",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./data/**/*.json",
  ],
  theme: {
    extend: {
      // Two-step type scale: base (body) and sm (meta/labels).
      // Hierarchy comes from color/weight, not size variety.
      fontSize: {
        sm: ["13px", { lineHeight: "1.4" }],
        base: ["15px", { lineHeight: "1.5" }],
      },
      colors: {
        // Anysphere color palette - light mode values
        // Dark mode handled via CSS variables in globals.css
        anysphere: {
          bg: 'var(--color-bg)',
          text: 'var(--color-text)',
          muted: 'var(--color-muted)',
        },
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
  ],
};

