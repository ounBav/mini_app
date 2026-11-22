import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, nextTick } from 'vue'
import App from '@/App.vue'
import { describeError } from '@/lib/errors'
import { formatCount, parseUsername } from '@/lib/tiktok'
import { useDownloadStore } from '@/stores/download'
import { useProfileStore } from '@/stores/profile'
import type { Job, MeResponse, ScanResponse } from '@/types/api'

// Responses shaped exactly like dlbot apps/bot/app/api.py.
const ME: MeResponse = {
  user: { id: 42, first_name: 'Dev', username: 'dev' },
  usage_today: 0,
  limit_per_day: 30,
  limit_per_minute: 5,
  max_upload_mb: 50,
  platforms: [{ key: 'tiktok', label: 'TikTok', hosts: ['www.tiktok.com'] }],
  terms_url: null,
  qualities: [360, 480, 720, 1080],
  file_ttl_min: 15,
  profile_max_videos: 200,
  profile_max_send: 3,
}

const video = (i: number) => ({
  id: `7${String(i).padStart(18, '0')}`,
  url: `https://www.tiktok.com/@abc/video/7${String(i).padStart(18, '0')}`,
  title: `clip ${i}`,
  duration: 15,
  thumbnail: `https://p16.example/${i}.jpg`,
  timestamp: 1_700_000_000,
  view_count: 1200 * i,
})

const SCAN: ScanResponse = {
  scan_id: 'scan-1',
  username: 'abc',
  nickname: 'Abc',
  limit: 10,
  count: 5,
  truncated: false,
  max_send: 3,
  expires_at: new Date(Date.now() + 900_000).toISOString(),
  videos: [1, 2, 3, 4, 5].map(video),
}

const job = (id: string, status: Job['status']): Job => ({
  id,
  url: 'https://www.tiktok.com/@abc/video/1',
  platform: 'tiktok',
  format: 'video',
  status,
  error_code: null,
  title: null,
  created_at: new Date().toISOString(),
  delivery: 'chat',
  quality: null,
  progress: null,
  file: null,
})

type Handler = (body: unknown, init: RequestInit) => Response | Promise<Response>
const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

let routes: Record<string, Handler>
const calls: { key: string; body: unknown; keepalive: boolean }[] = []

beforeEach(() => {
  setActivePinia(createPinia())
  sessionStorage.clear()
  calls.length = 0
  routes = {
    'GET /api/me': () => json(200, ME),
    'GET /api/downloads': () => json(200, { items: [] }),
    'GET /health': () => json(200, { ok: true, status: 'ok' }),
    'POST /api/tiktok/scan': () => json(200, SCAN),
    'POST /api/tiktok/scan/discard': () => json(200, { discarded: true }),
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init: RequestInit) => {
      const path = new URL(input, 'http://x').pathname
      const key = `${init.method} ${path}`
      const body = init.body ? JSON.parse(String(init.body)) : undefined
      calls.push({ key, body, keepalive: init.keepalive === true })
      const handler = routes[key]
      if (!handler) throw new TypeError('Failed to fetch')
      return handler(body, init)
    }),
  )
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

async function ready() {
  const app = useDownloadStore()
  await app.boot()
  return { app, profile: useProfileStore() }
}

describe('parseUsername', () => {
  it.each([
    ['@abc', 'abc'],
    [' abc ', 'abc'],
    ['@khaby.lame', 'khaby.lame'],
    ['https://www.tiktok.com/@abc?lang=en', 'abc'],
    ['tiktok.com/@abc/video/1', 'abc'],
  ])('%s → %s', (raw, expected) => {
    expect(parseUsername(raw)).toEqual({ state: 'ok', username: expected })
  })

  it('rejects other input like the server does', () => {
    expect(parseUsername('').state).toBe('empty')
    expect(parseUsername('@').state).toBe('empty')
    for (const raw of ['a b', '@ab$c', 'https://evil.example/@abc', 'https://www.tiktok.com/x']) {
      expect(parseUsername(raw).state).toBe('invalid')
    }
  })

  it('formats view counts', () => {
    expect([
      formatCount(999),
      formatCount(1200),
      formatCount(15_400),
      formatCount(3_400_000),
    ]).toEqual(['999', '1.2K', '15K', '3.4M'])
  })
})

