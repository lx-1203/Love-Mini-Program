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
    <path d="m3.15 8.25 8.85-4.3 8.85 4.3-8.85 4.3-8.85-4.3Z" fill="currentColor"/>
    <path d="M6.35 10.1v4.75c3.05 2.4 8.25 2.4 11.3 0V10.1" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linejoin="round"/>
    <path d="M20.85 8.25v5.1" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"/>
    <path d="M20.85 13.35c-.6.1-.95.55-.95 1.05 0 .6.45 1.05 1.05 1.05.6 0 1.05-.45 1.05-1.05 0-.5-.4-.95-1.15-1.05Z" fill="currentColor"/>
  </svg>
</template>
