/** Build-time configuration (Vite env). See .env.example. */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '')
export const BOT_USERNAME = (import.meta.env.VITE_BOT_USERNAME ?? '').trim().replace(/^@/, '')
/** Dev-only signed initData for testing in a normal browser. Always empty in production builds. */
export const DEV_INIT_DATA = import.meta.env.DEV ? (import.meta.env.VITE_DEV_INIT_DATA ?? '') : ''

/** Show the wake-up screen when the first request is slower than this (Render cold start). */
export const WAKE_UP_AFTER_MS = 3_000
/** Keep probing /health this long before giving up on a sleeping server. */
export const WAKE_UP_DEADLINE_MS = 60_000
