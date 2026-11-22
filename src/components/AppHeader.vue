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
    <img
      src="/logo-96.png"
      alt=""
      width="48"
      height="48"
      decoding="async"
      class="h-12 w-12 shrink-0 animate-float rounded-full shadow-glow"
      aria-hidden="true"
    />
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
