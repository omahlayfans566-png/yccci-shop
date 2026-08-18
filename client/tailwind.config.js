/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // SHOP brand — clean navy + gold. Tweak here to match YCCCI branding.
        brand: {
          50: '#eef4fb',
          100: '#d6e4f4',
          200: '#adc9e8',
          300: '#7ba7d6',
          400: '#4a84bf',
          500: '#25619c',
          600: '#1c4d7e',
          700: '#163b62',
          800: '#102b48',
          900: '#0b1f35',
        },
        accent: {
          300: '#ecd9a0',
          400: '#ddc06b',
          500: '#c9a227',
          600: '#a88721',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      keyframes: {
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'slide-in-right': 'slide-in-right 0.25s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
};