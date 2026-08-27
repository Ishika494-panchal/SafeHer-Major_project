/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        guardian: {
          dark: '#5B21B6',
          primary: '#7C3AED',
          light: '#F5F3FF',
          sos: '#E11D48',
          safe: '#10B981',
          hover: '#6D28D9',
          softBg: '#FAF5FF',
        },
        brand: {
          violet: '#7C3AED',
          pink: '#E11D48',
          mint: '#10B981',
          darkViolet: '#5B21B6',
        }
      },
      fontFamily: {
        sora: ['Sora', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow-purple': '0 0 25px -5px rgba(124, 58, 237, 0.4)',
        'glow-sos': '0 0 30px -5px rgba(225, 29, 72, 0.5)',
      }
    },
  },
  plugins: [],
}
