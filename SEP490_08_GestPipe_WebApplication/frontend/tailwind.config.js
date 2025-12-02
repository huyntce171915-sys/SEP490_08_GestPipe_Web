/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cyan-primary': '#5CF4F0',
        'cyan-secondary': '#00B8D4',
        'dark-bg': '#0A0A0A',
        'header-start-gray': '#999999', 
        'header-end-gray': '#333333',
        'table-border-dark': 'rgba(255, 255, 255, 0.08)', // Border của các hàng
        'table-row-hover': 'rgba(255, 255, 255, 0.03)', // Hover của hàng
      },
      fontFamily: {
        'sans': ['Montserrat', 'system-ui', 'sans-serif'],
        'montserrat': ['Montserrat', 'sans-serif'],
      },
      width: {
        '75': '18.75rem', // 300px (nếu 1rem = 16px)
      },
      backgroundImage: {
        // Thêm gradient cho header bảng
        'gradient-table-header': 'linear-gradient(90deg, var(--tw-gradient-stops))',
      }
    },
  },
  plugins: [
    require('tailwind-scrollbar'),
  ],
}

