/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  mode: "jit",
  theme: {
    extend: {
      colors: {
        accent: "#00df9a",
        "accent-dim": "#039e6e",
        primary: "#050f0c",
        secondary: "#9fbdb1",
        tertiary: "#0d1f19",
        "black-100": "#0a1712",
        "black-200": "#050d0a",
        "white-100": "#f3f3f3",
      },
      boxShadow: {
        card: "0px 35px 120px -15px #0c2b20",
      },
      screens: {
        xs: "450px",
      },
    },
  },
  plugins: [],
};