describe('profile store', () => {
  it('searches with the chosen limit and shows the results', async () => {
    const { profile } = await ready()
    profile.setInput('@abc')
    profile.setLimit('all')
    await profile.search()
    expect(calls.find((c) => c.key === 'POST /api/tiktok/scan')?.body).toEqual({
      username: 'abc',
      limit: 'all',
    })
    expect(profile.step).toBe('results')
    expect(profile.scan?.videos).toHaveLength(5)
  })

  it('does not call the server for an invalid username', async () => {
    const { profile } = await ready()
    profile.setInput('not a name')
    await profile.search()
    expect(profile.step).toBe('search')
    expect(calls.some((c) => c.key === 'POST /api/tiktok/scan')).toBe(false)
  })

  it('caps the selection at max_send', async () => {
    const { app, profile } = await ready()
    profile.setInput('abc')
    await profile.search()
    for (const v of SCAN.videos) profile.toggle(v)
    expect(profile.selected).toHaveLength(3)
    expect(profile.atLimit).toBe(true)
    expect(app.toast).toBe('You can send up to 3 videos at a time.')
    profile.toggle(SCAN.videos[0]!)
    expect(profile.selected).toHaveLength(2)
    profile.clearSelection()
    profile.selectFirst()
    expect(profile.selected).toEqual(SCAN.videos.slice(0, 3).map((v) => v.id))
  })

  it('sends the selection, forgets the list and follows the batch', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    const { app, profile } = await ready()
    profile.setInput('abc')
    await profile.search()
    profile.toggle(SCAN.videos[0]!)
    profile.toggle(SCAN.videos[1]!)
    routes['POST /api/tiktok/scan/scan-1/send'] = () =>
      json(200, {
        username: 'abc',
        queued: 2,
        items: [
          { video_id: SCAN.videos[0]!.id, id: 'j1', status: 'queued' },
          { video_id: SCAN.videos[1]!.id, id: 'j2', status: 'queued' },
        ],
      })
    await profile.send()

    expect(calls.at(-1)?.body).toEqual({ video_ids: [SCAN.videos[0]!.id, SCAN.videos[1]!.id] })
    expect(profile.step).toBe('sent')
    expect(profile.scan).toBeNull() // one-time: the list is gone after sending
    expect(profile.selected).toEqual([])
    // The server already dropped it, so no extra discard call.
    expect(calls.some((c) => c.key === 'POST /api/tiktok/scan/discard')).toBe(false)
    expect(app.me?.usage_today).toBe(2)
    expect(profile.batch.map((r) => r.title)).toEqual(['clip 1', 'clip 2'])

    routes['GET /api/downloads'] = () =>
      json(200, { items: [job('j1', 'done'), job('j2', 'downloading')] })
    await vi.advanceTimersByTimeAsync(3_000)
    expect(profile.batch.map((r) => r.status)).toEqual(['done', 'working'])
    expect(profile.batchFinished).toBe(false)

    routes['GET /api/downloads'] = () =>
      json(200, { items: [job('j1', 'done'), job('j2', 'failed')] })
    await vi.advanceTimersByTimeAsync(3_000)
    expect(profile.batchCounts).toEqual({ total: 2, done: 1, failed: 1 })
    expect(profile.batchFinished).toBe(true)

    const polls = calls.filter((c) => c.key === 'GET /api/downloads').length
    await vi.advanceTimersByTimeAsync(10_000)
    expect(calls.filter((c) => c.key === 'GET /api/downloads').length).toBe(polls)
  })

  it('shows the quota left when the batch does not fit', async () => {
    const { profile } = await ready()
    profile.setInput('abc')
    await profile.search()
    profile.selectFirst()
    routes['POST /api/tiktok/scan/scan-1/send'] = () =>
      json(429, { detail: { code: 'E-QUOTA', remaining: 1 } })
    await profile.send()
    expect(profile.step).toBe('error')
    expect(profile.errorView?.message).toBe('You can download 1 more today. Select fewer videos.')
    profile.back()
    expect(profile.step).toBe('results') // the list is kept, so the user can pick fewer
    expect(profile.selected).toHaveLength(3)
  })

  it('an expired list sends the user back to search', async () => {
    const { profile } = await ready()
    profile.setInput('abc')
    await profile.search()
    profile.selectFirst()
    routes['POST /api/tiktok/scan/scan-1/send'] = () =>
      json(410, { detail: { code: 'E-SCANGONE' } })
    await profile.send()
    expect(profile.error?.code).toBe('E-SCANGONE')
    expect(profile.scan).toBeNull()
    profile.back()
    expect(profile.step).toBe('search')
  })

  it('maps scan errors to their own message', async () => {
    const { profile } = await ready()
    routes['POST /api/tiktok/scan'] = () => json(422, { detail: { code: 'E-PROFILE' } })
    profile.setInput('@ghost')
    await profile.search()
    expect(profile.step).toBe('error')
    expect(profile.errorView?.message).toContain('@ghost')
  })

  it('auth errors become the full-screen state', async () => {
    const { app, profile } = await ready()
    routes['POST /api/tiktok/scan'] = () => json(401, { detail: { code: 'E-AUTH' } })
    profile.setInput('abc')
    await profile.search()
    expect(app.phase).toBe('auth')
  })

  it('Back from the results discards the list on the server', async () => {
    const { profile } = await ready()
    profile.setInput('abc')
    await profile.search()
    profile.back()
    expect(profile.step).toBe('search')
    expect(profile.scan).toBeNull()
    expect(calls.at(-1)?.key).toBe('POST /api/tiktok/scan/discard')
  })

  it('closing the app discards the list with a keepalive request and never stores it', async () => {
    const { profile } = await ready()
    profile.setInput('abc')
    await profile.search()
    expect(JSON.stringify({ ...sessionStorage })).not.toContain('scan-1')
    profile.discardOnClose()
    expect(calls.at(-1)).toMatchObject({ key: 'POST /api/tiktok/scan/discard', keepalive: true })
    expect(profile.scan).toBeNull()
  })

  it('has copy for every new error code', () => {
    const ctx = { maxMb: 50, format: 'video' as const, quality: null }
    for (const code of [
      'E-USERNAME',
      'E-PROFILE',
      'E-NOVIDEOS',
      'E-SCANGONE',
      'E-TOOMANY',
      'E-QUOTA',
    ]) {
      expect(describeError(code, ctx).title).not.toBe("Couldn't download this")
    }
  })
})

