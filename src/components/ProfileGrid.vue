<script setup lang="ts">
import { reactive } from 'vue'
import { formatDuration } from '@/lib/format'
import { S } from '@/lib/strings'
import { formatCount } from '@/lib/tiktok'
import type { ScanResponse, ProfileVideo } from '@/types/api'

defineProps<{
  scan: ScanResponse
  selected: Set<string>
  count: number
  maxSend: number
  atLimit: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  toggle: [video: ProfileVideo]
  selectFirst: []
  clear: []
}>()

/** Thumbnails that failed to load (TikTok CDN links expire): show the plain tile instead. */
const broken = reactive(new Set<string>())
</script>

<template>
  <section class="flex flex-col gap-3" aria-labelledby="profile-title">
    <header class="card flex items-center gap-3 px-4 py-3">
      <div class="min-w-0 flex-1">
        <h2 id="profile-title" tabindex="-1" class="truncate text-[16px] font-bold">
          @{{ scan.username }}
        </h2>
        <p class="truncate text-[13px] text-hint">
          <template v-if="scan.nickname">{{ scan.nickname }} · </template
          >{{ S.profileCount(scan.count) }}
          <template v-if="scan.truncated"> · {{ S.profileTruncated }}</template>
        </p>
      </div>
      <span
        class="shrink-0 rounded-full bg-primary-soft px-3 py-1 text-[12px] font-bold tabular-nums text-accent"
        aria-live="polite"
      >
        {{ S.selectedCount(count, maxSend) }}
      </span>
    </header>

    <div class="flex items-center justify-between px-1">
      <p class="text-[12px] text-hint">{{ S.oneTimeHint }}</p>
      <button
        type="button"
        class="min-h-tap shrink-0 px-2 text-[14px] font-bold text-accent disabled:opacity-50"
        :disabled="disabled"
        @click="count ? emit('clear') : emit('selectFirst')"
      >
        {{ count ? S.selectNone : S.selectAll(Math.min(maxSend, scan.count)) }}
      </button>
    </div>

    <ul class="grid grid-cols-3 gap-2" role="list">
      <li v-for="video in scan.videos" :key="video.id">
        <button
          type="button"
          role="checkbox"
          :aria-checked="selected.has(video.id)"
          :aria-label="S.selectVideo(video.title || S.untitled)"
          :disabled="disabled"
          class="relative block aspect-[9/16] w-full overflow-hidden rounded-2xl bg-muted text-left ring-2 transition duration-150 active:scale-[0.97]"
          :class="[
            selected.has(video.id) ? 'ring-primary shadow-glow' : 'ring-transparent',
            atLimit && !selected.has(video.id) ? 'opacity-50' : '',
          ]"
          @click="emit('toggle', video)"
        >
          <img
            v-if="video.thumbnail && !broken.has(video.id)"
            :src="video.thumbnail"
            alt=""
            loading="lazy"
            decoding="async"
            referrerpolicy="no-referrer"
            class="absolute inset-0 h-full w-full object-cover"
            @error="broken.add(video.id)"
          />
          <div
            class="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent"
            aria-hidden="true"
          />
          <span
            class="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white/90 transition"
            :class="selected.has(video.id) ? 'bg-brand' : 'bg-black/30'"
            aria-hidden="true"
          >
            <svg v-if="selected.has(video.id)" width="14" height="14" viewBox="0 0 24 24">
              <path
                d="m5 12.5 4.5 4.5L19 7.5"
                fill="none"
                stroke="white"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
          <span
            class="absolute inset-x-1.5 bottom-1.5 flex items-end justify-between gap-1 text-[11px] font-semibold tabular-nums text-white"
            aria-hidden="true"
          >
            <span class="truncate">
              <template v-if="video.view_count != null"
                >▶ {{ formatCount(video.view_count) }}</template
              >
            </span>
            <span v-if="video.duration > 0" class="shrink-0 rounded bg-black/60 px-1">
              {{ formatDuration(video.duration) }}
            </span>
          </span>
        </button>
      </li>
    </ul>
  </section>
</template>
