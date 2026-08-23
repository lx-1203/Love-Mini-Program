<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string; strokeWidth?: number }>(), { size: 24, strokeWidth: 1.8 })
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M3 5h18v14H3zM5.5 3.5h3M15.5 3.5h3" fill="none" stroke="currentColor" :stroke-width="strokeWidth" stroke-linejoin="round/>
  </svg>
</template>
