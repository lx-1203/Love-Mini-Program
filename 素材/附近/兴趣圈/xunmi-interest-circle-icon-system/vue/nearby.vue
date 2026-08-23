<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string; strokeWidth?: number }>(), { size: 24, strokeWidth: 1.8 })
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M12 21s7-6.2 7-11.2a7 7 0 1 0-14 0C5 14.8 12 21 12 21Z M12 12.4a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z" fill="none" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</template>
