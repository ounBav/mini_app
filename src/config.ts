/** Build-time configuration (Vite env). See .env.example. */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '')
export const BOT_USERNAME = (import.meta.env.VITE_BOT_USERNAME ?? '').trim().replace(/^@/, '')
/** Dev-only signed initData for testing in a normal browser. Always empty in production builds. */
export const DEV_INIT_DATA = import.meta.env.DEV ? (import.meta.env.VITE_DEV_INIT_DATA ?? '') : ''

export type ConfigProblem = 'missing' | 'invalid' | 'insecure'

/**
 * A build without a usable API URL cannot work: requests would hit the static host itself
 * (which answers index.html), or be blocked as mixed content. Detected up front so the user sees
 * a clear message instead of a broken app.
 */
function detectConfigProblem(): ConfigProblem | null {
  if (!API_BASE_URL) return 'missing'
  let url: URL
  try {
    url = new URL(API_BASE_URL)
  } catch {
    return 'invalid'
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return 'invalid'
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  const pageIsHttps = typeof location !== 'undefined' && location.protocol === 'https:'
  if (pageIsHttps && url.protocol === 'http:' && !local) return 'insecure'
  return null
}

export const CONFIG_PROBLEM = detectConfigProblem()

/** Show the wake-up screen when the first request is slower than this (Render cold start). */
export const WAKE_UP_AFTER_MS = 3_000
/** Keep probing /health this long before giving up on a sleeping server. */
export const WAKE_UP_DEADLINE_MS = 60_000
