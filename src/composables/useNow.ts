import { onScopeDispose, ref, watch, type Ref } from 'vue'

/** A ticking Date.now() while `active` is true (countdowns, elapsed time). */
export function useNow(active: Ref<boolean>, intervalMs = 1_000): Ref<number> {
  const now = ref(Date.now())
  let timer: ReturnType<typeof setInterval> | null = null

  function stop(): void {
    if (timer !== null) clearInterval(timer)
    timer = null
  }

  watch(
    active,
    (on) => {
      stop()
      if (on) {
        now.value = Date.now()
        timer = setInterval(() => (now.value = Date.now()), intervalMs)
      }
    },
    { immediate: true },
  )
  onScopeDispose(stop)
  return now
}
