<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string; strokeWidth?: number }>(), { size: 24, strokeWidth: 1.8 })
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M4.2 7.5h3l1.3-2h6.9l1.3 2h3a1.8 1.8 0 0 1 1.8 1.8v8.5a1.8 1.8 0 0 1-1.8 1.8H4.2a1.8 1.8 0 0 1-1.8-1.8V9.3a1.8 1.8 0 0 1 1.8-1.8Z M12 16.6a3.7 3.7 0 1 0 0-7.4 3.7 3.7 0 0 0 0 7.4Z" fill="none" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round/>
  </svg>
</template>
