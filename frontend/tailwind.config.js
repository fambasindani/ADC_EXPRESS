/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          red: '#E51C23',
          redDark: '#B91218',
          cyan: '#33B5E5',
          cyanLight: '#E8F7FD',
          orange: '#F7941D',
          orangeLight: '#FEF4E6',
          dark: '#1A1A1A',
          grayDark: '#2A2A2A',
          grayLight: '#F3F5F8',
          border: '#E2E8F0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-hover': '0 10px 24px -6px rgb(0 0 0 / 0.1)',
      },
    },
  },
  plugins: [],
}
