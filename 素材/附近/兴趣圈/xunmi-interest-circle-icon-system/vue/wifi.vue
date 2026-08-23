<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string; strokeWidth?: number }>(), { size: 24, strokeWidth: 1.8 })
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M3.5 9.4a13 13 0 0 1 17 0M6.8 12.8a8.1 8.1 0 0 1 10.4 0M10 16.1a3.3 3.3 0 0 1 4 0M12 19.2h.01" fill="none" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round/>
  </svg>
</template>
