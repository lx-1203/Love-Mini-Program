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
    <path d="M12 2.8 19.2 5v6.2c0 4.3-2.8 8.1-7.2 10-4.4-1.9-7.2-5.7-7.2-10V5L12 2.8Z" fill="currentColor"/><path d="m8.2 11.6 2.4 2.4 5.3-5.3" stroke="#fff" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</template>
