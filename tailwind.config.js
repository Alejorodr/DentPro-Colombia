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
          teal: "#0a3d91",
          indigo: "#1f6cd3",
          sky: "#4cc3f1",
          light: "#e6f4ff",
          midnight: "#031536",
        },
        accent: {
          cyan: "#5bd0ff",
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
        glow: "0 28px 70px -25px rgba(10, 61, 145, 0.45)",
        "glow-dark": "0 30px 80px -30px rgba(91, 208, 255, 0.38)",
        "surface-dark": "0 36px 90px -35px rgba(3, 21, 54, 0.65)",
      },
      backgroundImage: {
        "hero-light":
          "radial-gradient(circle at top left, rgba(10,61,145,0.14), transparent 45%), radial-gradient(circle at top right, rgba(76,195,241,0.18), transparent 55%), linear-gradient(180deg, #f8fbff 0%, #e6f2ff 100%)",
        "hero-dark":
          "radial-gradient(circle at top left, rgba(91,208,255,0.22), transparent 45%), radial-gradient(circle at bottom right, rgba(31,108,211,0.25), transparent 55%), linear-gradient(180deg, #031536 0%, #0b1f46 100%)",
        gradient:
          "linear-gradient(135deg, rgba(10,61,145,1) 0%, rgba(31,108,211,1) 32%, rgba(76,195,241,1) 100%)",
      },
    },
  },
  plugins: [],
};
