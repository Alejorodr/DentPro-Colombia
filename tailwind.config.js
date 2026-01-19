/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "brand-teal": "var(--color-brand-teal)",
        "brand-indigo": "var(--color-brand-indigo)",
        "brand-sky": "var(--color-brand-sky)",
        "brand-light": "var(--color-brand-light)",
        "brand-midnight": "var(--color-brand-midnight)",
        "accent-cyan": "var(--color-accent-cyan)",
        "surface-base": "var(--color-surface-base)",
        "surface-muted": "var(--color-surface-muted)",
        "surface-elevated": "var(--color-surface-elevated)",
        "card-dark": "var(--color-card-dark)",
      },
    },
  },
};
