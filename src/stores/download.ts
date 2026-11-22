import { defineStore } from 'pinia'
import { computed, ref, shallowRef, watch } from 'vue'
import { ApiError, isAbortError, toApiError } from '@/api/client'
import {
  cancelDownload,
  createDownload,
  fileUrl,
  getDownload,
  getHealth,
  getInfo,
  getMe,
  listDownloads,
} from '@/api/media'
import { useTelegram } from '@/composables/useTelegram'
import { WAKE_UP_AFTER_MS, WAKE_UP_DEADLINE_MS } from '@/config'
import { describeError, type ErrorView } from '@/lib/errors'
import { defaultQuality, lowerQuality } from '@/lib/format'
import { clearSession, loadSession, saveSession } from '@/lib/session'
import { S } from '@/lib/strings'
import { checkLink, DEFAULT_PLATFORMS } from '@/lib/url'
import {
  FINAL_STATUSES,
  type ErrorCode,
  type InfoResponse,
  type Job,
  type MediaFormat,
  type MeResponse,
  type Quality,
} from '@/types/api'

export type Step = 'input' | 'preview' | 'progress' | 'done' | 'error'
/** App-wide connection/auth state, shown as full-screen states by App.vue. */
export type Phase = 'booting' | 'waking' | 'ready' | 'offline' | 'auth' | 'banned'
/** Which operation produced the current error (decides what "Try again" repeats). */
export type FailedOp = 'info' | 'download' | 'job'

