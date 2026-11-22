<script setup lang="ts">
import { computed } from 'vue'
import { PLATFORM_LABELS } from '@/lib/platforms'
import type { Platform } from '@/types/api'
import PlatformIcon from './PlatformIcon.vue'

const props = withDefaults(
  defineProps<{ platform: Platform; variant?: 'solid' | 'muted'; label?: string }>(),
  { variant: 'muted', label: undefined },
)

const solidClass = computed(
  () =>
    ({
      youtube: 'bg-brand-youtube text-white',
      tiktok: 'bg-brand-tiktok text-white shadow-[inset_3px_0_0_#25F4EE]',
      facebook: 'bg-brand-facebook text-white',
    })[props.platform],
)
</script>

<template>
  <span
    class="inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full pl-1.5 pr-2.5 text-[13px] font-medium"
    :class="variant === 'solid' ? solidClass : 'bg-tg-secondary text-tg-text'"
  >
    <PlatformIcon :platform="platform" :size="18" />
    {{ label ?? PLATFORM_LABELS[platform] }}
  </span>
</template>
