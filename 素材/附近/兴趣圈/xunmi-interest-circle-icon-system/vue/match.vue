<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string; strokeWidth?: number }>(), { size: 24, strokeWidth: 1.8 })
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M12 20.2S4.2 15.4 4.2 9.4A4.2 4.2 0 0 1 12 7.1a4.2 4.2 0 0 1 7.8 2.3c0 6-7.8 10.8-7.8 10.8Z M18.3 16.2v5.1M15.75 18.75h5.1" fill="none" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</template>
