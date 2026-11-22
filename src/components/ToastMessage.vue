<script setup lang="ts">
defineProps<{ message: string | null }>()
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4"
    role="status"
    aria-live="polite"
  >
    <Transition
      enter-active-class="transition duration-200"
      enter-from-class="translate-y-2 opacity-0"
      leave-active-class="transition duration-150"
      leave-to-class="opacity-0"
    >
      <p
        v-if="message"
        class="max-w-sm rounded-2xl bg-brand px-4 py-3 text-center text-[14px] font-semibold text-primary-fg shadow-glow-lg"
      >
        {{ message }}
      </p>
    </Transition>
  </div>
</template>
