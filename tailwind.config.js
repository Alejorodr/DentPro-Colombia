/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          teal: "#0d9488",
          indigo: "#4338ca",
          sky: "#0ea5e9",
          light: "#e0f2fe",
          midnight: "#0b1120",
        },
        accent: {
          cyan: "#22d3ee",
        },
        surface: {
          base: "#0f172a",
          muted: "#1e293b",
          elevated: "#111b2d",
        },
        card: {
          dark: "#10243d",
        },
      },
      boxShadow: {
        glow: "0 28px 70px -25px rgba(13, 148, 136, 0.45)",
        "glow-dark": "0 30px 80px -30px rgba(34, 211, 238, 0.38)",
        "surface-dark": "0 36px 90px -35px rgba(15, 23, 42, 0.65)",
      },
      backgroundImage: {
        "hero-light":
          "radial-gradient(circle at top left, rgba(13,148,136,0.12), transparent 45%), radial-gradient(circle at top right, rgba(14,165,233,0.15), transparent 55%), linear-gradient(180deg, #f8fafc 0%, #eff6ff 100%)",
        "hero-dark":
          "radial-gradient(circle at top left, rgba(34,211,238,0.18), transparent 45%), radial-gradient(circle at bottom right, rgba(79,70,229,0.24), transparent 55%), linear-gradient(180deg, #0b1120 0%, #111827 100%)",
        gradient:
          "linear-gradient(135deg, rgba(13,148,136,1) 0%, rgba(34,211,238,1) 32%, rgba(67,56,202,1) 100%)",
      },
    },
  },
  plugins: [],
};
