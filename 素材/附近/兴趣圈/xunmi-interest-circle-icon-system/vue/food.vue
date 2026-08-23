<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string; strokeWidth?: number }>(), { size: 24, strokeWidth: 1.8 })
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M6 4v7M4.5 4v3.2a1.5 1.5 0 0 0 3 0V4M6 11v9M15 4v16M15 4c2.3 2.2 3.3 5.1 3.3 8h-6.6c0-2.9 1-5.8 3.3-8Z" fill="none" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round/>
  </svg>
</template>
