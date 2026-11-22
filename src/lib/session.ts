import type { InfoResponse, MediaFormat, Quality } from '@/types/api'

/** What survives closing and reopening the Mini App (sessionStorage, same Telegram session). */
export interface SavedSession {
  v: 1
  input: string
  info: InfoResponse | null
  format: MediaFormat
  quality: Quality | null
  jobId: string | null
}

const KEY = 'dlbot:session'

export function loadSession(): SavedSession | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Partial<SavedSession>
    if (data?.v !== 1) return null
    return {
      v: 1,
      input: typeof data.input === 'string' ? data.input : '',
      info: data.info ?? null,
      format: data.format === 'audio' ? 'audio' : 'video',
      quality: typeof data.quality === 'number' ? data.quality : null,
      jobId: typeof data.jobId === 'string' ? data.jobId : null,
    }
  } catch {
    return null
  }
}

export function saveSession(session: SavedSession): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(session))
  } catch {
    // Storage full or blocked (private mode): restoring is a convenience only.
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // Ignore: see saveSession.
  }
}
