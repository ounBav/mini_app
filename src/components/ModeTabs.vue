<script setup lang="ts">
import { ref } from 'vue'
import { S } from '@/lib/strings'
import type { Mode } from '@/stores/download'

const props = defineProps<{ modelValue: Mode }>()
const emit = defineEmits<{ 'update:modelValue': [value: Mode] }>()

const tabs: { value: Mode; label: string }[] = [
  { value: 'link', label: S.modeLink },
  { value: 'profile', label: S.modeProfile },
]
const buttons = ref<HTMLButtonElement[]>([])

function onKey(event: KeyboardEvent): void {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
  event.preventDefault()
  const next: Mode = props.modelValue === 'link' ? 'profile' : 'link'
  emit('update:modelValue', next)
  buttons.value[next === 'link' ? 0 : 1]?.focus()
}
</script>

<template>
  <div
    role="tablist"
    :aria-label="S.modesLabel"
    class="card grid grid-cols-2 gap-1 !rounded-2xl p-1"
    @keydown="onKey"
  >
    <button
      v-for="tab in tabs"
      :key="tab.value"
      ref="buttons"
      type="button"
      role="tab"
      :aria-selected="modelValue === tab.value"
      :tabindex="modelValue === tab.value ? 0 : -1"
      class="min-h-[40px] rounded-xl px-3 text-[14px] font-bold transition duration-200"
      :class="
        modelValue === tab.value
          ? 'bg-brand text-primary-fg shadow-glow'
          : 'text-hint active:bg-muted'
      "
      @click="emit('update:modelValue', tab.value)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>
