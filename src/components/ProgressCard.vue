<script setup lang="ts">
import { computed } from 'vue'
import { percent } from '@/lib/format'
import { S, type StageKey } from '@/lib/strings'
import type { Job } from '@/types/api'
import PlatformIcon from './PlatformIcon.vue'

const props = defineProps<{
  job: Job
  title: string | null
  cancelling: boolean
  reconnecting: boolean
}>()
defineEmits<{ cancel: [] }>()

const pct = computed(() => percent(props.job.progress))

const stage = computed<StageKey>(() => (props.cancelling ? 'cancelling' : props.job.status))

const stageText = computed(() => {
  if (props.reconnecting) return S.reconnecting
  if (stage.value === 'downloading' && pct.value != null) return S.downloadingPct(pct.value)
  return S.stage[stage.value]
})

/** Downloading with a known fraction shows a real bar; every other stage is indeterminate. */
const determinate = computed(
  () => stage.value === 'downloading' && pct.value != null && pct.value > 0,
)

const formatLabel = computed(() =>
  props.job.format === 'audio' ? 'MP3' : props.job.quality ? `MP4 · ${props.job.quality}p` : 'MP4',
)
</script>

<template>
  <section class="card flex flex-col gap-4 p-4" aria-labelledby="progress-title">
    <div class="flex items-start gap-3">
      <PlatformIcon :platform="job.platform" :size="28" />
      <div class="min-w-0 flex-1">
        <h2
          id="progress-title"
          tabindex="-1"
          class="line-clamp-2 text-[16px] font-semibold leading-snug"
        >
          {{ title || job.url }}
        </h2>
        <p class="text-[13px] text-tg-hint">{{ formatLabel }}</p>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <div class="flex items-baseline justify-between gap-3">
        <p
          class="text-[15px] font-medium"
          :class="reconnecting ? 'text-tg-destructive' : 'text-tg-text'"
          role="status"
          aria-live="polite"
        >
          {{ stageText }}
        </p>
        <span v-if="determinate" class="text-[15px] font-semibold tabular-nums text-tg-hint">
          {{ pct }}%
        </span>
      </div>
      <div
        class="relative h-2 w-full overflow-hidden rounded-full bg-tg-secondary"
        role="progressbar"
        :aria-label="S.stage.downloading"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="determinate ? (pct ?? undefined) : undefined"
        :aria-valuetext="stageText"
      >
        <div
          v-if="determinate"
          class="h-full rounded-full bg-tg-button transition-[width] duration-500 ease-out"
          :style="{ width: `${pct}%` }"
        />
        <div v-else class="indeterminate absolute inset-y-0 w-1/3 rounded-full bg-tg-button" />
      </div>
      <p class="text-[13px] text-tg-hint">{{ S.keepOpen }}</p>
    </div>

    <button type="button" class="btn-danger w-full" :disabled="cancelling" @click="$emit('cancel')">
      {{ cancelling ? S.stage.cancelling : S.cancel }}
    </button>
  </section>
</template>

<style scoped>
.indeterminate {
  animation: slide 1.3s ease-in-out infinite;
}

@keyframes slide {
  0% {
    left: -35%;
  }
  100% {
    left: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .indeterminate {
    left: 0;
    width: 100%;
    opacity: 0.45;
    animation: none;
  }
}
</style>