export interface AppError {
  code: ErrorCode
  op: FailedOp
  retryAfter: number
  maxDuration: number | null
  /** Epoch ms when a rate-limited retry becomes possible. */
  retryAt: number | null
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export const useDownloadStore = defineStore('download', () => {
  const tg = useTelegram()

  // ------------------------------------------------------------------ state
  const phase = ref<Phase>('booting')
  const wakeStartedAt = ref<number>(0)
  const me = shallowRef<MeResponse | null>(null)

  const step = ref<Step>('input')
  const input = ref('')
  const touched = ref(false)
  const info = shallowRef<InfoResponse | null>(null)
  const infoLoading = ref(false)
  const format = ref<MediaFormat>('video')
  const quality = ref<Quality | null>(null)
  const job = shallowRef<Job | null>(null)
  const creating = ref(false)
  const cancelling = ref(false)
  const error = shallowRef<AppError | null>(null)
  const errorBackStep = ref<Step>('input')
  const toast = ref<string | null>(null)

  let infoCtrl: AbortController | null = null
  let toastTimer: ReturnType<typeof setTimeout> | null = null

  // ------------------------------------------------------------------ derived
  const platforms = computed(() => me.value?.platforms ?? DEFAULT_PLATFORMS)
  const link = computed(() => checkLink(input.value, platforms.value))
  const maxMb = computed(() => me.value?.max_upload_mb ?? 50)
  const fileTtlMin = computed(() => me.value?.file_ttl_min ?? 15)
  const qualities = computed<Quality[]>(() =>
    [...(info.value?.qualities ?? [])].sort((a, b) => a - b),
  )
  const canVideo = computed(() => info.value?.has_video !== false)
  const nextLowerQuality = computed(() =>
    format.value === 'video' ? lowerQuality(qualities.value, quality.value) : null,
  )
  /** Job id to poll; null stops polling (DownloaderView owns the poller). */
  const pollingJobId = computed(() => (step.value === 'progress' ? (job.value?.id ?? null) : null))
  const sourceUrl = computed(() => info.value?.url ?? job.value?.url ?? null)

  const errorView = computed<ErrorView | null>(() =>
    error.value
      ? describeError(
          error.value.code,
          { maxMb: maxMb.value, format: format.value, quality: quality.value },
          { retryAfter: error.value.retryAfter, maxDuration: error.value.maxDuration },
        )
      : null,
  )

  // ------------------------------------------------------------------ helpers
  function showToast(message: string): void {
    toast.value = message
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => (toast.value = null), 3_500)
  }

  function setError(err: ApiError | ErrorCode, op: FailedOp): void {
    const e = typeof err === 'string' ? new ApiError(err) : err
    if (e.code === 'E-AUTH') {
      phase.value = 'auth'
      return
    }
    if (e.code === 'E-BANNED') {
      phase.value = 'banned'
      return
    }
    error.value = {
      code: e.code,
      op,
      retryAfter: e.retryAfter,
      maxDuration: e.maxDuration,
      retryAt: e.code === 'E-RATELIMIT' && e.retryAfter ? Date.now() + e.retryAfter * 1000 : null,
    }
    errorBackStep.value = op === 'info' || !info.value ? 'input' : 'preview'
    step.value = 'error'
    tg.haptic('error')
  }

  /**
   * Probe /health until the server answers (Render free instances sleep after 15 idle minutes).
   * The wake-up screen appears only if this takes longer than WAKE_UP_AFTER_MS.
   */
  async function wakeServer(deadlineMs: number): Promise<boolean> {
    const before = phase.value
    const deadline = Date.now() + deadlineMs
    const slow = setTimeout(() => {
      if (phase.value === 'ready' || phase.value === 'booting') {
        wakeStartedAt.value = Date.now()
        phase.value = 'waking'
      }
    }, WAKE_UP_AFTER_MS)
    try {
      while (Date.now() < deadline) {
        try {
          await getHealth(Math.max(1_000, Math.min(10_000, deadline - Date.now())))
          return true
        } catch {
          await sleep(2_000)
        }
      }
      return false
    } finally {
      clearTimeout(slow)
      if (phase.value === 'waking' && before !== 'waking') phase.value = before
    }
  }

  /** Run a request; if the server looks asleep, wake it and try once more. */
  async function withWake<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn()
    } catch (err) {
      if (isAbortError(err)) throw err
      const e = toApiError(err)
      if (!e.isUnreachable) throw e
      if (!(await wakeServer(WAKE_UP_DEADLINE_MS))) throw e
      return await fn()
    }
  }

  function persist(): void {
    if (phase.value !== 'ready') return
    const keepJob = job.value && (step.value === 'progress' || step.value === 'done')
    saveSession({
      v: 1,
      input: input.value,
      info: info.value,
      format: format.value,
      quality: quality.value,
      jobId: keepJob ? job.value!.id : null,
    })
  }

  watch([input, info, format, quality, job, step], persist)

  // ------------------------------------------------------------------ boot & restore
  async function boot(): Promise<void> {
    const startedAt = Date.now()
    phase.value = 'booting'
    const slow = setTimeout(() => {
      if (phase.value === 'booting') {
        wakeStartedAt.value = startedAt
        phase.value = 'waking'
      }
    }, WAKE_UP_AFTER_MS)
    try {
      me.value = await loadMe(startedAt + WAKE_UP_DEADLINE_MS)
      phase.value = 'ready'
      await restore()
    } catch (err) {
      const e = toApiError(err)
      phase.value = e.code === 'E-AUTH' ? 'auth' : e.code === 'E-BANNED' ? 'banned' : 'offline'
      if (phase.value === 'offline') tg.haptic('error')
    } finally {
      clearTimeout(slow)
    }
  }

  async function loadMe(deadline: number): Promise<MeResponse> {
    try {
      return await getMe(20_000)
    } catch (err) {
      const e = toApiError(err)
      if (!e.isUnreachable) throw e
      if (!(await wakeServer(deadline - Date.now()))) throw e
      return await getMe(15_000)
    }
  }

  async function restore(): Promise<void> {
    const saved = loadSession()
    if (saved) {
      input.value = saved.input
      info.value = saved.info
      format.value = saved.format
      quality.value = saved.quality
      if (saved.info) step.value = 'preview'
    }
    let id = saved?.jobId ?? null
    if (!id) {
      // Reopened in a fresh webview: pick up a download that is still running on the server.
      try {
        const { items } = await listDownloads()
        id = items.find((j) => !FINAL_STATUSES.has(j.status))?.id ?? null
      } catch {
        return
      }
    }
    if (!id) return
    try {
      const restored = await getDownload(id)
      const finalNoFile =
        FINAL_STATUSES.has(restored.status) &&
        !(restored.status === 'done' && (restored.file || restored.delivery === 'chat'))
      if (finalNoFile) {
        job.value = null
        return
      }
      applyJob(restored, { quiet: true })
    } catch {
      job.value = null
    }
  }

  // ------------------------------------------------------------------ input → preview
  function setInput(value: string): void {
    input.value = value
    if (!value) touched.value = false
  }

  async function submitLink(): Promise<void> {
    touched.value = true
    const checked = link.value
    if (checked.state !== 'ok') {
      tg.haptic('error')
      return
    }
    infoCtrl?.abort()
    const ctrl = new AbortController()
    infoCtrl = ctrl
    info.value = null
    error.value = null
    infoLoading.value = true
    step.value = 'preview' // the preview skeleton shows while yt-dlp reads the link
    try {
      const res = await withWake(() => getInfo(checked.url, ctrl.signal))
      if (ctrl.signal.aborted) return
      info.value = res
      if (!res.has_video) format.value = 'audio'
      quality.value = defaultQuality(res.qualities)
      tg.haptic('light')
    } catch (err) {
      if (isAbortError(err) || ctrl.signal.aborted) return
      setError(toApiError(err), 'info')
    } finally {
      if (infoCtrl === ctrl) {
        infoCtrl = null
        infoLoading.value = false
      }
    }
  }

  function setFormat(value: MediaFormat): void {
    if (value === 'video' && !canVideo.value) return
    if (format.value !== value) tg.haptic('selection')
    format.value = value
    if (value === 'video' && quality.value == null) quality.value = defaultQuality(qualities.value)
  }

  function setQuality(value: Quality): void {
    if (quality.value !== value) tg.haptic('selection')
    quality.value = value
  }

  // ------------------------------------------------------------------ download
  async function startDownload(): Promise<void> {
    const url = sourceUrl.value
    if (!url || creating.value) return
    creating.value = true
    error.value = null
    const fmt = format.value
    const q = fmt === 'video' ? quality.value : null
    try {
      const res = await withWake(() =>
        createDownload({ url, format: fmt, quality: q, delivery: 'device' }),
      )
      if (me.value) me.value = { ...me.value, usage_today: me.value.usage_today + 1 }
      if (res.id === null) {
        // Served from the chat file_id cache (never for device delivery, kept for completeness).
        job.value = null
        step.value = 'done'
        tg.haptic('success')
        return
      }
      applyJob({
        id: res.id,
        url,
        platform: info.value?.platform ?? job.value?.platform ?? 'youtube',
        format: fmt,
        status: 'queued',
        error_code: null,
        title: info.value?.title ?? null,
        created_at: new Date().toISOString(),
        delivery: 'device',
        quality: q,
        progress: null,
        file: null,
      })
    } catch (err) {
      const e = toApiError(err)
      if (e.code === 'E-BUSY' && e.jobId) {
        // One active job per user: show the running one instead of an error.
        try {
          applyJob(await getDownload(e.jobId))
          showToast(
            describeError('E-BUSY', { maxMb: maxMb.value, format: fmt, quality: q }).message,
          )
          return
        } catch {
          // Fall through to the error screen.
        }
      }
      setError(e, 'download')
    } finally {
      creating.value = false
    }
  }

  /** Single entry point for every job update (create, poll, restore). */
  function applyJob(next: Job, opts: { quiet?: boolean } = {}): void {
    job.value = next
    format.value = next.format
    if (next.format === 'video' && next.quality != null) quality.value = next.quality as Quality

    switch (next.status) {
      case 'done':
        cancelling.value = false
        if (next.delivery === 'device' && !next.file) {
          setError('E-GONE', 'download')
          return
        }
        step.value = 'done'
        if (!opts.quiet) tg.haptic('success')
        return
      case 'failed':
        cancelling.value = false
        setError((next.error_code as ErrorCode | null) ?? 'E-FAILED', 'download')
        return
      case 'expired':
        cancelling.value = false
        setError('E-EXPIRED', 'download')
        return
      case 'cancelled':
        cancelling.value = false
        job.value = null
        step.value = info.value ? 'preview' : 'input'
        if (!opts.quiet) showToast(S.cancelled)
        return
      default:
        step.value = 'progress'
    }
  }

  function onPollError(err: ApiError): void {
    setError(err, err.code === 'E-NOTFOUND' ? 'download' : 'job')
  }

  async function cancel(): Promise<void> {
    const current = job.value
    if (!current || cancelling.value) return
    if (!(await tg.confirm(S.cancelConfirm))) return
    cancelling.value = true
    try {
      await cancelDownload(current.id)
      tg.haptic('warning')
    } catch (err) {
      const e = toApiError(err)
      cancelling.value = false
      // E-FINISHED: the job ended meanwhile; the next poll shows the real outcome.
      if (e.code !== 'E-FINISHED') showToast(describeError(e.code, errorCtx()).message)
    }
  }

  function errorCtx() {
    return { maxMb: maxMb.value, format: format.value, quality: quality.value }
  }

  async function save(): Promise<void> {
    const file = job.value?.file
    if (!file) return
    if (Date.parse(file.expires_at) <= Date.now()) {
      setError('E-GONE', 'download')
      return
    }
    const result = await tg.downloadFile(fileUrl(file.download_path), file.name)
    if (result === 'started') {
      tg.haptic('success')
      showToast(S.saveStarted)
    } else if (result === 'declined') {
      showToast(S.saveDeclined)
    }
  }

  // ------------------------------------------------------------------ navigation
  function reset(): void {
    infoCtrl?.abort()
    infoCtrl = null
    infoLoading.value = false
    input.value = ''
    touched.value = false
    info.value = null
    job.value = null
    error.value = null
    cancelling.value = false
    format.value = 'video'
    quality.value = null
    step.value = 'input'
    clearSession()
  }

  function back(): void {
    if (step.value === 'preview') {
      infoCtrl?.abort()
      infoCtrl = null
      infoLoading.value = false
      step.value = 'input'
    } else if (step.value === 'error') {
      const target = errorBackStep.value
      if (!input.value && job.value) input.value = job.value.url
      error.value = null
      job.value = null
      step.value = target === 'preview' && info.value ? 'preview' : 'input'
    } else if (step.value === 'done') {
      reset()
    }
  }

  function retry(): void {
    const current = error.value
    if (!current) return
    if (current.retryAt && current.retryAt > Date.now()) return
    if (current.op === 'info') {
      void submitLink()
    } else if (current.op === 'job' && job.value) {
      error.value = null
      step.value = 'progress' // pollingJobId becomes non-null, the view restarts polling
    } else {
      void startDownload()
    }
  }

  function tryLowerQuality(): void {
    const lower = nextLowerQuality.value
    if (lower == null) return
    quality.value = lower
    void startDownload()
  }

  function tryAudio(): void {
    format.value = 'audio'
    void startDownload()
  }

  return {
    // state
    phase,
    wakeStartedAt,
    me,
    step,
    input,
    touched,
    info,
    infoLoading,
    format,
    quality,
    job,
    creating,
    cancelling,
    error,
    toast,
    // derived
    platforms,
    link,
    maxMb,
    fileTtlMin,
    qualities,
    canVideo,
    nextLowerQuality,
    pollingJobId,
    errorView,
    // actions
    boot,
    setInput,
    submitLink,
    setFormat,
    setQuality,
    startDownload,
    applyJob,
    onPollError,
    cancel,
    save,
    reset,
    back,
    retry,
    tryLowerQuality,
    tryAudio,
    showToast,
  }
})
