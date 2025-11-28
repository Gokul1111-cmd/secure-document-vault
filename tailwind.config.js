/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        space: {
            900: '#050a14', // Deepest void
            800: '#0B1120', // Navy background
            700: '#151e32',
        },
        cyber: {
          DEFAULT: '#1D4DF0', // Cyber Blue
          glow: '#4f7aff',
        },
        neon: {
          cyan: '#00E5FF',
          purple: '#b026ff',
          red: '#ff2a6d'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'star-pattern': "url('https://grainy-gradients.vercel.app/noise.svg')",
      }
    },
  },
  plugins: [],
};