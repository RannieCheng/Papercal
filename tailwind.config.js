/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        'bg-default': 'var(--bg-default)',
        'text-main': 'var(--text-main)',
        'text-sub': 'var(--text-sub)',
        'text-disabled': 'var(--text-disabled)',
        highlight: 'var(--highlight)',
        'border-line': 'var(--border-line)',
        'morandi-main': 'var(--color-morandi-main)',
        'morandi-sub1': 'var(--color-morandi-sub1)',
        'morandi-sub2': 'var(--color-morandi-sub2)',
      },
    },
  },
  plugins: [],
}