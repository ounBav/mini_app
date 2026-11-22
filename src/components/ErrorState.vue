<script setup lang="ts">
import type { ErrorAction } from '@/lib/errors'

defineProps<{
  title: string
  message: string
  /** Small reference code shown for support (e.g. E-PRIVATE). */
  code?: string
  /** Shown as in-card buttons. The primary action lives on Telegram's MainButton. */
  actions?: ErrorAction[]
}>()
</script>

<template>
  <section
    class="card flex flex-col items-center gap-3 px-5 pb-5 pt-7 text-center"
    role="alert"
    aria-labelledby="error-title"
  >
    <div
      class="flex h-20 w-20 animate-pop-in items-center justify-center rounded-[28px] bg-danger-soft text-danger"
      aria-hidden="true"
    >
      <svg width="32" height="32" viewBox="0 0 24 24">
        <path
          d="M12 8v5m0 3.5v.01M10.3 3.9 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </div>
    <h2 id="error-title" tabindex="-1" class="text-[22px] font-extrabold">{{ title }}</h2>
    <p class="text-[15px] leading-relaxed text-hint">{{ message }}</p>
    <p v-if="code" class="text-[12px] tabular-nums text-hint opacity-70">{{ code }}</p>
    <div v-if="actions?.length" class="mt-1 flex w-full flex-col gap-2">
      <button
        v-for="action in actions"
        :key="action.label"
        type="button"
        class="btn-soft w-full"
        :disabled="action.enabled === false"
        @click="action.run"
      >
        {{ action.label }}
      </button>
    </div>
  </section>
</template>
