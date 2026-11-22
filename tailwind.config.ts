import type { Config } from 'tailwindcss'

// Pink brand theme. Every color is a CSS variable from src/style.css with a light and a dark value;
// the dark set is used when Telegram reports colorScheme "dark" (html[data-theme="dark"]), so the
// app still follows the user's Telegram theme and updates live on themeChanged.
export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--c-canvas)',
        surface: 'var(--c-surface)',
        'surface-solid': 'var(--c-surface-solid)',
        muted: 'var(--c-muted)',
        ink: 'var(--c-ink)',
        hint: 'var(--c-hint)',
        line: 'var(--c-line)',
        accent: 'var(--c-accent)',
        primary: 'var(--c-primary)',
        'primary-2': 'var(--c-primary-2)',
        'primary-fg': 'var(--c-primary-fg)',
        'primary-soft': 'var(--c-primary-soft)',
        danger: 'var(--c-danger)',
        'danger-soft': 'var(--c-danger-soft)',
        success: 'var(--c-success)',
        brand: {
          youtube: '#FF0033',
          tiktok: '#000000',
          'tiktok-cyan': '#25F4EE',
          facebook: '#0866FF',
        },
      },
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      backgroundImage: {
        brand: 'var(--g-brand)',
        'brand-soft': 'var(--g-brand-soft)',
      },
      boxShadow: {
        glow: '0 10px 28px -10px var(--c-glow)',
        'glow-lg': '0 18px 48px -14px var(--c-glow)',
        card: 'var(--shadow-card)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      minHeight: { tap: '44px' },
      minWidth: { tap: '44px' },
      keyframes: {
        'pop-in': {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '60%': { transform: 'scale(1.08)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        },
        ripple: {
          '0%': { transform: 'scale(0.8)', opacity: '0.55' },
          '100%': { transform: 'scale(2.1)', opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'pop-in': 'pop-in 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.2) both',
        ripple: 'ripple 2.4s ease-out infinite',
        float: 'float 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
