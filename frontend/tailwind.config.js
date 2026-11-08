/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--accent-primary)',
        'primary-hover': 'var(--accent-hover)',
        secondary: 'var(--accent-secondary)',
        background: 'var(--bg-primary)',
        surface: 'var(--bg-secondary)',
        text: 'var(--text-primary)',
        muted: 'var(--text-secondary)',
        border: 'var(--border-light)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
