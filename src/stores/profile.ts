import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { ApiError, isAbortError, toApiError } from '@/api/client'
import { discardScan, listDownloads, scanProfile, sendProfileVideos } from '@/api/media'
import { useTelegram } from '@/composables/useTelegram'
import { describeError, type ErrorView } from '@/lib/errors'
import { parseUsername } from '@/lib/tiktok'
import type { ErrorCode, Job, ProfileLimit, ProfileVideo, ScanResponse } from '@/types/api'
import { useDownloadStore } from './download'

/**
 * "TikTok profile" tab: list a profile once, pick videos, send them to the bot chat.
 *
 * The listing is one-time data. It lives only in this store (never in sessionStorage) and on the
 * server (one per user). Both forget it when the videos are sent, on a new search or Back, and when
 * the Mini App closes (pagehide → POST /api/tiktok/scan/discard, keepalive). The server also drops
 * it after PROFILE_SCAN_TTL_MIN and on restart.
 */
export type ProfileStep = 'search' | 'scanning' | 'results' | 'sent' | 'error'
export type ProfileOp = 'scan' | 'send'
export type BatchRowStatus = 'queued' | 'working' | 'done' | 'failed'

export interface BatchRow {
  videoId: string
  jobId: string | null
  title: string
  thumbnail: string | null
  status: BatchRowStatus
}

export interface ProfileError {
  code: ErrorCode
  op: ProfileOp
  retryAfter: number
  remaining: number | null
  max: number | null
  retryAt: number | null
}

export const PROFILE_LIMITS: readonly ProfileLimit[] = [10, 50, 100, 'all']
const DEFAULT_MAX_SEND = 10
const BATCH_POLL_MS = 3_000
/** Stop following a batch after this long; the videos still arrive in the chat. */
const BATCH_POLL_FOR_MS = 30 * 60_000

function rowStatus(job: Job): BatchRowStatus {
  switch (job.status) {
    case 'received':
    case 'queued':
      return 'queued'
    case 'done':
      return 'done'
    case 'failed':
    case 'cancelled':
    case 'expired':
      return 'failed'
    default:
      return 'working'
  }
}

