/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-down': 'slide-down 0.25s ease-out',
      },
      colors: {
        // Flight category colors
        vfr: {
          light: '#dcfce7',
          DEFAULT: '#22c55e',
          dark: '#166534',
        },
        mvfr: {
          light: '#dbeafe',
          DEFAULT: '#3b82f6',
          dark: '#1e40af',
        },
        ifr: {
          light: '#fee2e2',
          DEFAULT: '#ef4444',
          dark: '#991b1b',
        },
        lifr: {
          light: '#f3e8ff',
          DEFAULT: '#a855f7',
          dark: '#6b21a8',
        },
      },
    },
  },
  plugins: [],
};
