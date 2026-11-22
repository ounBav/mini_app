import { onScopeDispose, readonly, ref } from 'vue'
import { ApiError, isAbortError, toApiError } from '@/api/client'
import { getDownload } from '@/api/media'
import { pollDelay, retryDelay } from '@/lib/format'
import { FINAL_STATUSES, type Job } from '@/types/api'

/** Give up after this long without a single successful poll. */
const GIVE_UP_AFTER_MS = 120_000

export interface JobPollingHandlers {
  onUpdate: (job: Job) => void
  /** Fatal problem: the job is gone, the session expired, or the server stayed unreachable. */
  onError: (error: ApiError) => void
}

/**
 * Poll GET /api/downloads/{id} until the job is final.
 * Fast at first (1.5 s), slower as the job ages (3 s, 6 s), exponential back-off on network
 * errors, paused while the app is hidden, and stopped on final status, stop() or scope disposal.
 */
export function useJobPolling(handlers: JobPollingHandlers) {
  const jobId = ref<string | null>(null)
  const reconnecting = ref(false)

  let timer: ReturnType<typeof setTimeout> | null = null
  let ctrl: AbortController | null = null
  let startedAt = 0
  let lastOkAt = 0
  let failures = 0
  let generation = 0

  function clearTimer(): void {
    if (timer !== null) clearTimeout(timer)
    timer = null
  }

  function schedule(delayMs: number): void {
    clearTimer()
    timer = setTimeout(() => void tick(), delayMs)
  }

  async function tick(): Promise<void> {
    const id = jobId.value
    if (!id) return
    if (document.visibilityState === 'hidden') return // resumed by the visibilitychange listener
    const gen = generation
    ctrl = new AbortController()
    try {
      const job = await getDownload(id, ctrl.signal)
      if (gen !== generation) return
      failures = 0
      lastOkAt = Date.now()
      reconnecting.value = false
      handlers.onUpdate(job)
      if (FINAL_STATUSES.has(job.status)) {
        stop()
        return
      }
      schedule(pollDelay(Date.now() - startedAt))
    } catch (err) {
      if (gen !== generation || isAbortError(err)) return
      const error = toApiError(err)
      if (!error.isUnreachable && error.code !== 'E-RATELIMIT') {
        stop()
        handlers.onError(error)
        return
      }
      failures += 1
      reconnecting.value = true
      if (Date.now() - lastOkAt > GIVE_UP_AFTER_MS) {
        stop()
        handlers.onError(error)
        return
      }
      schedule(error.retryAfter ? error.retryAfter * 1000 : retryDelay(failures))
    } finally {
      if (gen === generation) ctrl = null
    }
  }

  function start(id: string): void {
    if (jobId.value === id) return // already polling this job
    stop()
    jobId.value = id
    startedAt = lastOkAt = Date.now()
    failures = 0
    void tick()
  }

  function stop(): void {
    generation += 1
    clearTimer()
    ctrl?.abort()
    ctrl = null
    jobId.value = null
    reconnecting.value = false
  }

  function onVisibility(): void {
    if (document.visibilityState === 'visible' && jobId.value) {
      lastOkAt = Date.now() // time spent in the background is not a connection problem
      schedule(0)
    }
  }

  document.addEventListener('visibilitychange', onVisibility)
  onScopeDispose(() => {
    document.removeEventListener('visibilitychange', onVisibility)
    stop()
  })

  return { start, stop, jobId: readonly(jobId), reconnecting: readonly(reconnecting) }
}
