<script setup lang="ts">
import { ref } from 'vue'
import { S } from '@/lib/strings'
import type { Quality } from '@/types/api'

const props = defineProps<{
  qualities: Quality[]
  modelValue: Quality | null
  disabled?: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [value: Quality] }>()

const chips = ref<HTMLButtonElement[]>([])

function onKey(event: KeyboardEvent): void {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
  if (!step || props.disabled || !props.qualities.length) return
  event.preventDefault()
  const current = props.modelValue == null ? -1 : props.qualities.indexOf(props.modelValue)
  const index = (current + step + props.qualities.length) % props.qualities.length
  const next = props.qualities[index]
  if (next == null) return
  emit('update:modelValue', next)
  chips.value[index]?.focus()
}
</script>

<template>
  <div v-if="qualities.length">
    <p id="quality-label" class="section-label">{{ S.qualityLabel }}</p>
    <div
      role="radiogroup"
      aria-labelledby="quality-label"
      class="flex flex-wrap gap-2 px-1"
      @keydown="onKey"
    >
      <button
        v-for="q in qualities"
        :key="q"
        ref="chips"
        type="button"
        role="radio"
        :aria-checked="modelValue === q"
        :tabindex="modelValue === q || (modelValue == null && q === qualities[0]) ? 0 : -1"
        :disabled="disabled"
        class="flex min-h-tap min-w-[72px] items-center justify-center gap-1 rounded-full px-4 text-[15px] font-bold tabular-nums transition duration-200 active:scale-95 disabled:opacity-50"
        :class="modelValue === q ? 'bg-brand text-primary-fg shadow-glow' : 'card text-ink'"
        @click="emit('update:modelValue', q)"
      >
        {{ q }}p
        <span
          v-if="q >= 720"
          class="rounded px-1 text-[10px] font-bold leading-4"
          :class="modelValue === q ? 'bg-white/25 text-white' : 'bg-primary-soft text-accent'"
          >HD</span
        >
      </button>
    </div>
  </div>
</template>
