<script setup lang="ts">
import type { Platform } from '@/types/api'

withDefaults(defineProps<{ platform: Platform; size?: number }>(), { size: 20 })
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
    class="shrink-0"
  >
    <template v-if="platform === 'youtube'">
      <rect x="1.5" y="5" width="21" height="14" rx="4.5" fill="#FF0033" />
      <path d="M10 9v6l5.2-3z" fill="#fff" />
    </template>
    <template v-else-if="platform === 'tiktok'">
      <rect x="1" y="1" width="22" height="22" rx="6" fill="#000" />
      <path
        d="M13.9 4.6c.4 1.9 1.7 3.1 3.5 3.3v2.4a6 6 0 0 1-3.5-1.1v5.2a4.3 4.3 0 1 1-4.3-4.3l.7.1v2.5a1.9 1.9 0 1 0 1.2 1.7V4.6z"
        fill="#25F4EE"
        transform="translate(-0.7 -0.5)"
      />
      <path
        d="M13.9 4.6c.4 1.9 1.7 3.1 3.5 3.3v2.4a6 6 0 0 1-3.5-1.1v5.2a4.3 4.3 0 1 1-4.3-4.3l.7.1v2.5a1.9 1.9 0 1 0 1.2 1.7V4.6z"
        fill="#fff"
      />
    </template>
    <template v-else>
      <circle cx="12" cy="12" r="10.5" fill="#0866FF" />
      <path
        d="M13.3 22.4v-8.9h2.3l.4-2.7h-2.7V9.4c0-.8.3-1.3 1.4-1.3H16V5.7a18 18 0 0 0-2-.1c-2 0-3.4 1.2-3.4 3.5v1.7H8.4v2.7h2.2v8.9z"
        fill="#fff"
      />
    </template>
  </svg>
</template>
