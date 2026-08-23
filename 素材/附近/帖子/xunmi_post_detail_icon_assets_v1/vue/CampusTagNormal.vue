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
    <rect x="1" y="4.5" width="22" height="15" rx="7.5" fill="#F0EFFF"/><path d="M7.2 12h9.6" stroke="#6B63D9" stroke-width="1.4" stroke-linecap="round"/>
  </svg>
</template>
