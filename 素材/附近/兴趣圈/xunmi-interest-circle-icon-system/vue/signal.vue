<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string; strokeWidth?: number }>(), { size: 24, strokeWidth: 1.8 })
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M4.5 19.5v-3M9.5 19.5v-6M14.5 19.5V9M19.5 19.5V5" fill="none" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round/>
  </svg>
</template>