describe('profile view', () => {
  it('renders every step without Vue warnings and discards on pagehide', async () => {
    const warn = vi.spyOn(console, 'warn')
    const error = vi.spyOn(console, 'error')
    const el = document.createElement('div')
    document.body.appendChild(el)
    const pinia = createPinia()
    const vueApp = createApp(App).use(pinia)
    vueApp.mount(el)
    const app = useDownloadStore(pinia)
    const profile = useProfileStore(pinia)
    await vi.waitFor(() => expect(app.phase).toBe('ready'))

    app.setMode('profile')
    await nextTick()
    expect(el.querySelector('#username-input')).not.toBeNull()
    expect(el.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toContain(
      'TikTok profile',
    )
    expect(el.textContent).toContain('Last 50')

    profile.setInput('abc')
    await profile.search()
    await vi.waitFor(() => expect(el.textContent).toContain('@abc'))
    expect(el.querySelectorAll('[role="checkbox"]')).toHaveLength(5)
    ;(el.querySelector('[role="checkbox"]') as HTMLButtonElement).click()
    await nextTick()
    expect(el.textContent).toContain('1/3 selected')
    expect(el.querySelector('[role="checkbox"][aria-checked="true"]')).not.toBeNull()

    window.dispatchEvent(new Event('pagehide'))
    expect(calls.at(-1)).toMatchObject({ key: 'POST /api/tiktok/scan/discard', keepalive: true })

    app.setMode('link')
    await nextTick()
    expect(el.querySelector('#url-input')).not.toBeNull()

    vueApp.unmount()
    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })
})
