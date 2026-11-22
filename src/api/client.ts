import { API_BASE_URL } from '@/config'
import type { ApiErrorDetail, ErrorCode } from '@/types/api'

const DEFAULT_TIMEOUT_MS = 15_000

type DetailExtras = Partial<Pick<ApiErrorDetail, 'retry_after' | 'id' | 'max_duration'>>

/** Every failure from the API layer. `code` is a server E-* code or a client transport code. */
export class ApiError extends Error {
  readonly code: ErrorCode
  readonly status: number
  readonly retryAfter: number
  readonly jobId: string | null
  readonly maxDuration: number | null

  constructor(code: ErrorCode, status = 0, detail: DetailExtras = {}) {
    super(code)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.retryAfter = Number(detail.retry_after) || 0
    this.jobId = typeof detail.id === 'string' ? detail.id : null
    this.maxDuration = typeof detail.max_duration === 'number' ? detail.max_duration : null
  }

  /** Transport-level problems where the server may simply be asleep or unreachable. */
  get isUnreachable(): boolean {
    return (
      this.code === 'E-NETWORK' ||
      this.code === 'E-TIMEOUT' ||
      this.code === 'E-SERVER' ||
      this.status === 502 ||
      this.status === 503 ||
      this.status === 504
    )
  }
}

export function toApiError(err: unknown): ApiError {
  return err instanceof ApiError ? err : new ApiError('E-NETWORK')
}

export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}

let initData = ''

/** Set once at startup from Telegram.WebApp.initData (or the dev mock). */
export function setInitData(value: string): void {
  initData = value
}

export interface RequestOptions {
  body?: unknown
  timeoutMs?: number
  signal?: AbortSignal
  /** /health is public and must not carry initData. */
  auth?: boolean
}

/** Absolute URL for a server path such as `/api/files/<token>`. */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`
}

/**
 * True when the server answers at all, even if CORS hides the response from this page.
 * A `no-cors` request resolves with an opaque response whenever any HTTP reply arrives, so
 * "CORS request failed + no-cors request succeeded" means the API does not allow this origin.
 */
export async function isServerReachable(timeoutMs = 8_000): Promise<boolean> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    await fetch(apiUrl('/health'), { mode: 'no-cors', cache: 'no-store', signal: ctrl.signal })
    return true
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

function detailOf(data: unknown): ApiErrorDetail | null {
  const detail = (data as { detail?: unknown } | null)?.detail
  return detail && typeof detail === 'object' && !Array.isArray(detail)
    ? (detail as ApiErrorDetail)
    : null
}

export function codeFromResponse(status: number, data: unknown): ErrorCode {
  const code = detailOf(data)?.code
  if (typeof code === 'string' && code.startsWith('E-')) return code as ErrorCode
  // FastAPI request validation (detail is a list): the link or option was not accepted.
  if (status === 422) return 'E-UNSUPPORTED'
  if (status === 401) return 'E-AUTH'
  if (status >= 500) return 'E-SERVER'
  return 'E-FAILED'
}

export async function request<T>(
  method: 'GET' | 'POST',
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const ctrl = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    ctrl.abort()
  }, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  const onOuterAbort = () => ctrl.abort()
  opts.signal?.addEventListener('abort', onOuterAbort, { once: true })

  const headers: Record<string, string> = {}
  if (opts.auth !== false) headers.Authorization = `tma ${initData}`
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'

  let resp: Response
  try {
    resp = await fetch(apiUrl(path), {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      cache: 'no-store',
      signal: ctrl.signal,
    })
  } catch (err) {
    if (opts.signal?.aborted) throw err // the caller cancelled: let it see the AbortError
    throw new ApiError(timedOut ? 'E-TIMEOUT' : 'E-NETWORK')
  } finally {
    clearTimeout(timer)
    opts.signal?.removeEventListener('abort', onOuterAbort)
  }

  let data: unknown = null
  try {
    data = await resp.json()
  } catch {
    // Empty or non-JSON body (e.g. a proxy error page while Render wakes the service).
  }
  if (resp.ok) {
    // Every dlbot endpoint answers JSON. A 2xx without it means the base URL points at the wrong
    // server (typically the static site itself, which rewrites /api/* to index.html).
    if (data === null || typeof data !== 'object') throw new ApiError('E-CONFIG', resp.status)
    return data as T
  }
  throw new ApiError(codeFromResponse(resp.status, data), resp.status, detailOf(data) ?? {})
}
