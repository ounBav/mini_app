<script setup lang="ts">
import { ref } from 'vue'
import { S } from '@/lib/strings'
import type { MediaFormat } from '@/types/api'

const props = defineProps<{ modelValue: MediaFormat; videoDisabled: boolean; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: MediaFormat] }>()

const options: { value: MediaFormat; label: string; hint: string }[] = [
  { value: 'video', label: S.video, hint: S.videoHint },
  { value: 'audio', label: S.audio, hint: S.audioHint },
]
const buttons = ref<HTMLButtonElement[]>([])

function isDisabled(value: MediaFormat): boolean {
  return props.disabled === true || (value === 'video' && props.videoDisabled)
}

function select(value: MediaFormat): void {
  if (!isDisabled(value)) emit('update:modelValue', value)
}

/** Radio-group keyboard pattern: arrows move and select. */
function onKey(event: KeyboardEvent): void {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
  event.preventDefault()
  const next: MediaFormat = props.modelValue === 'video' ? 'audio' : 'video'
  if (isDisabled(next)) return
  select(next)
  buttons.value[next === 'video' ? 0 : 1]?.focus()
}
</script>

<template>
  <div>
    <p id="format-label" class="section-label">{{ S.formatLabel }}</p>
    <div
      role="radiogroup"
      aria-labelledby="format-label"
      class="card grid grid-cols-2 gap-1 p-1"
      @keydown="onKey"
    >
      <button
        v-for="opt in options"
        :key="opt.value"
        ref="buttons"
        type="button"
        role="radio"
        :aria-checked="modelValue === opt.value"
        :tabindex="modelValue === opt.value ? 0 : -1"
        :disabled="isDisabled(opt.value)"
        class="flex min-h-[52px] flex-col items-center justify-center rounded-xl px-3 transition-colors disabled:opacity-40"
        :class="
          modelValue === opt.value
            ? 'bg-tg-button text-tg-button-text'
            : 'text-tg-text active:bg-tg-secondary'
        "
        @click="select(opt.value)"
      >
        <span class="text-[15px] font-semibold">{{ opt.label }}</span>
        <span
          class="text-[12px]"
          :class="modelValue === opt.value ? 'opacity-80' : 'text-tg-hint'"
          >{{ opt.hint }}</span
        >
      </button>
    </div>
  </div>
</template>
