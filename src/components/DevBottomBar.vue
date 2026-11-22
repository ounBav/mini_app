<script setup lang="ts">
import { useTelegram } from '@/composables/useTelegram'
import { S } from '@/lib/strings'

// Browser-only stand-in for Telegram's MainButton and BackButton (npm run dev outside Telegram).
const tg = useTelegram()
</script>

<template>
  <div
    class="fixed inset-x-0 bottom-0 z-20 flex flex-col gap-2 border-t border-tg-separator bg-tg-bg px-4 pb-4 pt-2"
  >
    <p class="text-center text-[11px] uppercase tracking-wide text-tg-hint">{{ S.devMock }}</p>
    <div class="flex gap-2">
      <button
        v-if="tg.backButton.visible"
        type="button"
        class="btn-soft"
        :aria-label="S.back"
        @click="tg.clickBack()"
      >
        ←
      </button>
      <button
        v-if="tg.mainButton.visible"
        type="button"
        class="btn-primary flex-1"
        :disabled="!tg.mainButton.enabled || tg.mainButton.loading"
        @click="tg.clickMain()"
      >
        <span
          v-if="tg.mainButton.loading"
          class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
        {{ tg.mainButton.text }}
      </button>
    </div>
  </div>
</template>
