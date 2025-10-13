/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './js/**/*.js'],
  darkMode: 'class',
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1.5rem',
        xl: '2rem'
      },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1440px'
      }
    },
    extend: {
      colors: {
        brand: {
          teal: '#0f7c90',
          indigo: '#2f3a8f',
          sky: '#12b8c7',
          light: '#e6f7f9',
          navy: '#142257',
          midnight: '#071125',
          'teal-dark': '#0b6b7d'
        },
        surface: {
          base: '#060b1b',
          muted: '#0c162d',
          elevated: '#152346'
        },
        accent: {
          cyan: '#0ea5e9',
          'cyan-soft': '#22d3ee'
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        glow: '0 20px 45px rgba(15, 124, 144, 0.25)',
        'glow-dark': '0 35px 65px rgba(14, 165, 233, 0.35)',
        'surface-dark': '0 25px 55px rgba(8, 47, 73, 0.55)'
      },
      backgroundImage: {
        'hero-light':
          'radial-gradient(circle at top right, rgba(18, 184, 199, 0.18), transparent 55%), linear-gradient(120deg, rgba(15, 124, 144, 0.12), rgba(47, 58, 143, 0.18))',
        'hero-dark':
          'radial-gradient(circle at top right, rgba(14, 165, 233, 0.24), transparent 60%), linear-gradient(135deg, rgba(6, 11, 27, 0.95), rgba(10, 37, 64, 0.92))',
        'card-dark':
          'linear-gradient(145deg, rgba(12, 22, 45, 0.96), rgba(21, 35, 70, 0.92))'
      }
    }
  },
  plugins: []
};
