<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string; strokeWidth?: number }>(), { size: 24, strokeWidth: 1.8 })
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M12 12a4.1 4.1 0 1 0 0-8.2 4.1 4.1 0 0 0 0 8.2ZM4.2 20.2c.7-3.3 3.5-5.2 7.8-5.2s7.1 1.9 7.8 5.2" fill="none" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round"/>
  </svg>
</template>
