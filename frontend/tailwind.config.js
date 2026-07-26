/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'safe-purple': '#3C3489',
        'safe-purple-tint': '#7F77DD',
        'safe-red': '#DC2626',
        'safe-amber': '#F2A623',
        'safe-green': '#16A34A',
        'safe-bg': '#F8F7F4',
        'safe-ink': '#2C2C2A',
        'safe-muted': '#888780',
      },
    },
  },
  plugins: [],
}
