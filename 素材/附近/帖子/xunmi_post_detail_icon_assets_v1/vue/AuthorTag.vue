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
    <rect x="1.5" y="5" width="21" height="14" rx="7" fill="#E8F8F1"/><path d="M7 12h10" stroke="#16A772" stroke-width="1.4" stroke-linecap="round"/>
  </svg>
</template>
