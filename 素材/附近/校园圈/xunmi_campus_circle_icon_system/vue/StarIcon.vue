<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string; strokeWidth?: number }>(), {
  size: 24,
  strokeWidth: 1.8,
})
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    
<path d="M12 3.1L14.7 8.5L20.7 9.4L16.35 13.65L17.4 19.65L12 16.8L6.6 19.65L7.65 13.65L3.3 9.4L9.3 8.5L12 3.1Z" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>

  </svg>
</template>
