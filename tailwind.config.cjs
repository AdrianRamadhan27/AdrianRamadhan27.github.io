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
      // Entrance animation for the avatar hero and the floating docked
      // chat widget (both hero variants) -- a quick scale/opacity "pop"
      // with a slight overshoot, replacing what used to look like the
      // element dropping in from above. cubic-bezier here (not a plain
      // ease) is what gives the overshoot on the way in.
      keyframes: {
        pop: {
          "0%": { opacity: "0", transform: "scale(0.85)" },
          "60%": { opacity: "1", transform: "scale(1.04)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        pop: "pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both",
      },
    },
  },
  plugins: [],
};
