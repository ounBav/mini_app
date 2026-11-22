<script setup lang="ts">
import { computed, ref } from 'vue'
import { useNow } from '@/composables/useNow'
import { S } from '@/lib/strings'
import Spinner from './Spinner.vue'

const props = defineProps<{ startedAt: number }>()

const now = useNow(ref(true))
const elapsed = computed(() => Math.max(0, Math.floor((now.value - props.startedAt) / 1000)))
</script>

<template>
  <section
    class="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-8 text-center"
    role="status"
    aria-live="polite"
  >
    <Spinner :size="44" />
    <h1 class="text-[20px] font-bold">{{ S.wakeTitle }}</h1>
    <p class="max-w-xs text-[15px] leading-relaxed text-tg-hint">{{ S.wakeBody }}</p>
    <p class="text-[13px] tabular-nums text-tg-hint" aria-hidden="true">
      {{ S.wakeElapsed(elapsed) }}
    </p>
  </section>
</template>
