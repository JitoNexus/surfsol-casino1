/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surfsol: {
          primary: '#0077be',
          secondary: '#00a8e8',
          dark: '#0a192f',
          darker: '#020c1b',
          accent: '#64ffda',
        },
      },
      backgroundImage: {
        'wave-pattern': "url('https://www.transparenttextures.com/patterns/cubes.png')",
      },
    },
  },
  plugins: [],
}
