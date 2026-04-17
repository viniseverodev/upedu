/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#004aab',
          600: '#004aab',
          700: '#013772',
          800: '#013772',
          900: '#012d5e',
          950: '#01214a',
        },
        forest: {
          50:  '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          500: '#0d624a',
          600: '#065f46',
          700: '#064e3b',
        },
        crimson: {
          50:  '#fff0f0',
          100: '#fde8e8',
          200: '#fecaca',
          500: '#c52222',
          600: '#941c1a',
          700: '#7f1d1d',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)',
        'card-md': '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07)',
      },
      borderRadius: {
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
};