export const useProfileStore = defineStore('profile', () => {
  const tg = useTelegram()
  const app = useDownloadStore()

  // ------------------------------------------------------------------ state
  const input = ref('')
  const touched = ref(false)
  const limit = ref<ProfileLimit>(10)
  const step = ref<ProfileStep>('search')
  const scan = shallowRef<ScanResponse | null>(null)
  const selected = ref<string[]>([])
  const sending = ref(false)
  const batch = ref<BatchRow[]>([])
  const batchUser = ref('')
  const error = shallowRef<ProfileError | null>(null)
  /** Username of the search in flight or on screen (for copy and errors). */
  const searched = ref('')

  let scanCtrl: AbortController | null = null
  let pollTimer: ReturnType<typeof setTimeout> | null = null
  let pollUntil = 0

  // ------------------------------------------------------------------ derived
  const check = computed(() => parseUsername(input.value))
  const maxSend = computed(
    () => scan.value?.max_send ?? app.me?.profile_max_send ?? DEFAULT_MAX_SEND,
  )
  const selectedSet = computed(() => new Set(selected.value))
  const atLimit = computed(() => selected.value.length >= maxSend.value)
  const canSend = computed(
    () => selected.value.length > 0 && selected.value.length <= maxSend.value && !sending.value,
  )
  const batchCounts = computed(() => {
    const rows = batch.value
    return {
      total: rows.length,
      done: rows.filter((r) => r.status === 'done').length,
      failed: rows.filter((r) => r.status === 'failed').length,
    }
  })
  const batchFinished = computed(
    () => batchCounts.value.done + batchCounts.value.failed === batchCounts.value.total,
  )
  const errorView = computed<ErrorView | null>(() =>
    error.value
      ? describeError(
          error.value.code,
          { maxMb: app.maxMb, format: 'video', quality: null, username: searched.value },
          {
            retryAfter: error.value.retryAfter,
            remaining: error.value.remaining,
            max: error.value.max,
          },
        )
      : null,
  )

  // ------------------------------------------------------------------ helpers
  function setError(err: ApiError, op: ProfileOp): void {
    if (app.handleAuthError(err.code)) return
    error.value = {
      code: err.code,
      op,
      retryAfter: err.retryAfter,
      remaining: err.remaining,
      max: err.max,
      retryAt:
        err.code === 'E-RATELIMIT' && err.retryAfter ? Date.now() + err.retryAfter * 1000 : null,
    }
    step.value = 'error'
    tg.haptic('error')
  }

  /** Forget the listing here, and on the server unless it is already gone there. */
  function clearScan(opts: { server?: boolean; keepalive?: boolean } = {}): void {
    const had = scan.value !== null
    scan.value = null
    selected.value = []
    if (had && opts.server !== false) void discardScan(opts.keepalive).catch(() => undefined)
  }

  // ------------------------------------------------------------------ search
  function setInput(value: string): void {
    input.value = value
    if (!value) touched.value = false
  }

  function setLimit(value: ProfileLimit): void {
    if (limit.value !== value) tg.haptic('selection')
    limit.value = value
  }

  async function search(): Promise<void> {
    touched.value = true
    const checked = check.value
    if (checked.state !== 'ok') {
      tg.haptic('error')
      return
    }
    scanCtrl?.abort()
    const ctrl = new AbortController()
    scanCtrl = ctrl
    clearScan({ server: false }) // the new scan replaces the old one on the server
    error.value = null
    searched.value = checked.username
    step.value = 'scanning'
    try {
      const res = await app.withWake(() =>
        scanProfile({ username: checked.username, limit: limit.value }, ctrl.signal),
      )
      if (ctrl.signal.aborted) return
      scan.value = res
      searched.value = res.username
      step.value = 'results'
      tg.haptic('light')
    } catch (err) {
      if (isAbortError(err) || ctrl.signal.aborted) return
      setError(toApiError(err), 'scan')
    } finally {
      if (scanCtrl === ctrl) scanCtrl = null
    }
  }

  // ------------------------------------------------------------------ select
  function toggle(video: ProfileVideo): void {
    const current = selected.value
    if (current.includes(video.id)) {
      selected.value = current.filter((id) => id !== video.id)
      tg.haptic('selection')
      return
    }
    if (current.length >= maxSend.value) {
      tg.haptic('warning')
      app.showToast(describeError('E-TOOMANY', errorCtx(), { max: maxSend.value }).message)
      return
    }
    selected.value = [...current, video.id]
    tg.haptic('selection')
  }

  /** Select the newest videos, up to what one batch may send. */
  function selectFirst(): void {
    selected.value = (scan.value?.videos ?? []).slice(0, maxSend.value).map((v) => v.id)
    tg.haptic('selection')
  }

  function clearSelection(): void {
    selected.value = []
    tg.haptic('selection')
  }

  // ------------------------------------------------------------------ send
  async function send(): Promise<void> {
    const current = scan.value
    if (!current || !canSend.value) return
    const ids = [...selected.value]
    const byId = new Map(current.videos.map((v) => [v.id, v]))
    sending.value = true
    try {
      // Not wrapped in withWake: a repeated POST could queue the batch twice.
      const res = await sendProfileVideos(current.scan_id, ids)
      batchUser.value = res.username
      batch.value = res.items.map((item) => {
        const video = byId.get(item.video_id)
        return {
          videoId: item.video_id,
          jobId: item.id,
          title: video?.title || '',
          thumbnail: video?.thumbnail ?? null,
          status: item.status === 'queued' ? 'queued' : item.status,
        }
      })
      if (app.me) {
        app.me = { ...app.me, usage_today: app.me.usage_today + res.items.length }
      }
      clearScan({ server: false }) // the server dropped it when it queued the batch
      step.value = 'sent'
      tg.haptic('success')
      startBatchPolling()
    } catch (err) {
      const e = toApiError(err)
      if (e.code === 'E-SCANGONE') clearScan({ server: false })
      setError(e, 'send')
    } finally {
      sending.value = false
    }
  }

  // ------------------------------------------------------------------ follow the batch
  async function refreshBatch(): Promise<void> {
    const { items } = await listDownloads()
    const byJob = new Map(items.map((j) => [j.id, j]))
    batch.value = batch.value.map((row) => {
      const job = row.jobId ? byJob.get(row.jobId) : undefined
      return job ? { ...row, status: rowStatus(job) } : row
    })
  }

  function stopBatchPolling(): void {
    if (pollTimer) clearTimeout(pollTimer)
    pollTimer = null
  }

  function startBatchPolling(): void {
    stopBatchPolling()
    pollUntil = Date.now() + BATCH_POLL_FOR_MS
    const tick = async () => {
      pollTimer = null
      try {
        await refreshBatch()
      } catch {
        // Network blips: keep trying until the deadline.
      }
      if (step.value !== 'sent' || batchFinished.value || Date.now() > pollUntil) {
        if (batchFinished.value && step.value === 'sent') tg.haptic('success')
        return
      }
      pollTimer = setTimeout(() => void tick(), BATCH_POLL_MS)
    }
    if (!batchFinished.value) pollTimer = setTimeout(() => void tick(), BATCH_POLL_MS)
  }

  // ------------------------------------------------------------------ navigation
  function reset(): void {
    scanCtrl?.abort()
    scanCtrl = null
    stopBatchPolling()
    clearScan()
    batch.value = []
    batchUser.value = ''
    error.value = null
    touched.value = false
    step.value = 'search'
  }

  function back(): void {
    switch (step.value) {
      case 'scanning':
        scanCtrl?.abort()
        scanCtrl = null
        step.value = 'search'
        return
      case 'results':
        clearScan() // leaving the list = done with it (one-time)
        step.value = 'search'
        return
      case 'error':
        error.value = null
        step.value = scan.value ? 'results' : 'search'
        return
      case 'sent':
        reset()
    }
  }

  function retry(): void {
    const current = error.value
    if (!current) return
    if (current.retryAt && current.retryAt > Date.now()) return
    if (current.op === 'send' && scan.value) {
      error.value = null
      step.value = 'results'
      void send()
    } else {
      void search()
    }
  }

  /** pagehide: the Mini App is closing, so drop the listing right away (keepalive request). */
  function discardOnClose(): void {
    stopBatchPolling()
    clearScan({ keepalive: true })
  }

  function errorCtx() {
    return { maxMb: app.maxMb, format: 'video' as const, quality: null, username: searched.value }
  }

  return {
    // state
    input,
    touched,
    limit,
    step,
    scan,
    selected,
    sending,
    batch,
    batchUser,
    error,
    searched,
    // derived
    check,
    maxSend,
    selectedSet,
    atLimit,
    canSend,
    batchCounts,
    batchFinished,
    errorView,
    // actions
    setInput,
    setLimit,
    search,
    toggle,
    selectFirst,
    clearSelection,
    send,
    refreshBatch,
    stopBatchPolling,
    reset,
    back,
    retry,
    discardOnClose,
  }
})
