<script setup lang="ts">
import { ref, watch } from 'vue'
import { formatDuration } from '@/lib/format'
import { S } from '@/lib/strings'
import type { InfoResponse } from '@/types/api'
import PlatformBadge from './PlatformBadge.vue'
import Skeleton from './Skeleton.vue'

const props = defineProps<{ info: InfoResponse | null; loading: boolean }>()

const imgLoaded = ref(false)
const imgFailed = ref(false)

watch(
  () => props.info?.thumbnail,
  () => {
    imgLoaded.value = false
    imgFailed.value = false
  },
)
</script>

<template>
  <article class="card overflow-hidden" :aria-busy="loading">
    <div class="relative aspect-video w-full bg-tg-secondary">
      <Skeleton
        v-if="loading || (info?.thumbnail && !imgLoaded && !imgFailed)"
        class="absolute inset-0"
        rounded="rounded-none"
      />
      <img
        v-if="info?.thumbnail && !imgFailed"
        :src="info.thumbnail"
        :alt="S.thumbnailAlt(info.title)"
        referrerpolicy="no-referrer"
        decoding="async"
        class="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
        :class="imgLoaded ? 'opacity-100' : 'opacity-0'"
        @load="imgLoaded = true"
        @error="imgFailed = true"
      />
      <div
        v-else-if="info && !loading"
        class="absolute inset-0 flex items-center justify-center text-tg-hint"
        aria-hidden="true"
      >
        <svg width="48" height="48" viewBox="0 0 24 24">
          <rect
            x="3"
            y="5"
            width="18"
            height="14"
            rx="3"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          />
          <path d="M10 9.5v5l4.3-2.5z" fill="currentColor" />
        </svg>
      </div>
      <PlatformBadge
        v-if="info"
        :platform="info.platform"
        variant="solid"
        class="absolute left-2.5 top-2.5"
      />
      <span
        v-if="info && info.duration > 0"
        class="absolute bottom-2.5 right-2.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[12px] font-semibold tabular-nums text-white"
      >
        {{ formatDuration(info.duration) }}
      </span>
    </div>

    <div class="flex min-h-[76px] flex-col justify-center gap-1 px-4 py-3">
      <template v-if="loading || !info">
        <Skeleton class="h-[18px] w-11/12" />
        <Skeleton class="h-[18px] w-2/3" />
        <span class="sr-only" role="status">{{ S.readingLink }}</span>
      </template>
      <template v-else>
        <h2 class="line-clamp-2 text-[16px] font-semibold leading-snug" :title="info.title">
          {{ info.title }}
        </h2>
        <p v-if="info.uploader" class="truncate text-[14px] text-tg-hint">
          {{ S.by(info.uploader) }}
        </p>
      </template>
    </div>
  </article>
</template>
