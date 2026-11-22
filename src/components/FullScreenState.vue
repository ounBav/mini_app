<script setup lang="ts">
defineProps<{ title: string; body: string; icon: 'telegram' | 'lock' | 'offline' }>()
</script>

<template>
  <section
    class="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-8 text-center"
    aria-labelledby="fs-title"
  >
    <div
      class="flex h-20 w-20 items-center justify-center rounded-full bg-tg-button-soft text-tg-button"
      aria-hidden="true"
    >
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path
          v-if="icon === 'telegram'"
          d="m21 4-3 15.5c-.2 1-1 1.3-1.8.8l-4.7-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.8 8.8-7.9c.4-.3-.1-.5-.6-.2L5.8 13.4 1.2 12c-1-.3-1-1 .2-1.5L19.7 3.4c.8-.3 1.6.2 1.3.6"
        />
        <template v-else-if="icon === 'lock'">
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </template>
        <path
          v-else
          d="M2 8.8a15 15 0 0 1 20 0M5 12.6a10 10 0 0 1 14 0M8.5 16.4a5 5 0 0 1 7 0M12 20h.01M3 3l18 18"
        />
      </svg>
    </div>
    <h1 id="fs-title" class="text-[22px] font-bold">{{ title }}</h1>
    <p class="max-w-xs text-[15px] leading-relaxed text-tg-hint">{{ body }}</p>
    <div class="flex w-full max-w-xs flex-col gap-2 pt-2">
      <slot />
    </div>
  </section>
</template>
