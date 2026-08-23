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
    
<path d="M12 3.1L14.2 4.4L16.7 4.35L18 6.5L20.15 7.8L20.1 10.3L21.4 12.5L20.1 14.7L20.15 17.2L18 18.5L16.7 20.65L14.2 20.6L12 21.9L9.8 20.6L7.3 20.65L6 18.5L3.85 17.2L3.9 14.7L2.6 12.5L3.9 10.3L3.85 7.8L6 6.5L7.3 4.35L9.8 4.4L12 3.1Z" fill="currentColor"/>
<path d="M8.7 12.5H15.3" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/>

  </svg>
</template>
