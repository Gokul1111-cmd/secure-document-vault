/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        space: {
            950: '#02040a', // Abyss
            900: '#0B1120', // Deep Navy
            800: '#151e32', // Lighter Navy
        },
        cyber: {
          DEFAULT: '#1D4DF0', // Cyber Blue
          dim: '#1e3a8a',
          glow: '#60a5fa',
        },
        neon: {
          cyan: '#00E5FF',
          green: '#10b981',
          red: '#ef4444',
          amber: '#f59e0b',
          purple: '#d946ef'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glitch': 'glitch 0.2s linear infinite',
        'scan': 'scan 2s linear infinite',
      },
      keyframes: {
        glitch: {
          '0%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
          '100%': { transform: 'translate(0)' },
        },
        scan: {
          '0%': { top: '0%', opacity: 0 },
          '50%': { opacity: 1 },
          '100%': { top: '100%', opacity: 0 },
        }
      }
    },
  },
  plugins: [],
};