import type { Config } from 'tailwindcss';

const ynsRed = {
  50: '#fff4ef',
  100: '#ffe1d6',
  200: '#f8bfa9',
  300: '#ea8f6d',
  400: '#d45731',
  500: '#b33117',
  600: '#a92712',
  700: '#8f200f',
  800: '#72190c',
  900: '#4d1007',
  950: '#2b0803',
};

const ynsGold = {
  50: '#fff9e6',
  100: '#ffefb8',
  200: '#ffe37c',
  300: '#ffcc3d',
  400: '#f7b820',
  500: '#d99a09',
  600: '#b87506',
  700: '#935407',
  800: '#773f0b',
  900: '#63340f',
  950: '#391a04',
};

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: ynsRed,
        gold: ynsGold,
        indigo: ynsRed,
        violet: ynsRed,
        blue: ynsRed,
        sky: ynsGold,
        purple: ynsGold,
      },
    },
  },
  plugins: [],
} satisfies Config;
