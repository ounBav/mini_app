<script setup lang="ts">
import { computed } from 'vue'
import { formatBytes, formatWait } from '@/lib/format'
import { S } from '@/lib/strings'
import type { Job } from '@/types/api'

const props = defineProps<{ job: Job | null; now: number; canOpenChat: boolean }>()
defineEmits<{ another: []; openChat: [] }>()

const file = computed(() => props.job?.file ?? null)
const toChat = computed(() => !props.job || props.job.delivery === 'chat')
const secondsLeft = computed(() =>
  file.value ? Math.max(0, (Date.parse(file.value.expires_at) - props.now) / 1000) : 0,
)
const expired = computed(() => !!file.value && secondsLeft.value <= 0)
</script>

<template>
  <section
    class="card flex flex-col items-center gap-4 px-4 pb-4 pt-6 text-center"
    aria-labelledby="done-title"
  >
    <div
      class="flex h-16 w-16 items-center justify-center rounded-full"
      :class="expired ? 'bg-tg-secondary text-tg-hint' : 'bg-tg-button-soft text-tg-button'"
      aria-hidden="true"
    >
      <svg width="34" height="34" viewBox="0 0 24 24">
        <path
          v-if="!expired"
          d="m5 12.5 4.5 4.5L19 7.5"
          fill="none"
          stroke="currentColor"
          stroke-width="2.4"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          v-else
          d="M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
    </div>

    <div class="flex w-full flex-col gap-1">
      <h2 id="done-title" tabindex="-1" class="text-[20px] font-bold">
        {{ toChat ? S.sentTitle : S.readyTitle }}
      </h2>
      <template v-if="file">
        <p class="break-words text-[15px] font-medium">{{ file.name }}</p>
        <p class="text-[14px] tabular-nums text-tg-hint">{{ formatBytes(file.size) }}</p>
      </template>
      <p v-else-if="toChat" class="text-[15px] text-tg-hint">{{ S.sentBody }}</p>
    </div>

    <p
      v-if="file"
      class="w-full rounded-xl bg-tg-secondary px-3 py-2.5 text-[13px]"
      :class="expired ? 'text-tg-destructive' : 'text-tg-hint'"
      aria-live="polite"
    >
      {{ expired ? S.expired : S.expiresIn(formatWait(secondsLeft)) }}
    </p>

    <div class="flex w-full flex-col gap-2">
      <button
        v-if="toChat && canOpenChat"
        type="button"
        class="btn-soft w-full"
        @click="$emit('openChat')"
      >
        {{ S.openChat }}
      </button>
      <button type="button" class="btn-ghost w-full" @click="$emit('another')">
        {{ S.another }}
      </button>
    </div>
  </section>
</template>
