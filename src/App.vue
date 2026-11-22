<script setup lang="ts">
import { onMounted } from 'vue'
import AnimatedBackground from '@/components/AnimatedBackground.vue'
import DevBottomBar from '@/components/DevBottomBar.vue'
import FullScreenState from '@/components/FullScreenState.vue'
import Skeleton from '@/components/Skeleton.vue'
import ToastMessage from '@/components/ToastMessage.vue'
import WakeUpScreen from '@/components/WakeUpScreen.vue'
import { useTelegram } from '@/composables/useTelegram'
import { CONFIG_PROBLEM } from '@/config'
import { S } from '@/lib/strings'
import { useDownloadStore } from '@/stores/download'
import DownloaderView from '@/views/DownloaderView.vue'

const tg = useTelegram()
const store = useDownloadStore()
const canRun = tg.isTelegram || tg.isDevMock
const origin = typeof location !== 'undefined' ? location.origin : ''
const configProblem = CONFIG_PROBLEM ?? 'missing'

onMounted(() => {
  if (canRun) void store.boot()
})
</script>

<template>
  <div
    class="relative isolate flex min-h-[var(--tg-viewport-stable-height,100vh)] flex-col"
    :class="{ 'pb-32': tg.isDevMock }"
  >
    <AnimatedBackground />

    <FullScreenState v-if="!canRun" icon="telegram" :title="S.outsideTitle" :body="S.outsideBody">
      <button v-if="tg.hasBotLink" type="button" class="btn-primary w-full" @click="tg.openBotChat">
        {{ S.openInTelegram }}
      </button>
    </FullScreenState>

    <template v-else>
      <!-- Same footprint as the paste screen, so nothing jumps when data arrives. -->
      <main
        v-if="store.phase === 'booting'"
        class="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pt-4"
        aria-busy="true"
      >
        <div class="flex flex-col gap-2">
          <Skeleton class="h-7 w-48" />
          <Skeleton class="h-4 w-64" />
        </div>
        <Skeleton class="mt-6 h-14 w-full" rounded="rounded-2xl" />
        <Skeleton class="h-7 w-56" />
      </main>

      <WakeUpScreen v-else-if="store.phase === 'waking'" :started-at="store.wakeStartedAt" />

      <FullScreenState
        v-else-if="store.phase === 'offline'"
        icon="offline"
        :title="S.offlineTitle"
        :body="S.offlineBody"
      >
        <button type="button" class="btn-primary w-full" @click="store.boot">
          {{ S.tryAgain }}
        </button>
      </FullScreenState>

      <FullScreenState
        v-else-if="store.phase === 'blocked'"
        icon="lock"
        :title="S.blockedTitle"
        :body="S.blockedBody"
      >
        <p class="break-words rounded-2xl bg-muted px-3 py-2.5 text-left text-[12px] text-hint">
          {{ S.blockedAdmin(origin) }}
        </p>
        <button type="button" class="btn-primary w-full" @click="store.boot">
          {{ S.tryAgain }}
        </button>
      </FullScreenState>

      <FullScreenState
        v-else-if="store.phase === 'config'"
        icon="offline"
        :title="S.configTitle"
        :body="S.configBody"
      >
        <p class="rounded-2xl bg-muted px-3 py-2.5 text-left text-[12px] text-hint">
          {{ S.configAdmin(configProblem) }}
        </p>
      </FullScreenState>

      <FullScreenState
        v-else-if="store.phase === 'auth'"
        icon="lock"
        :title="S.authTitle"
        :body="S.authBody"
      >
        <button v-if="tg.isTelegram" type="button" class="btn-primary w-full" @click="tg.close">
          {{ S.close }}
        </button>
      </FullScreenState>

      <FullScreenState
        v-else-if="store.phase === 'banned'"
        icon="lock"
        :title="S.bannedTitle"
        :body="S.bannedBody"
      >
        <button v-if="tg.isTelegram" type="button" class="btn-soft w-full" @click="tg.close">
          {{ S.close }}
        </button>
      </FullScreenState>

      <DownloaderView v-else />
    </template>

    <ToastMessage :message="store.toast" />
    <DevBottomBar v-if="tg.isDevMock" />
  </div>
</template>
