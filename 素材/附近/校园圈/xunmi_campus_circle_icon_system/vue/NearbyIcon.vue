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
    
<path d="M12 21C12 21 19 14.3 19 9.2C19 5.22 15.87 2 12 2C8.13 2 5 5.22 5 9.2C5 14.3 12 21 12 21Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
<circle cx="12" cy="9" r="2.4" fill="currentColor"/>

  </svg>
</template>
