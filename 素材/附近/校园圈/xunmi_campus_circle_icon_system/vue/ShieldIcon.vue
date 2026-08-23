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
    
<path d="M12 3L19 5.7V11.3C19 15.7 16.2 19.1 12 21C7.8 19.1 5 15.7 5 11.3V5.7L12 3Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
<path d="M8.6 12.1L10.9 14.4L15.6 9.7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>

  </svg>
</template>
