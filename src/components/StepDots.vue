<script setup lang="ts">
import { computed } from 'vue'
import { S } from '@/lib/strings'
import type { FailedOp, Step } from '@/stores/download'

const props = defineProps<{ step: Step; errorOp?: FailedOp | null }>()

const INDEX: Record<Exclude<Step, 'error'>, number> = { input: 0, preview: 1, progress: 2, done: 3 }
/** An error sits on the step that failed: reading the link is step 2, downloading is step 3. */
const current = computed(() =>
  props.step === 'error' ? (props.errorOp === 'info' ? 1 : 2) : INDEX[props.step],
)
const failed = computed(() => props.step === 'error')
</script>

<template>
  <ol class="flex items-center gap-1.5" :aria-label="S.stepsLabel">
    <li
      v-for="(label, i) in S.steps"
      :key="label"
      class="flex items-center"
      :aria-current="i === current ? 'step' : undefined"
    >
      <span
        class="block h-1.5 rounded-full transition-all duration-500 ease-out"
        :class="
          i === current
            ? ['w-8', failed ? 'bg-danger' : 'bg-brand']
            : i < current
              ? 'w-3 bg-primary opacity-60'
              : 'w-3 bg-muted'
        "
        aria-hidden="true"
      />
      <span class="sr-only">{{ label }}</span>
    </li>
  </ol>
</template>
