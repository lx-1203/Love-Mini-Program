<script setup lang="ts">
withDefaults(defineProps<{ size?: number|string; color?: string; strokeWidth?: number }>(), {
  size: 24,
  color: 'currentColor',
  strokeWidth: 1.7
})
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    :style="{ color }"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="7.5" stroke="currentColor" :stroke-width="strokeWidth"/><path d="M15.5 12.5V9.5M15.5 12.5c0 2-1.2 3.5-3.1 3.5-2.3 0-4-1.8-4-4s1.7-4 4-4c1.9 0 3.1 1.4 3.1 3.5" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round"/><path d="M15.5 12.5c0 2 1 3 2.4 3" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round"/>
  </svg>
</template>
