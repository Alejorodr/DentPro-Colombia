/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './js/**/*.js'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          teal: '#0f7c90',
          indigo: '#2f3a8f',
          sky: '#12b8c7',
          light: '#e6f7f9',
          navy: '#142257'
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        glow: '0 20px 45px rgba(15, 124, 144, 0.25)'
      }
    }
  },
  plugins: []
};
