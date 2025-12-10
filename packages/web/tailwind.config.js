/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: '#fefdfb',
        bookBrown: '#8B7355',
      },
    },
  },
  plugins: [],
}
