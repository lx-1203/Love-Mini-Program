<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string; strokeWidth?: number }>(), { size: 24, strokeWidth: 1.8 })
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M5 4.5h5v5H5zM14 4.5h5v5h-5zM5 14h5v5H5zM14 14h5v5h-5z" fill="none" stroke="currentColor" :stroke-width="strokeWidth" stroke-linejoin="round/>
  </svg>
</template>
