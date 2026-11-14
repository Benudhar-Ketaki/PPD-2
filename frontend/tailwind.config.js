/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          main: '#08111f',
          surface: '#0c192b',
          panel: '#111f33',
          panel2: '#172941',
          hover: '#1a2c47',
        },
        brand: {
          cyan: '#45d7e2',
          blue: '#718cff',
          green: '#5cdbad',
          amber: '#f0bd6b',
          red: '#f37c89',
        },
        borderLine: '#293d58',
        muted: '#9aabc2',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
