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
    <path d="m3.55 7.25 4.35 3.15L12 3.75l4.1 6.65 4.35-3.15-1.8 10.25H5.35L3.55 7.25Z" fill="currentColor" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/>
    <path d="M6.1 20.65h11.8" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/>
  </svg>
</template>
