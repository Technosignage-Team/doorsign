/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
    './constants.tsx',
  ],
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
      portrait: { raw: '(orientation: portrait)' },
      landscape: { raw: '(orientation: landscape)' },
    },
    extend: {
      keyframes: {
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.25s ease-out both',
      },
      colors: {
        primary: '#137fec',
        'background-light': '#f6f7f8',
        'background-dark': '#101922',
        'status-busy': '#ef4444',
        'status-available': '#10b981',
        'card-dark': '#1c2127',
        'card-darker': '#111418',
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
};
