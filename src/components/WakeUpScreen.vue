<script setup lang="ts">
import { computed, ref } from 'vue'
import { useNow } from '@/composables/useNow'
import { S } from '@/lib/strings'

const props = defineProps<{ startedAt: number }>()

const now = useNow(ref(true))
const elapsed = computed(() => Math.max(0, Math.floor((now.value - props.startedAt) / 1000)))
</script>

<template>
  <section
    class="flex min-h-[78vh] flex-col items-center justify-center gap-5 px-8 text-center"
    role="status"
    aria-live="polite"
  >
    <!-- Pulsing rings around the brand tile: "something is starting up". -->
    <div class="relative flex h-28 w-28 items-center justify-center" aria-hidden="true">
      <span class="absolute inset-0 animate-ripple rounded-full bg-primary-soft" />
      <span
        class="absolute inset-0 animate-ripple rounded-full bg-primary-soft [animation-delay:1.2s]"
      />
      <div class="icon-tile relative h-20 w-20 rounded-[28px]">
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M12 3v4M12 17v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M3 12h4M17 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"
          />
        </svg>
      </div>
    </div>
    <h1 class="text-gradient text-[22px] font-extrabold">{{ S.wakeTitle }}</h1>
    <p class="max-w-xs text-[15px] leading-relaxed text-hint">{{ S.wakeBody }}</p>
    <span
      class="card rounded-full px-3 py-1 text-[13px] font-semibold tabular-nums text-accent"
      aria-hidden="true"
    >
      {{ S.wakeElapsed(elapsed) }}
    </span>
  </section>
</template>
