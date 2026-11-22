<script setup lang="ts">
import { computed } from 'vue'
import { S } from '@/lib/strings'
import type { MeResponse } from '@/types/api'

const props = defineProps<{ me: MeResponse | null }>()

const usage = computed(() =>
  props.me ? S.usage(props.me.usage_today, props.me.limit_per_day) : null,
)
</script>

<template>
  <header class="flex items-center gap-3">
    <div class="icon-tile h-12 w-12 shrink-0 animate-float" aria-hidden="true">
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19.5h14" />
      </svg>
    </div>
    <div class="min-w-0 flex-1">
      <h1
        class="text-gradient truncate text-[clamp(19px,5.6vw,22px)] font-extrabold leading-tight tracking-tight"
      >
        {{ S.appTitle }}
      </h1>
      <slot />
    </div>
    <span
      v-if="usage && me"
      class="card shrink-0 !rounded-full px-3 py-1.5 text-[12px] font-bold tabular-nums text-accent"
      :aria-label="usage"
    >
      <span aria-hidden="true">
        {{ me.usage_today }}/{{ me.limit_per_day
        }}<span class="ml-1 max-[379px]:hidden">{{ S.usageSuffix }}</span>
      </span>
    </span>
  </header>
</template>
