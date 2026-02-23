import plugin from 'tailwindcss/plugin';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"DM Sans"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        data: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Warm cream palette
        cream: {
          50: '#FBF8F3',
          100: '#F5F0E8',
        },
        // Flight category colors (unchanged)
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
      borderRadius: {
        card: '12px',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(120, 113, 108, 0.1), 0 1px 2px -1px rgba(120, 113, 108, 0.1)',
        'card-hover': '0 10px 15px -3px rgba(120, 113, 108, 0.1), 0 4px 6px -4px rgba(120, 113, 108, 0.1)',
        'card-lg': '0 20px 25px -5px rgba(120, 113, 108, 0.1), 0 8px 10px -6px rgba(120, 113, 108, 0.1)',
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-down': 'slide-down 0.25s ease-out',
        'fade-in': 'fade-in 0.3s ease-out forwards',
      },
    },
  },
  plugins: [
    plugin(function ({ addBase, addComponents, theme }) {
      addBase({
        body: {
          backgroundColor: theme('colors.cream.50'),
          color: theme('colors.stone.900'),
          fontFamily: theme('fontFamily.body'),
        },
        '.dark body': {
          backgroundColor: theme('colors.stone.900'),
          color: theme('colors.stone.100'),
        },
      });
      addComponents({
        '.card': {
          backgroundColor: theme('colors.white'),
          borderWidth: '1px',
          borderColor: theme('colors.stone.200'),
          borderRadius: theme('borderRadius.card'),
          boxShadow: theme('boxShadow.card'),
        },
        '.dark .card': {
          backgroundColor: theme('colors.stone.800'),
          borderColor: theme('colors.stone.700'),
        },
        '.card-hover': {
          backgroundColor: theme('colors.white'),
          borderWidth: '1px',
          borderColor: theme('colors.stone.200'),
          borderRadius: theme('borderRadius.card'),
          boxShadow: theme('boxShadow.card'),
          transitionProperty: 'all',
          transitionDuration: '200ms',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: theme('boxShadow.card-hover'),
          },
        },
        '.dark .card-hover': {
          backgroundColor: theme('colors.stone.800'),
          borderColor: theme('colors.stone.700'),
        },
      });
    }),
  ],
};
