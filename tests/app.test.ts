import { createPinia } from 'pinia'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, nextTick } from 'vue'
import App from '@/App.vue'
import { useDownloadStore } from '@/stores/download'
import type { Job } from '@/types/api'

const json = (data: unknown) =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('App', () => {
  it('renders every step without Vue warnings', async () => {
    let current: Job | null = null
    const warn = vi.spyOn(console, 'warn')
    const error = vi.spyOn(console, 'error')
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string) => {
        if (input.endsWith('/api/me')) {
          return json({
            user: { id: 1, first_name: 'Dev', username: null },
            usage_today: 2,
            limit_per_day: 30,
            limit_per_minute: 5,
            max_upload_mb: 50,
            platforms: [{ key: 'tiktok', label: 'TikTok', hosts: ['vm.tiktok.com'] }],
            terms_url: 'https://example.com/terms',
            qualities: [360, 480, 720, 1080],
            file_ttl_min: 15,
          })
        }
        // Polling GET /api/downloads/{id} returns the job under test; the list is empty.
        if (/\/api\/downloads\/.+/.test(input)) return json(current)
        return json({ items: [] })
      }),
    )

    const el = document.createElement('div')
    document.body.appendChild(el)
    const pinia = createPinia()
    const app = createApp(App).use(pinia)
    app.mount(el)
    const store = useDownloadStore(pinia)
    await vi.waitFor(() => expect(store.phase).toBe('ready'))
    await nextTick()
    expect(el.querySelector('[aria-label="2/30 today"]')).not.toBeNull()
    expect(el.querySelector('#url-input')).not.toBeNull()

    store.setInput('https://vm.tiktok.com/ZM1/')
    await nextTick()
    expect(el.textContent).toContain('TikTok link detected')

    const base = {
      id: 'a',
      url: 'https://vm.tiktok.com/ZM1/',
      platform: 'tiktok' as const,
      format: 'audio' as const,
      error_code: null,
      title: 'Song',
      created_at: new Date().toISOString(),
      delivery: 'device' as const,
      quality: null,
    }
    current = { ...base, status: 'downloading', progress: 0.42, file: null }
    store.applyJob(current)
    await vi.waitFor(() => expect(el.textContent).toContain('Downloading… 42%'))

    current = {
      ...base,
      status: 'done',
      progress: 1,
      file: {
        name: 'Song.mp3',
        size: 3_500_000,
        download_path: '/api/files/t',
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      },
    }
    store.applyJob(current)
    await vi.waitFor(() => expect(el.textContent).toContain('Song.mp3'))
    expect(el.textContent).toContain('3.3 MB')

    current = {
      ...base,
      status: 'failed',
      error_code: 'E-PRIVATE',
      progress: null,
      file: null,
    }
    store.applyJob(current)
    await vi.waitFor(() => expect(el.textContent).toContain('Private video'))

    app.unmount()
    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })
})
