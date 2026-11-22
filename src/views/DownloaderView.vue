<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, watch, watchEffect } from 'vue'
import ErrorState from '@/components/ErrorState.vue'
import FormatToggle from '@/components/FormatToggle.vue'
import MediaPreview from '@/components/MediaPreview.vue'
import ProgressCard from '@/components/ProgressCard.vue'
import QualityChips from '@/components/QualityChips.vue'
import ResultCard from '@/components/ResultCard.vue'
import UrlInput from '@/components/UrlInput.vue'
import { useJobPolling } from '@/composables/useJobPolling'
import { useNow } from '@/composables/useNow'
import { useTelegram, type MainButtonConfig } from '@/composables/useTelegram'
import { isDailyLimit, isRetryable, type ErrorAction } from '@/lib/errors'
import { formatWait } from '@/lib/format'
import { S } from '@/lib/strings'
import { useDownloadStore } from '@/stores/download'

const store = useDownloadStore()
const tg = useTelegram()

// ------------------------------------------------------------------ polling (stops on unmount)
const polling = useJobPolling({ onUpdate: store.applyJob, onError: store.onPollError })
watch(
  () => store.pollingJobId,
  (id) => (id ? polling.start(id) : polling.stop()),
  { immediate: true },
)

// ------------------------------------------------------------------ clocks
const ticking = computed(
  () => (store.step === 'done' && !!store.job?.file) || store.error?.retryAt != null,
)
const now = useNow(ticking)
const fileExpired = computed(() => {
  const file = store.job?.file
  return file ? Date.parse(file.expires_at) <= now.value : false
})
const retryWait = computed(() => {
  const at = store.error?.retryAt
  return at ? Math.max(0, Math.ceil((at - now.value) / 1000)) : 0
})

// ------------------------------------------------------------------ error actions
const errorPrimary = computed<ErrorAction | null>(() => {
  const e = store.error
  if (!e) return null
  if (e.code === 'E-TOOBIG' && store.format === 'video') {
    const lower = store.nextLowerQuality
    return lower
      ? { label: S.tryLower(lower), run: store.tryLowerQuality }
      : { label: S.tryAudio, run: store.tryAudio }
  }
  if (e.code === 'E-RATELIMIT' && isDailyLimit(e.retryAfter))
    return { label: S.back, run: store.back }
  if (isRetryable(e.code)) {
    return retryWait.value > 0
      ? { label: S.tryAgainIn(formatWait(retryWait.value)), run: store.retry, enabled: false }
      : { label: S.tryAgain, run: store.retry }
  }
  return { label: S.anotherLink, run: store.reset }
})

const errorSecondary = computed<ErrorAction[]>(() => {
  const e = store.error
  if (!e) return []
  const actions: ErrorAction[] = []
  if (e.code === 'E-TOOBIG' && store.format === 'video' && store.nextLowerQuality) {
    actions.push({ label: S.tryAudio, run: store.tryAudio })
  }
  if (errorPrimary.value?.label !== S.back) actions.push({ label: S.back, run: store.back })
  return actions
})

// ------------------------------------------------------------------ Telegram MainButton / BackButton
const mainButton = computed<MainButtonConfig | null>(() => {
  switch (store.step) {
    case 'input':
      return { text: S.continue, enabled: store.link.state === 'ok', onClick: store.submitLink }
    case 'preview':
      return {
        text: store.format === 'audio' ? S.downloadAudio : S.downloadVideo(store.quality),
        enabled: !!store.info,
        loading: store.infoLoading || store.creating,
        onClick: store.startDownload,
      }
    case 'progress':
      return null // Cancel lives in the card: a destructive action should not be the main button
    case 'done':
      if (store.job?.file) {
        return fileExpired.value
          ? { text: S.tryAgain, loading: store.creating, onClick: store.startDownload }
          : { text: S.saveToDevice, onClick: store.save }
      }
      return { text: S.another, onClick: store.reset }
    case 'error': {
      const primary = errorPrimary.value
      return primary
        ? {
            text: primary.label,
            enabled: primary.enabled !== false,
            loading: store.creating || store.infoLoading,
            onClick: primary.run,
          }
        : null
    }
  }
  return null
})

