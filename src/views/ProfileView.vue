<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, watchEffect } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import BatchStatus from '@/components/BatchStatus.vue'
import ErrorState from '@/components/ErrorState.vue'
import ModeTabs from '@/components/ModeTabs.vue'
import ProfileGrid from '@/components/ProfileGrid.vue'
import ProfileSearch from '@/components/ProfileSearch.vue'
import Spinner from '@/components/Spinner.vue'
import { useNow } from '@/composables/useNow'
import { useTelegram, type MainButtonConfig } from '@/composables/useTelegram'
import { isDailyLimit, isRetryable, type ErrorAction } from '@/lib/errors'
import { formatWait } from '@/lib/format'
import { S } from '@/lib/strings'
import { useDownloadStore } from '@/stores/download'
import { useProfileStore } from '@/stores/profile'

const app = useDownloadStore()
const store = useProfileStore()
const tg = useTelegram()

// ------------------------------------------------------------------ rate-limit countdown
const now = useNow(computed(() => store.error?.retryAt != null))
const retryWait = computed(() => {
  const at = store.error?.retryAt
  return at ? Math.max(0, Math.ceil((at - now.value) / 1000)) : 0
})

// ------------------------------------------------------------------ error actions
const errorPrimary = computed<ErrorAction | null>(() => {
  const e = store.error
  if (!e) return null
  if (e.code === 'E-QUOTA' || e.code === 'E-TOOMANY') return { label: S.back, run: store.back }
  if (e.code === 'E-SCANGONE') return { label: S.search, run: store.retry }
  if (e.code === 'E-RATELIMIT' && isDailyLimit(e.retryAfter))
    return { label: S.back, run: store.back }
  if (isRetryable(e.code)) {
    return retryWait.value > 0
      ? { label: S.tryAgainIn(formatWait(retryWait.value)), run: store.retry, enabled: false }
      : { label: S.tryAgain, run: store.retry }
  }
  return { label: S.back, run: store.back }
})

const errorSecondary = computed<ErrorAction[]>(() =>
  store.error && errorPrimary.value?.label !== S.back ? [{ label: S.back, run: store.back }] : [],
)

// ------------------------------------------------------------------ Telegram MainButton / BackButton
const mainButton = computed<MainButtonConfig | null>(() => {
  switch (store.step) {
    case 'search':
      return { text: S.search, enabled: store.check.state === 'ok', onClick: store.search }
    case 'scanning':
      return { text: S.search, loading: true, onClick: () => undefined }
    case 'results':
      return {
        text: S.sendToTelegram(store.selected.length),
        enabled: store.canSend,
        loading: store.sending,
        onClick: store.send,
      }
    case 'sent':
      return { text: S.newSearch, onClick: store.reset }
    case 'error': {
      const primary = errorPrimary.value
      return primary
        ? { text: primary.label, enabled: primary.enabled !== false, onClick: primary.run }
        : null
    }
  }
  return null
})

const backHandler = computed(() => (store.step === 'search' ? null : store.back))

watchEffect(() => tg.setMainButton(mainButton.value))
watchEffect(() => tg.setBackButton(backHandler.value))
onBeforeUnmount(() => {
  tg.setMainButton(null)
  tg.setBackButton(null)
})

// ------------------------------------------------------------------ a11y: move focus to new step
function focusStepHeading(): void {
  void nextTick(() => {
    const id = { results: 'profile-title', sent: 'batch-title', error: 'error-title' }[
      store.step as 'results' | 'sent' | 'error'
    ]
    if (id) document.getElementById(id)?.focus({ preventScroll: true })
  })
}
</script>

<template>
  <main class="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-8 pt-4">
    <AppHeader :me="app.me" />
    <ModeTabs :model-value="app.mode" @update:model-value="app.setMode" />

    <Transition
      mode="out-in"
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="translate-y-3 scale-[0.98] opacity-0"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0"
      @after-enter="focusStepHeading"
    >
      <ProfileSearch
        v-if="store.step === 'search'"
        key="search"
        :model-value="store.input"
        :limit="store.limit"
        :check="store.check"
        :touched="store.touched"
        :max-videos-hint="app.me?.profile_max_videos"
        @update:model-value="store.setInput"
        @update:limit="store.setLimit"
        @submit="store.search"
      />

      <section
        v-else-if="store.step === 'scanning'"
        key="scanning"
        class="card flex flex-col items-center gap-3 px-5 py-10 text-center"
        aria-busy="true"
      >
        <Spinner :size="36" />
        <p class="text-[16px] font-bold" role="status">{{ S.searching(store.searched) }}</p>
        <p class="text-[13px] text-hint">{{ S.searchingHint }}</p>
      </section>

      <ProfileGrid
        v-else-if="store.step === 'results' && store.scan"
        key="results"
        :scan="store.scan"
        :selected="store.selectedSet"
        :count="store.selected.length"
        :max-send="store.maxSend"
        :at-limit="store.atLimit"
        :disabled="store.sending"
        @toggle="store.toggle"
        @select-first="store.selectFirst"
        @clear="store.clearSelection"
      />

      <BatchStatus
        v-else-if="store.step === 'sent'"
        key="sent"
        :rows="store.batch"
        :username="store.batchUser"
        :finished="store.batchFinished"
        :counts="store.batchCounts"
        :can-open-chat="tg.hasBotLink"
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

    <footer class="mt-auto flex flex-col items-center gap-1 pt-4 text-center text-[12px] text-hint">
      <p>{{ S.footer }}</p>
      <button
        v-if="app.me?.terms_url"
        type="button"
        class="min-h-tap px-3 text-accent"
        @click="tg.openLink(app.me.terms_url)"
      >
        {{ S.terms }}
      </button>
    </footer>
  </main>
</template>
