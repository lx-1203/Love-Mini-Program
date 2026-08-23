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
    
<path d="M3 12H7L9.3 6L13 18L15.7 10L17.2 12H21" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>

  </svg>
</template>