const backHandler = computed(() =>
  store.step === 'preview' || store.step === 'error' || store.step === 'done' ? store.back : null,
)

watchEffect(() => tg.setMainButton(mainButton.value))
watchEffect(() => tg.setBackButton(backHandler.value))
onBeforeUnmount(() => {
  tg.setMainButton(null)
  tg.setBackButton(null)
})

// ------------------------------------------------------------------ a11y: move focus to new step
function focusStepHeading(): void {
  void nextTick(() => {
    const id = { progress: 'progress-title', done: 'done-title', error: 'error-title' }[
      store.step as 'progress' | 'done' | 'error'
    ]
    if (id) document.getElementById(id)?.focus({ preventScroll: true })
  })
}

const usage = computed(() =>
  store.me ? S.usage(store.me.usage_today, store.me.limit_per_day) : null,
)
</script>

<template>
  <main class="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-8 pt-4">
    <header class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h1 class="text-[22px] font-bold leading-tight">{{ S.appTitle }}</h1>
        <p class="text-[14px] text-tg-hint">{{ S.tagline }}</p>
      </div>
      <span
        v-if="usage"
        class="mt-1 shrink-0 rounded-full bg-tg-section px-3 py-1 text-[13px] tabular-nums text-tg-hint"
      >
        {{ usage }}
      </span>
    </header>

    <Transition
      mode="out-in"
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-1 opacity-0"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0"
      @after-enter="focusStepHeading"
    >
      <UrlInput
        v-if="store.step === 'input'"
        key="input"
        :model-value="store.input"
        :check="store.link"
        :platforms="store.platforms"
        :touched="store.touched"
        @update:model-value="store.setInput"
        @submit="store.submitLink"
      />

      <div v-else-if="store.step === 'preview'" key="preview" class="flex flex-col gap-5">
        <MediaPreview :info="store.info" :loading="store.infoLoading" />
        <FormatToggle
          :model-value="store.format"
          :video-disabled="!store.canVideo"
          :disabled="store.infoLoading || store.creating"
          @update:model-value="store.setFormat"
        />
        <div class="min-h-[76px]">
          <QualityChips
            v-if="store.format === 'video' && !store.infoLoading"
            :qualities="store.qualities"
            :model-value="store.quality"
            :disabled="store.creating"
            @update:model-value="store.setQuality"
          />
          <p class="px-4 pt-2 text-[13px] text-tg-hint">
            {{ store.info && !store.canVideo ? S.noVideoTrack : S.sizeHint(store.maxMb) }}
          </p>
        </div>
      </div>

      <ProgressCard
        v-else-if="store.step === 'progress' && store.job"
        key="progress"
        :job="store.job"
        :title="store.job.title ?? store.info?.title ?? null"
        :cancelling="store.cancelling"
        :reconnecting="polling.reconnecting.value"
        @cancel="store.cancel"
      />

      <ResultCard
        v-else-if="store.step === 'done'"
        key="done"
        :job="store.job"
        :now="now"
        :can-open-chat="tg.hasBotLink"
        @another="store.reset"
        @open-chat="tg.openBotChat"
      />

      <ErrorState
        v-else-if="store.step === 'error' && store.errorView"
        key="error"
        :title="store.errorView.title"
        :message="store.errorView.message"
        :code="store.error?.code"
        :actions="errorSecondary"
      />
    </Transition>

    <footer
      class="mt-auto flex flex-col items-center gap-1 pt-4 text-center text-[12px] text-tg-hint"
    >
      <p>{{ S.footer }}</p>
      <button
        v-if="store.me?.terms_url"
        type="button"
        class="min-h-tap px-3 text-tg-link"
        @click="tg.openLink(store.me.terms_url)"
      >
        {{ S.terms }}
      </button>
    </footer>
  </main>
</template>
