<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string; strokeWidth?: number }>(), { size: 24, strokeWidth: 1.8 })
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M5 4.8h14a2 2 0 0 1 2 2v8.4a2 2 0 0 1-2 2H11l-4.5 3v-3H5a2 2 0 0 1-2-2V6.8a2 2 0 0 1 2-2Z M8 11.2h.01M12 11.2h.01M16 11.2h.01" fill="none" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</template>
