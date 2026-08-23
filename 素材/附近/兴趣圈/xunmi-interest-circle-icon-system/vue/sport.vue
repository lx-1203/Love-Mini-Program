<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string; strokeWidth?: number }>(), { size: 24, strokeWidth: 1.8 })
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M13.1 5.2a2.1 2.1 0 1 0-4.2 0 2.1 2.1 0 0 0 4.2 0ZM10.7 7.7l-2.4 4.2 3.2 1.9 1.9-2.5 2.4 1.4M8.3 11.9 5.1 12.8M11.5 13.8l-1.4 5.1M9.7 18.9l-2.9 1.1M13.8 11.3l2.9-1.1 2 2.7" fill="none" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round/>
  </svg>
</template>
