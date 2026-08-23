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
    <rect x="2.5" y="6" width="19" height="12" rx="6" stroke="currentColor" stroke-width="1.5"/><path d="M12 9v6M9 12h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>
</template>
