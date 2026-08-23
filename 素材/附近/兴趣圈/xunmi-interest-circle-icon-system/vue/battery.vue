<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string; strokeWidth?: number }>(), { size: 24, strokeWidth: 1.8 })
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M4 7.2h16a1.5 1.5 0 0 1 1.5 1.5v6.6a1.5 1.5 0 0 1-1.5 1.5H4a1.5 1.5 0 0 1-1.5-1.5V8.7A1.5 1.5 0 0 1 4 7.2ZM21.5 10.2H23v3.6h-1.5" fill="none" stroke="currentColor" :stroke-width="strokeWidth" stroke-linejoin="round/>
  </svg>
</template>
