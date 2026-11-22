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

const RADIUS = 62
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const pct = computed(() => percent(props.job.progress))
const stage = computed<StageKey>(() => (props.cancelling ? 'cancelling' : props.job.status))

const stageText = computed(() => {
  if (props.reconnecting) return S.reconnecting
  if (stage.value === 'downloading' && pct.value != null) return S.downloadingPct(pct.value)
  return S.stage[stage.value]
})

/** Downloading with a known fraction fills the ring; every other stage spins. */
const determinate = computed(
  () => stage.value === 'downloading' && pct.value != null && pct.value > 0,
)
const dashOffset = computed(() =>
  determinate.value ? CIRCUMFERENCE * (1 - (pct.value ?? 0) / 100) : CIRCUMFERENCE * 0.72,
)

const formatLabel = computed(() =>
  props.job.format === 'audio' ? 'MP3' : props.job.quality ? `MP4 · ${props.job.quality}p` : 'MP4',
)
</script>

<template>
  <section
    class="card flex flex-col items-center gap-5 px-5 pb-5 pt-7"
    aria-labelledby="progress-title"
  >
    <div
      class="relative h-[156px] w-[156px]"
      role="progressbar"
      :aria-label="S.stage.downloading"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="determinate ? (pct ?? undefined) : undefined"
      :aria-valuetext="stageText"
    >
      <!-- soft halo behind the ring -->
      <div class="absolute inset-3 rounded-full bg-brand-soft blur-xl" aria-hidden="true" />
      <svg viewBox="0 0 156 156" class="relative h-full w-full -rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id="ring-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#F472B6" />
            <stop offset="55%" stop-color="#DB2777" />
            <stop offset="100%" stop-color="#A21CAF" />
          </linearGradient>
        </defs>
        <circle cx="78" cy="78" :r="RADIUS" fill="none" stroke="var(--c-muted)" stroke-width="12" />
        <circle
          cx="78"
          cy="78"
          :r="RADIUS"
          fill="none"
          stroke="url(#ring-gradient)"
          stroke-width="12"
          stroke-linecap="round"
          :stroke-dasharray="CIRCUMFERENCE"
          :stroke-dashoffset="dashOffset"
          class="origin-center"
          :class="determinate ? 'ring-fill' : 'ring-spin'"
        />
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center">
        <template v-if="determinate">
          <span class="text-gradient text-[34px] font-extrabold tabular-nums leading-none">
            {{ pct }}<span class="text-[18px]">%</span>
          </span>
        </template>
        <svg
          v-else
          width="34"
          height="34"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--c-primary)"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="animate-float"
          aria-hidden="true"
        >
          <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19.5h14" />
        </svg>
      </div>
    </div>

    <p
      class="text-center text-[16px] font-semibold"
      :class="reconnecting ? 'text-danger' : 'text-ink'"
      role="status"
      aria-live="polite"
    >
      {{ stageText }}
    </p>

    <div class="flex w-full items-center gap-3 rounded-2xl bg-muted p-3">
      <PlatformIcon :platform="job.platform" :size="28" />
      <div class="min-w-0 flex-1">
        <h2
          id="progress-title"
          tabindex="-1"
          class="line-clamp-2 text-[14px] font-semibold leading-snug"
        >
          {{ title || job.url }}
        </h2>
        <p class="text-[12px] font-medium text-accent">{{ formatLabel }}</p>
      </div>
    </div>

    <p class="text-center text-[13px] text-hint">{{ S.keepOpen }}</p>

    <button type="button" class="btn-danger w-full" :disabled="cancelling" @click="$emit('cancel')">
      {{ cancelling ? S.stage.cancelling : S.cancel }}
    </button>
  </section>
</template>

<style scoped>
.ring-fill {
  transition: stroke-dashoffset 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

.ring-spin {
  transform-box: fill-box;
  animation: ring-rotate 1.1s linear infinite;
}

@keyframes ring-rotate {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ring-spin {
    animation: none;
  }
}
</style>
