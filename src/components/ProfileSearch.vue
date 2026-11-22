<script setup lang="ts">
import { computed, ref } from 'vue'
import { S } from '@/lib/strings'
import type { UsernameCheck } from '@/lib/tiktok'
import { PROFILE_LIMITS } from '@/stores/profile'
import type { ProfileLimit } from '@/types/api'

const props = defineProps<{
  modelValue: string
  limit: ProfileLimit
  check: UsernameCheck
  touched: boolean
  maxVideosHint?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:limit': [value: ProfileLimit]
  submit: []
}>()

const inputEl = ref<HTMLInputElement | null>(null)
const chips = ref<HTMLButtonElement[]>([])

const invalid = computed(
  () => props.check.state === 'invalid' && (props.touched || props.modelValue.length > 2),
)

function clear(): void {
  emit('update:modelValue', '')
  inputEl.value?.focus()
}

function onKey(event: KeyboardEvent): void {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
  if (!step) return
  event.preventDefault()
  const index =
    (PROFILE_LIMITS.indexOf(props.limit) + step + PROFILE_LIMITS.length) % PROFILE_LIMITS.length
  const next = PROFILE_LIMITS[index]
  if (next == null) return
  emit('update:limit', next)
  chips.value[index]?.focus()
}
</script>

<template>
  <form class="flex flex-col gap-2" novalidate @submit.prevent="emit('submit')">
    <div class="card relative mb-3 overflow-hidden px-5 py-6">
      <div
        class="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgba(236,72,153,0.28),rgba(168,85,247,0.1)_55%,transparent)]"
        aria-hidden="true"
      />
      <p class="relative text-[26px] font-extrabold leading-[1.15] tracking-tight">
        {{ S.profileHeroTitle }}<br /><span class="text-gradient">{{ S.profileHeroAccent }}</span>
      </p>
      <p class="relative mt-2 text-[14px] text-hint">{{ S.profileHeroBody }}</p>
    </div>

    <label for="username-input" class="section-label">{{ S.usernameLabel }}</label>
    <div
      class="card flex min-h-[64px] items-center gap-2 py-2 pl-5 pr-2 ring-2 transition duration-200"
      :class="
        invalid
          ? 'ring-danger'
          : 'ring-transparent focus-within:shadow-glow focus-within:ring-primary'
      "
    >
      <input
        id="username-input"
        ref="inputEl"
        :value="modelValue"
        type="text"
        enterkeyhint="search"
        autocomplete="off"
        autocapitalize="off"
        autocorrect="off"
        spellcheck="false"
        :placeholder="S.usernamePlaceholder"
        :aria-invalid="invalid"
        aria-describedby="username-message"
        class="min-w-0 flex-1 bg-transparent py-2 text-[16px] text-ink placeholder:text-hint focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <button
        v-if="modelValue"
        type="button"
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-hint active:opacity-60"
        :aria-label="S.clearUsername"
        @click="clear"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.35" />
          <path
            d="m8.5 8.5 7 7m0-7-7 7"
            stroke="var(--c-surface-solid)"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>
    <p id="username-message" class="min-h-[24px] px-1 text-[13px] text-danger" aria-live="polite">
      {{ invalid ? S.usernameInvalid : '' }}
    </p>

    <p id="limit-label" class="section-label">{{ S.limitLabel }}</p>
    <div
      role="radiogroup"
      aria-labelledby="limit-label"
      class="grid grid-cols-4 gap-2 px-1"
      @keydown="onKey"
    >
      <button
        v-for="opt in PROFILE_LIMITS"
        :key="String(opt)"
        ref="chips"
        type="button"
        role="radio"
        :aria-checked="limit === opt"
        :tabindex="limit === opt ? 0 : -1"
        class="flex min-h-tap items-center justify-center rounded-full px-2 text-[14px] font-bold tabular-nums transition duration-200 active:scale-95"
        :class="limit === opt ? 'bg-brand text-primary-fg shadow-glow' : 'card text-ink'"
        @click="emit('update:limit', opt)"
      >
        {{ S.limitOption(opt) }}
      </button>
    </div>
    <p v-if="limit === 'all' && maxVideosHint" class="px-1 pt-1 text-[13px] text-hint">
      {{ S.limitAllHint(maxVideosHint) }}
    </p>
  </form>
</template>
