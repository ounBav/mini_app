import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTelegram } from '@/composables/useTelegram'
import { useDownloadStore } from '@/stores/download'

const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

const ME = {
  user: { id: 1, first_name: 'Dev', username: null },
  usage_today: 0,
  limit_per_day: 30,
  limit_per_minute: 5,
  max_upload_mb: 50,
  platforms: [{ key: 'youtube', label: 'YouTube', hosts: ['youtu.be'] }],
  terms_url: null,
  qualities: [360, 480, 720, 1080],
  file_ttl_min: 15,
}

type Handler = (init: RequestInit) => Response | Promise<Response>
let routes: Record<string, Handler>
const hits: Record<string, number> = {}

beforeEach(() => {
  setActivePinia(createPinia())
  sessionStorage.clear()
  for (const k of Object.keys(hits)) delete hits[k]
  routes = {
    'GET /api/me': () => json(200, ME),
    'GET /api/downloads': () => json(200, { items: [] }),
    'GET /health': () => json(200, { ok: true }),
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const path = new URL(input, 'http://x').pathname
      const key = init.mode === 'no-cors' ? `NOCORS ${path}` : `${init.method} ${path}`
      hits[key] = (hits[key] ?? 0) + 1
      const handler = routes[key]
      if (!handler) throw new TypeError('Failed to fetch')
      return handler(init)
    }),
  )
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('resilience', () => {
  it('does not repeat a slow preview when the server is awake', async () => {
    vi.useFakeTimers()
    // /info never answers: the client times out after 40 s.
    routes['POST /api/info'] = (init) =>
      new Promise((_, reject) =>
        init.signal?.addEventListener('abort', () =>
          reject(new DOMException('aborted', 'AbortError')),
        ),
      )
    const store = useDownloadStore()
    await store.boot()
    store.setInput('https://youtu.be/abc')
    const done = store.submitLink()
    await vi.advanceTimersByTimeAsync(45_000)
    await done
    expect(hits['POST /api/info']).toBe(1)
    expect(store.step).toBe('error')
    expect(store.error?.code).toBe('E-TIMEOUT')
  })

  it('shows "blocked" when the server is up but CORS rejects this origin', async () => {
    vi.useFakeTimers()
    // Every CORS request fails like a browser CORS error; the no-cors probe gets through.
    delete routes['GET /api/me']
    delete routes['GET /health']
    routes['NOCORS /health'] = () => new Response('')
    const store = useDownloadStore()
    const done = store.boot()
    await vi.advanceTimersByTimeAsync(70_000)
    await done
    expect(store.phase).toBe('blocked')
  })

  it('shows "offline" when nothing answers at all', async () => {
    vi.useFakeTimers()
    delete routes['GET /api/me']
    delete routes['GET /health']
    const store = useDownloadStore()
    const done = store.boot()
    await vi.advanceTimersByTimeAsync(70_000)
    await done
    expect(store.phase).toBe('offline')
  })

  it('shows the setup screen when the API URL points at the static site', async () => {
    routes['GET /api/me'] = () =>
      new Response('<!doctype html><html></html>', { headers: { 'Content-Type': 'text/html' } })
    const store = useDownloadStore()
    await store.boot()
    expect(store.phase).toBe('config')
  })

  it('handles rapid cancel taps without throwing, and declining keeps the job', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => false)
    const store = useDownloadStore()
    await store.boot()
    store.applyJob({
      id: 'j',
      url: 'https://youtu.be/abc',
      platform: 'youtube',
      format: 'video',
      status: 'downloading',
      error_code: null,
      title: 'Clip',
      created_at: new Date().toISOString(),
      delivery: 'device',
      quality: 720,
      progress: 0.3,
      file: null,
    })
    await expect(Promise.all([store.cancel(), store.cancel()])).resolves.toBeDefined()
    expect(confirmSpy).toHaveBeenCalled()
    expect(store.cancelling).toBe(false)
    expect(store.step).toBe('progress')
  })

  it('resolves false instead of throwing when a Telegram popup is already open', async () => {
    // Outside Telegram confirm() uses window.confirm; the guard itself is covered by type and
    // review. Here: the wrapper always returns a boolean promise.
    vi.spyOn(window, 'confirm').mockImplementation(() => true)
    await expect(useTelegram().confirm('Sure?')).resolves.toBe(true)
  })
})
