/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        night: {
          50: '#EEF0FF',
          100: '#E0E3FF',
          200: '#C4CBFF',
          300: '#A0A9FF',
          400: '#7A82F5',
          500: '#5B5FE0',
          600: '#4744B8',
          700: '#373591',
          800: '#282661',
          900: '#1E1B4B',
          950: '#12102E',
        },
        moon: '#FDE68A',
        star: '#FCD34D',
        good: '#34D399',
        bad: '#FB7185',
        treat: '#F472B6',
      },
      fontFamily: {
        rounded: ['System'],
      },
    },
  },
  plugins: [],
};
