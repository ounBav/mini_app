import type { Platform, PlatformInfo } from '@/types/api'

// Same pattern as dlbot apps/bot/app/url_utils.py so "link detected" matches what the server accepts.
const URL_RE = /https?:\/\/[^\s<>"']+/i
const TRAILING = /[.,;:!?)]+$/

/**
 * Fallback copy of url_utils.PLATFORM_HOSTS, used until GET /api/me returns the live allow-list.
 * The server re-validates every URL; this only drives the "TikTok link detected" hint.
 */
export const DEFAULT_PLATFORMS: PlatformInfo[] = [
  {
    key: 'youtube',
    label: 'YouTube',
    hosts: ['m.youtube.com', 'www.youtube.com', 'youtu.be', 'youtube.com'],
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    hosts: ['m.tiktok.com', 'tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com', 'www.tiktok.com'],
  },
  {
    key: 'facebook',
    label: 'Facebook',
    hosts: ['facebook.com', 'fb.watch', 'm.facebook.com', 'web.facebook.com', 'www.facebook.com'],
  },
]

/** First http(s) URL in free text (share sheets often add a title before the link). */
export function extractUrl(text: string): string | null {
  const match = URL_RE.exec(text || '')
  return match ? match[0].replace(TRAILING, '') : null
}

export function detectPlatform(url: string | null, platforms: PlatformInfo[]): Platform | null {
  if (!url) return null
  let host: string
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
  return platforms.find((p) => p.hosts.includes(host))?.key ?? null
}

export type LinkCheck =
  | { state: 'empty' }
  | { state: 'invalid' }
  | { state: 'unsupported'; url: string }
  | { state: 'ok'; url: string; platform: Platform }

export function checkLink(text: string, platforms: PlatformInfo[]): LinkCheck {
  if (!text.trim()) return { state: 'empty' }
  const url = extractUrl(text)
  if (!url) return { state: 'invalid' }
  const platform = detectPlatform(url, platforms)
  return platform ? { state: 'ok', url, platform } : { state: 'unsupported', url }
}
