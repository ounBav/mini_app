import type { Quality } from '@/types/api'

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(Number(seconds) || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

export function formatBytes(bytes: number): string {
  const n = Number(bytes) || 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  const mb = n / (1024 * 1024)
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`
}

/** Seconds → "45s" or "2:05". */
export function formatWait(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

/** 0-1 fraction (or null) → whole percent 0-100 (or null). */
export function percent(fraction: number | null | undefined): number | null {
  if (fraction == null || Number.isNaN(Number(fraction))) return null
  return Math.max(0, Math.min(100, Math.floor(Number(fraction) * 100)))
}

/** Default quality chip: the highest at or below 720p, else the lowest offered. */
export function defaultQuality(qualities: readonly Quality[]): Quality | null {
  const list = [...qualities].sort((a, b) => a - b)
  if (!list.length) return null
  const upTo720 = list.filter((q) => q <= 720)
  return upTo720.length ? (upTo720[upTo720.length - 1] ?? null) : (list[0] ?? null)
}

/** Next quality below `current`, or null. Used by "Try lower quality". */
export function lowerQuality(
  qualities: readonly Quality[],
  current: Quality | null,
): Quality | null {
  if (current == null) return null
  const below = qualities.filter((q) => q < current).sort((a, b) => b - a)
  return below[0] ?? null
}

/** Poll faster while a job is fresh, back off as it ages. */
export function pollDelay(elapsedMs: number): number {
  if (elapsedMs < 20_000) return 1_500
  if (elapsedMs < 120_000) return 3_000
  return 6_000
}

/** Back-off after consecutive network failures: 1.5 s, 3 s, 6 s, 12 s (cap). */
export function retryDelay(failures: number): number {
  return Math.min(1_500 * 2 ** Math.max(0, failures - 1), 12_000)
}
