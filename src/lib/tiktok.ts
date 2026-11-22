// Mirrors dlbot apps/bot/app/profiles.py normalize_username. The server re-checks every name.

const USERNAME = /^[A-Za-z0-9_.]{1,32}$/
const TIKTOK_HOSTS = new Set(['tiktok.com', 'www.tiktok.com', 'm.tiktok.com'])

export type UsernameCheck =
  { state: 'empty' } | { state: 'invalid' } | { state: 'ok'; username: string }

/** '@abc', 'abc' or a profile link such as https://www.tiktok.com/@abc → 'abc'. */
export function parseUsername(raw: string): UsernameCheck {
  let text = raw.trim()
  if (!text || text === '@') return { state: 'empty' }
  if (text.includes('/')) {
    let url: URL
    try {
      url = new URL(text.includes('://') ? text : `https://${text}`)
    } catch {
      return { state: 'invalid' }
    }
    const segment = url.pathname.replace(/^\/+/, '').split('/')[0] ?? ''
    if (!TIKTOK_HOSTS.has(url.hostname.toLowerCase()) || !segment.startsWith('@')) {
      return { state: 'invalid' }
    }
    text = segment
  }
  text = text.replace(/^@+/, '')
  return USERNAME.test(text) ? { state: 'ok', username: text } : { state: 'invalid' }
}

/** 1234 → "1.2K", 3400000 → "3.4M". */
export function formatCount(n: number | null | undefined): string {
  const v = Number(n) || 0
  if (v < 1_000) return String(v)
  if (v < 1_000_000) return `${(v / 1_000).toFixed(v < 10_000 ? 1 : 0).replace(/\.0$/, '')}K`
  return `${(v / 1_000_000).toFixed(v < 10_000_000 ? 1 : 0).replace(/\.0$/, '')}M`
}
