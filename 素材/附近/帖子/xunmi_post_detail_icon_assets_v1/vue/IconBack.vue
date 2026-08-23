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
    <path d="M15.5 4.5 7 12l8.5 7.5" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</template>
