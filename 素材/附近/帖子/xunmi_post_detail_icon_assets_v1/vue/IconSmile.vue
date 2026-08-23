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
    <circle cx="12" cy="12" r="8.5" stroke="currentColor" :stroke-width="strokeWidth"/><circle cx="9" cy="10" r=".9" fill="currentColor"/><circle cx="15" cy="10" r=".9" fill="currentColor"/><path d="M8.5 13.5c1 2 2.3 3 3.5 3s2.5-1 3.5-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>
</template>
