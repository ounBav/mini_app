<script setup lang="ts">
// Decorative only: three slow-drifting gradient blobs and a faint dot grid behind the UI.
// Radial gradients (not filter: blur) + transform-only animation keep it on the compositor,
// so it stays smooth on low-end Android webviews. Frozen under prefers-reduced-motion.
</script>

<template>
  <div class="scene" aria-hidden="true">
    <div class="blob blob-1" />
    <div class="blob blob-2" />
    <div class="blob blob-3" />
    <div class="dots" />
  </div>
</template>

<style scoped>
.scene {
  position: fixed;
  inset: 0;
  z-index: -10;
  overflow: hidden;
  pointer-events: none;
  background: var(--c-canvas);
}

.blob {
  position: absolute;
  width: 75vmax;
  height: 75vmax;
  border-radius: 50%;
  will-change: transform;
}

.blob-1 {
  top: -38vmax;
  left: -30vmax;
  background: radial-gradient(circle at center, var(--blob-1) 0%, transparent 62%);
  animation: drift-1 22s ease-in-out infinite alternate;
}

.blob-2 {
  top: 8vh;
  right: -42vmax;
  background: radial-gradient(circle at center, var(--blob-2) 0%, transparent 62%);
  animation: drift-2 27s ease-in-out infinite alternate;
}

.blob-3 {
  bottom: -45vmax;
  left: -18vmax;
  background: radial-gradient(circle at center, var(--blob-3) 0%, transparent 62%);
  animation: drift-3 31s ease-in-out infinite alternate;
}

.dots {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(var(--dots) 1px, transparent 1.4px);
  background-size: 22px 22px;
  -webkit-mask-image: radial-gradient(ellipse 120% 60% at 50% 0%, #000 0%, transparent 75%);
  mask-image: radial-gradient(ellipse 120% 60% at 50% 0%, #000 0%, transparent 75%);
}

@keyframes drift-1 {
  0% {
    transform: translate3d(0, 0, 0) scale(1);
  }
  50% {
    transform: translate3d(14vw, 10vh, 0) scale(1.15);
  }
  100% {
    transform: translate3d(-4vw, 18vh, 0) scale(0.95);
  }
}

@keyframes drift-2 {
  0% {
    transform: translate3d(0, 0, 0) scale(1.05);
  }
  50% {
    transform: translate3d(-18vw, 14vh, 0) scale(0.9);
  }
  100% {
    transform: translate3d(-8vw, -10vh, 0) scale(1.12);
  }
}

@keyframes drift-3 {
  0% {
    transform: translate3d(0, 0, 0) scale(0.95);
  }
  50% {
    transform: translate3d(16vw, -16vh, 0) scale(1.1);
  }
  100% {
    transform: translate3d(28vw, -4vh, 0) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .blob {
    animation: none;
  }
}

/* Low-end Android (Telegram performance class LOW): keep the colors, skip the motion. */
:global(:root[data-perf='low']) .blob {
  animation: none;
}
</style>
