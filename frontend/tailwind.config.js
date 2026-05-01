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
          300: '#6ee7b7',
          500: '#0d624a',
          600: '#065f46',
          700: '#064e3b',
        },
        crimson: {
          50:  '#fff0f0',
          100: '#fde8e8',
          200: '#fecaca',
          300: '#fca5a5',
          500: '#c52222',
          600: '#941c1a',
          700: '#7f1d1d',
        },
        amber: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
      },
      fontFamily: {
        sans: ['var(--font-onest)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card:      '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 4px 16px -4px rgb(0 0 0 / 0.08)',
        'card-md': '0 4px 12px -2px rgb(0 0 0 / 0.10), 0 8px 32px -8px rgb(0 0 0 / 0.12)',
        'card-lg': '0 20px 40px -8px rgb(0 0 0 / 0.18), 0 8px 16px -4px rgb(0 0 0 / 0.08)',
        glow:      '0 0 0 3px rgb(0 74 171 / 0.20)',
        'brand-glow': '0 4px 24px -4px rgb(0 74 171 / 0.35)',
      },
      borderRadius: {
        xl:    '0.75rem',
        '2xl': '1rem',
      },
      animation: {
        shimmer:    'shimmer 1.8s infinite linear',
        'fade-in':  'fade-in 0.25s ease-out',
        'slide-up': 'slide-up 0.25s ease-out',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
