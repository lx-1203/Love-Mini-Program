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
    <rect x="3" y="4" width="18" height="16" rx="2.4" stroke="currentColor" :stroke-width="strokeWidth"/><path d="m4.5 16 4.6-4.6 3.5 3.4 2.7-2.7 4.2 4.2" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16.8" cy="8.2" r="1.5" stroke="currentColor" :stroke-width="strokeWidth"/>
  </svg>
</template>
