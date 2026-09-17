/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],

  presets: [require("nativewind/preset")],

  theme: {
    extend: {
      colors: {
        primary: "#E11D48",
        secondary: "#F1F5F9",
        card: "#FFFFFF",
        muted: "#64748B",
      },
    },
  },

  plugins: [],
};