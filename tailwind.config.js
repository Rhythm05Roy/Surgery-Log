/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#badbff',
          300: '#90c2fd',
          400: '#619cfb',
          500: '#3b7ef6',
          600: '#1f5fe8',
          700: '#174ac6',
          800: '#0f3c9c',
          900: '#0d3279',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
