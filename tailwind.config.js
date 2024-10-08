/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        grotesk: ['Space Grotesk', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#00df9a',
          hover: '#039e6e'
        }
      },
      animation: {
        'fade-in-out': 'fade-in-out 5s ease-in-out',
      },
    },
  },
  plugins: [],
}

