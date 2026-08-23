<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string; strokeWidth?: number }>(), { size: 24, strokeWidth: 1.8 })
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M4 6h16M4 12h16M4 18h16" fill="none" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round"/>
  </svg>
</template>
