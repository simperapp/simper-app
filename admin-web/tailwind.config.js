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
            card: '#101B37',
            cardLight: '#18274C',
            border: '#233866',
          },
          gold: {
            light: '#F7E7A9',
            DEFAULT: '#D4AF37',
            hover: '#BF9B27',
            muted: '#8C7423',
          }
        }
      }
    },
  },
  plugins: [],
}
