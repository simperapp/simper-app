/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        simper: {
          navy: {
            deep: '#060B18',
            dark: '#0A1128',
            card: '#0C1427',
            elevated: '#101B37',
            border: '#1E2C4A',
            hover: '#162444'
          },
          gold: {
            subtle: 'rgba(212, 175, 55, 0.12)',
            light: '#F7E7A9',
            DEFAULT: '#D4AF37',
            hover: '#C59B27',
            dark: '#9A7B1C',
            border: 'rgba(212, 175, 55, 0.3)'
          }
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif'
        ]
      },
      boxShadow: {
        'card-light': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'card-dark': '0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 2px 6px -1px rgba(0, 0, 0, 0.3)',
        'gold-glow': '0 0 20px rgba(212, 175, 55, 0.25)'
      }
    },
  },
  plugins: [],
}
