import type { Config } from 'tailwindcss'

// Telegram theme colors. Each token reads a --c-* variable from src/style.css, which in turn reads
// Telegram's --tg-theme-* variable (set and updated by telegram-web-app.js on themeChanged) and
// falls back to Telegram's own light/dark defaults outside Telegram.
export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        tg: {
          bg: 'var(--c-bg)',
          secondary: 'var(--c-secondary)',
          section: 'var(--c-section)',
          text: 'var(--c-text)',
          hint: 'var(--c-hint)',
          subtitle: 'var(--c-subtitle)',
          link: 'var(--c-link)',
          accent: 'var(--c-accent)',
          button: 'var(--c-button)',
          'button-text': 'var(--c-button-text)',
          'button-soft': 'var(--c-button-soft)',
          destructive: 'var(--c-destructive)',
          'destructive-soft': 'var(--c-destructive-soft)',
          separator: 'var(--c-separator)',
        },
        brand: {
          youtube: '#FF0033',
          tiktok: '#000000',
          'tiktok-cyan': '#25F4EE',
          facebook: '#0866FF',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      minHeight: { tap: '44px' },
      minWidth: { tap: '44px' },
    },
  },
  plugins: [],
} satisfies Config
