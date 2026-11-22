<script setup lang="ts">
defineProps<{ rounded?: string }>()
</script>

<template>
  <div class="skeleton bg-tg-secondary" :class="rounded ?? 'rounded-lg'" aria-hidden="true" />
</template>

<style scoped>
.skeleton {
  position: relative;
  overflow: hidden;
}

.skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--c-hint) 18%, transparent),
    transparent
  );
  animation: shimmer 1.4s ease-in-out infinite;
}

@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton::after {
    display: none;
  }
}
</style>
