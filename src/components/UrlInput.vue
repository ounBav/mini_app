<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTelegram } from '@/composables/useTelegram'
import { PLATFORM_LABELS, PLATFORM_ORDER } from '@/lib/platforms'
import { S } from '@/lib/strings'
import { checkLink, type LinkCheck } from '@/lib/url'
import type { PlatformInfo } from '@/types/api'
import PlatformBadge from './PlatformBadge.vue'

const props = defineProps<{
  modelValue: string
  check: LinkCheck
  platforms: PlatformInfo[]
  touched: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  submit: []
}>()

const tg = useTelegram()
const inputEl = ref<HTMLInputElement | null>(null)
const pasteHint = ref(false)

const message = computed<{ text: string; tone: 'ok' | 'error' } | null>(() => {
  const c = props.check
  if (c.state === 'ok') return { text: S.detected(PLATFORM_LABELS[c.platform]), tone: 'ok' }
  if (c.state === 'unsupported') return { text: S.notSupported, tone: 'error' }
  if (c.state === 'invalid' && (props.touched || props.modelValue.length > 8)) {
    return { text: S.noLink, tone: 'error' }
  }
  if (pasteHint.value) return { text: S.pasteHint, tone: 'ok' }
  return null
})

const invalid = computed(() => message.value?.tone === 'error')

function onInput(event: Event): void {
  pasteHint.value = false
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}

async function paste(): Promise<void> {
  const text = await tg.readClipboard()
  if (!text) {
    pasteHint.value = true
    inputEl.value?.focus()
    return
  }
  pasteHint.value = false
  emit('update:modelValue', text.trim())
  // A pasted, supported link goes straight to the preview.
  if (checkLink(text, props.platforms).state === 'ok') emit('submit')
}

function clear(): void {
  emit('update:modelValue', '')
  inputEl.value?.focus()
}
</script>

<template>
  <form class="flex flex-col gap-2" novalidate @submit.prevent="emit('submit')">
    <label for="url-input" class="section-label">{{ S.linkLabel }}</label>
    <div
      class="card flex min-h-[56px] items-center gap-2 py-1.5 pl-4 pr-1.5 ring-1 transition-shadow"
      :class="invalid ? 'ring-tg-destructive' : 'ring-transparent focus-within:ring-tg-button'"
    >
      <input
        id="url-input"
        ref="inputEl"
        :value="modelValue"
        type="url"
        inputmode="url"
        enterkeyhint="go"
        autocomplete="off"
        autocapitalize="off"
        autocorrect="off"
        spellcheck="false"
        :placeholder="S.linkPlaceholder"
        :aria-invalid="invalid"
        aria-describedby="url-message"
        class="min-w-0 flex-1 bg-transparent py-2 text-[16px] text-tg-text placeholder:text-tg-hint focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
        @input="onInput"
      />
      <button
        v-if="modelValue"
        type="button"
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-tg-hint active:opacity-60"
        :aria-label="S.clear"
        @click="clear"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.35" />
          <path
            d="m8.5 8.5 7 7m0-7-7 7"
            stroke="var(--c-section)"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </button>
      <button v-else type="button" class="btn-soft shrink-0 px-3.5" @click="paste">
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M9 4h6v3H9zM8 5.5H6.5A1.5 1.5 0 0 0 5 7v12.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V7a1.5 1.5 0 0 0-1.5-1.5H16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linejoin="round"
          />
        </svg>
        {{ S.paste }}
      </button>
    </div>

    <p
      id="url-message"
      class="flex min-h-[28px] items-center gap-2 px-4 text-[13px]"
      :class="message?.tone === 'error' ? 'text-tg-destructive' : 'text-tg-hint'"
      aria-live="polite"
    >
      <PlatformBadge
        v-if="check.state === 'ok'"
        :platform="check.platform"
        variant="solid"
        :label="message?.text"
      />
      <template v-else-if="message">{{ message.text }}</template>
    </p>

    <div class="flex flex-wrap items-center gap-2 px-4 pt-2">
      <span class="text-[13px] text-tg-hint">{{ S.supported }}</span>
      <PlatformBadge v-for="p in PLATFORM_ORDER" :key="p" :platform="p" />
    </div>
  </form>
</template>
