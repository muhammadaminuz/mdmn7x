/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: { 50: "#f0fdf4", 100: "#dcfce7", 400: "#4ade80", 500: "#22c55e", 600: "#16a34a", 700: "#15803d" },
      },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
      screens: { xs: "375px" },
    },
  },
  plugins: [],
};
