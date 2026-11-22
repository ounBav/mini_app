<script setup lang="ts">
import { S } from '@/lib/strings'
import type { BatchRow } from '@/stores/profile'
import Spinner from './Spinner.vue'

defineProps<{
  rows: BatchRow[]
  username: string
  finished: boolean
  counts: { total: number; done: number; failed: number }
  canOpenChat: boolean
}>()

const emit = defineEmits<{ openChat: [] }>()
</script>

<template>
  <section class="flex flex-col gap-3" aria-labelledby="batch-title">
    <div class="card px-5 py-5 text-center">
      <h2 id="batch-title" tabindex="-1" class="text-[20px] font-extrabold">
        {{ finished ? S.batchDoneTitle : S.batchTitle }}
      </h2>
      <p class="mt-1 text-[14px] text-hint">@{{ username }} · {{ S.batchBody }}</p>
      <p class="mt-2 text-[14px] font-bold tabular-nums text-accent" role="status">
        {{ S.batchSummary(counts.done, counts.total, counts.failed) }}
      </p>
      <button
        v-if="canOpenChat"
        type="button"
        class="btn-soft mt-4 w-full"
        @click="emit('openChat')"
      >
        {{ S.openChat }}
      </button>
    </div>

    <ul class="card divide-y divide-line overflow-hidden" role="list">
      <li v-for="row in rows" :key="row.videoId" class="flex items-center gap-3 px-3 py-2.5">
        <div class="h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
          <img
            v-if="row.thumbnail"
            :src="row.thumbnail"
            alt=""
            loading="lazy"
            referrerpolicy="no-referrer"
            class="h-full w-full object-cover"
          />
        </div>
        <p class="line-clamp-2 min-w-0 flex-1 text-[14px] leading-snug">
          {{ row.title || S.untitled }}
        </p>
        <span
          class="flex shrink-0 items-center gap-1.5 text-[12px] font-bold"
          :class="{
            'text-hint': row.status === 'queued' || row.status === 'working',
            'text-accent': row.status === 'done',
            'text-danger': row.status === 'failed',
          }"
        >
          <Spinner v-if="row.status === 'working'" :size="16" />
          {{ S.batchItem[row.status] }}
        </span>
      </li>
    </ul>
  </section>
</template>
