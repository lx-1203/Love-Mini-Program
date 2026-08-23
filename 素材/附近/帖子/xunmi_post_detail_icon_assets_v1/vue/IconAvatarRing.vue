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
    <circle cx="12" cy="12" r="10.2" fill="none" stroke="currentColor" stroke-width="1"/><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width=".5" opacity=".35"/>
  </svg>
</template>
