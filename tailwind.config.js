/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy:  { DEFAULT: '#1A2E55', 50: '#EEF1F8', 100: '#C5CEEA', 600: '#1A2E55', 700: '#142446' },
        brand: { DEFAULT: '#175CAD', 50: '#EFF6FF', 100: '#DBEAFE', 600: '#175CAD' },
        gold:  { DEFAULT: '#CA8A04', 50: '#FFFBEB', 600: '#CA8A04' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
