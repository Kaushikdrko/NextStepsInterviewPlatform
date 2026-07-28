import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Your Next Steps brand palette, sampled from the Champion Dashboard
        // design. Maroon is the primary interaction colour; gold is an accent
        // only. These are additive — existing pages keep their own classes.
        maroon: {
          50: '#FBF1F4',
          100: '#F6DFE5',
          200: '#EDBFCB',
          300: '#DF94A8',
          400: '#C86281',
          500: '#AB3A59',
          600: '#97213F',
          700: '#88122A',
          800: '#6E0F22',
          900: '#4F0B19',
        },
        gold: {
          50: '#FDF8EC',
          100: '#F8ECCB',
          400: '#D9B450',
          500: '#C9A227',
          600: '#A8851C',
        },
      },
      keyframes: {
        'drawer-in': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'overlay-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        'drawer-in': 'drawer-in 220ms cubic-bezier(0.32, 0.72, 0, 1)',
        'overlay-in': 'overlay-in 180ms ease-out',
      },
      fontFamily: {
        // Opt-in via `font-sans`; the global body font stays untouched.
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
