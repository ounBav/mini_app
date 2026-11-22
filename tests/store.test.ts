import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDownloadStore } from '@/stores/download'
import type { InfoResponse, Job, MeResponse } from '@/types/api'

// Responses shaped exactly like dlbot apps/bot/app/api.py.
const ME: MeResponse = {
  user: { id: 42, first_name: 'Dev', username: 'dev' },
  usage_today: 0,
  limit_per_day: 30,
  limit_per_minute: 5,
  max_upload_mb: 50,
  platforms: [{ key: 'youtube', label: 'YouTube', hosts: ['youtu.be', 'www.youtube.com'] }],
  terms_url: null,
  qualities: [360, 480, 720, 1080],
  file_ttl_min: 15,
}
const INFO: InfoResponse = {
  url: 'https://youtu.be/abc',
  platform: 'youtube',
  title: 'Clip',
  uploader: 'Someone',
  duration: 61,
  thumbnail: 'https://i.ytimg.com/x.jpg',
  has_video: true,
  qualities: [360, 480, 720],
}
const job = (over: Partial<Job> = {}): Job => ({
  id: '11111111-1111-4111-8111-111111111111',
  url: INFO.url,
  platform: 'youtube',
  format: 'video',
  status: 'queued',
  error_code: null,
  title: 'Clip',
  created_at: new Date().toISOString(),
  delivery: 'device',
  quality: 720,
  progress: null,
  file: null,
  ...over,
})

type Handler = (body: unknown, init: RequestInit) => Response | Promise<Response>
const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

let routes: Record<string, Handler>
const calls: { key: string; body: unknown; auth: string | null }[] = []

beforeEach(() => {
  setActivePinia(createPinia())
  sessionStorage.clear()
  calls.length = 0
  routes = {
    'GET /api/me': () => json(200, ME),
    'GET /api/downloads': () => json(200, { items: [] }),
    'GET /health': () => json(200, { ok: true, status: 'ok' }),
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init: RequestInit) => {
      const path = new URL(input, 'http://x').pathname
      const key = `${init.method} ${path}`
      const body = init.body ? JSON.parse(String(init.body)) : undefined
      const headers = (init.headers ?? {}) as Record<string, string>
      calls.push({ key, body, auth: headers.Authorization ?? null })
      const handler = routes[key]
      if (!handler) throw new TypeError('Failed to fetch')
      return handler(body, init)
    }),
  )
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('download store', () => {
  it('boots, previews, downloads and finishes with a file', async () => {
    routes['POST /api/info'] = () => json(200, INFO)
    routes['POST /api/downloads'] = () =>
      json(200, { id: job().id, status: 'queued', cached: false })
    const store = useDownloadStore()

    await store.boot()
    expect(store.phase).toBe('ready')
    expect(calls[0]?.auth).toMatch(/^tma /)

    store.setInput('look https://youtu.be/abc!')
    expect(store.link.state).toBe('ok')
    await store.submitLink()
    expect(store.step).toBe('preview')
    expect(store.quality).toBe(720)

    await store.startDownload()
    expect(calls.at(-1)).toMatchObject({
      key: 'POST /api/downloads',
      body: { url: INFO.url, format: 'video', quality: 720, delivery: 'device' },
    })
    expect(store.step).toBe('progress')
    expect(store.pollingJobId).toBe(job().id)

    const expires = new Date(Date.now() + 15 * 60_000).toISOString()
    store.applyJob(
      job({
        status: 'done',
        progress: 1,
        file: {
          name: 'Clip.mp4',
          size: 1000,
          download_path: '/api/files/tok',
          expires_at: expires,
        },
      }),
    )
    expect(store.step).toBe('done')
    expect(store.pollingJobId).toBeNull()
  })

  it('shows the wake-up screen on a slow first request', async () => {
    vi.useFakeTimers()
    routes['GET /api/me'] = () =>
      new Promise((resolve) => setTimeout(() => resolve(json(200, ME)), 5_000))
    const store = useDownloadStore()
    const done = store.boot()
    await vi.advanceTimersByTimeAsync(3_100)
    expect(store.phase).toBe('waking')
    await vi.advanceTimersByTimeAsync(2_000)
    await done
    expect(store.phase).toBe('ready')
  })

  it('probes /health while the server is asleep, then retries /api/me', async () => {
    vi.useFakeTimers()
    let meCalls = 0
    let healthCalls = 0
    routes['GET /api/me'] = () => {
      meCalls += 1
      if (meCalls === 1) return json(502, null) // Render proxy while the instance boots
      return json(200, ME)
    }
    routes['GET /health'] = () => {
      healthCalls += 1
      if (healthCalls < 3) throw new TypeError('Failed to fetch')
      return json(200, { ok: true, status: 'ok' })
    }
    const store = useDownloadStore()
    const done = store.boot()
    await vi.advanceTimersByTimeAsync(10_000)
    await done
    expect(healthCalls).toBe(3)
    expect(store.phase).toBe('ready')
  })

  it('offers a lower quality after E-TOOBIG and retries with it', async () => {
    routes['POST /api/info'] = () => json(200, INFO)
    routes['POST /api/downloads'] = () =>
      json(200, { id: job().id, status: 'queued', cached: false })
    const store = useDownloadStore()
    await store.boot()
    store.setInput(INFO.url)
    await store.submitLink()
    await store.startDownload()

    store.applyJob(job({ status: 'failed', error_code: 'E-TOOBIG' }))
    expect(store.step).toBe('error')
    expect(store.errorView?.message).toContain('720p')
    expect(store.nextLowerQuality).toBe(480)

    store.tryLowerQuality()
    await vi.waitFor(() => expect(store.step).toBe('progress'))
    expect(calls.at(-1)?.body).toMatchObject({ quality: 480 })
  })

  it('adopts the running job on E-BUSY', async () => {
    routes['POST /api/info'] = () => json(200, INFO)
    routes['POST /api/downloads'] = () => json(409, { detail: { code: 'E-BUSY', id: job().id } })
    routes[`GET /api/downloads/${job().id}`] = () =>
      json(200, job({ status: 'downloading', progress: 0.4 }))
    const store = useDownloadStore()
    await store.boot()
    store.setInput(INFO.url)
    await store.submitLink()
    await store.startDownload()
    expect(store.step).toBe('progress')
    expect(store.job?.progress).toBe(0.4)
  })

  it('maps preview errors and restores an in-progress job', async () => {
    routes['POST /api/info'] = () => json(422, { detail: { code: 'E-PRIVATE' } })
    const store = useDownloadStore()
    await store.boot()
    store.setInput(INFO.url)
    await store.submitLink()
    expect(store.step).toBe('error')
    expect(store.errorView?.title).toBe('Private video')
    store.back()
    expect(store.step).toBe('input')

    // A job still running on the server is picked up after reopening the app.
    setActivePinia(createPinia())
    routes['GET /api/downloads'] = () => json(200, { items: [job({ status: 'downloading' })] })
    routes[`GET /api/downloads/${job().id}`] = () => json(200, job({ status: 'downloading' }))
    const reopened = useDownloadStore()
    await reopened.boot()
    expect(reopened.step).toBe('progress')
  })

  it('goes to the session-expired screen on E-AUTH', async () => {
    routes['GET /api/me'] = () => json(401, { detail: { code: 'E-AUTH' } })
    const store = useDownloadStore()
    await store.boot()
    expect(store.phase).toBe('auth')
  })
})
