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
    extend: {
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
      fontSize: {
        // Viewport-fluid sizes for tablet doorsign displays (1024–1400px CSS width)
        'vp-2xs': ['clamp(0.625rem, 0.9vw, 0.75rem)',  { lineHeight: '1.3' }],
        'vp-xs':  ['clamp(0.7rem,   1vw,   0.875rem)', { lineHeight: '1.3' }],
        'vp-sm':  ['clamp(0.8rem,   1.1vw, 1rem)',     { lineHeight: '1.4' }],
        'vp-base':['clamp(0.9rem,   1.3vw, 1.125rem)', { lineHeight: '1.5' }],
        'vp-lg':  ['clamp(1rem,     1.6vw, 1.5rem)',   { lineHeight: '1.4' }],
        'vp-xl':  ['clamp(1.25rem,  2vw,   2rem)',     { lineHeight: '1.3' }],
        'vp-2xl': ['clamp(1.5rem,   2.5vw, 2.75rem)', { lineHeight: '1.2' }],
        'vp-3xl': ['clamp(1.75rem,  3vw,   3.5rem)',  { lineHeight: '1.1' }],
        'vp-4xl': ['clamp(2rem,     4vw,   4.5rem)',  { lineHeight: '1.05' }],
        'vp-5xl': ['clamp(2.5rem,   5vw,   5.5rem)',  { lineHeight: '1' }],
        'vp-6xl': ['clamp(3rem,     6.5vw, 7rem)',    { lineHeight: '1' }],
        'vp-7xl': ['clamp(3.5rem,   8vw,   9rem)',    { lineHeight: '1' }],
      },
      screens: {
        'xs': '480px',
        'tablet': '900px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
};
