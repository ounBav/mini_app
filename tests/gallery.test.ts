import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDownloadStore } from '@/stores/download'
import type { Job } from '@/types/api'

const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

const ME = {
  user: { id: 42, first_name: 'Dev', username: null },
  usage_today: 0,
  limit_per_day: 30,
  limit_per_minute: 5,
  max_upload_mb: 50,
  platforms: [{ key: 'youtube', label: 'YouTube', hosts: ['youtu.be'] }],
  terms_url: null,
  qualities: [360, 480, 720, 1080],
  file_ttl_min: 15,
}

const doneVideo = (id = 'job-1'): Job => ({
  id,
  url: 'https://youtu.be/abc',
  platform: 'youtube',
  format: 'video',
  status: 'done',
  error_code: null,
  title: 'Clip',
  created_at: new Date().toISOString(),
  delivery: 'device',
  quality: 720,
  progress: 1,
  file: {
    name: 'Clip.mp4',
    size: 4,
    download_path: '/api/files/tok',
    expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
  },
})

const posts: unknown[] = []

beforeEach(() => {
  setActivePinia(createPinia())
  sessionStorage.clear()
  posts.length = 0
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const path = new URL(input, 'http://x').pathname
      if (path === '/api/me') return json(200, ME)
      if (path === '/api/downloads' && init.method === 'POST') {
        posts.push(JSON.parse(String(init.body)))
        return json(200, { id: 'job-2', status: 'queued', cached: false })
      }
      if (path === '/api/downloads') return json(200, { items: [] })
      if (path === '/api/files/tok') {
        return new Response(new Uint8Array([1, 2, 3, 4]), {
          headers: { 'Content-Type': 'video/mp4' },
        })
      }
      throw new TypeError('Failed to fetch')
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  Reflect.deleteProperty(navigator, 'share')
  Reflect.deleteProperty(navigator, 'canShare')
})

describe('save to gallery', () => {
  it('prefetches the video and opens the share sheet where files can be shared', async () => {
    const share = vi.fn(async () => undefined)
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true })

    const store = useDownloadStore()
    await store.boot()
    store.applyJob(doneVideo())
    expect(store.galleryMode).toBe('share')
    await vi.waitFor(() => expect(store.galleryState).toBe('ready'))

    store.saveToGallery()
    expect(share).toHaveBeenCalledTimes(1)
    const shared = (share.mock.calls[0] as unknown as [ShareData])[0]
    const file = shared.files?.[0]
    expect(file?.name).toBe('Clip.mp4')
    expect(file?.type).toBe('video/mp4')
    expect(file?.size).toBe(4)
  })

  it('sends the video to the bot chat where the webview cannot share files', async () => {
    const store = useDownloadStore()
    await store.boot()
    store.applyJob(doneVideo())
    expect(store.galleryMode).toBe('chat')

    await store.sendToChat()
    expect(posts.at(-1)).toEqual({
      url: 'https://youtu.be/abc',
      format: 'video',
      quality: 720,
      delivery: 'chat',
    })
    expect(store.step).toBe('progress')
    expect(store.job?.delivery).toBe('chat')

    store.applyJob({ ...doneVideo('job-2'), delivery: 'chat', file: null })
    expect(store.step).toBe('done')
    expect(store.galleryMode).toBe('none')
  })

  it('offers no gallery for audio', async () => {
    const store = useDownloadStore()
    await store.boot()
    store.applyJob({ ...doneVideo(), format: 'audio', quality: null })
    expect(store.galleryMode).toBe('none')
  })
})
