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
    <path d="M12 20.2 3.9 12.4C.9 9.5 2.2 4.7 6.2 4.1c2.1-.3 4.1.7 5.8 2.7 1.7-2 3.7-3 5.8-2.7 4 .6 5.3 5.4 2.3 8.3L12 20.2Z" fill="currentColor"/>
  </svg>
</template>
