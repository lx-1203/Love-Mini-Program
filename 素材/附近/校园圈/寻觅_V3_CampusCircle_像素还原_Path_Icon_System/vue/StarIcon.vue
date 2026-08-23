<script setup lang="ts">
withDefaults(defineProps<{
  size?: number | string
  color?: string
}>(), {
  size: 24,
  color: 'currentColor'
})
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    :style="{ color }"
    aria-hidden="true"
  >
    <path d="m12 3.25 2.7 5.35 5.9.85-4.3 4.2 1.02 5.9L12 16.75l-5.32 2.8 1.02-5.9-4.3-4.2 5.9-.85L12 3.25Z" fill="currentColor" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/>
  </svg>
</template>
