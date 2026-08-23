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
    viewBox="0 0 24 24"
    :width="size"
    :height="size"
    fill="none"
    aria-hidden="true"
    :style="{ color }"
  >
    <path d="M3.5 8.8C8.4 4.6 15.6 4.6 20.5 8.8" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
    <path d="M6.6 12.2c3.1-2.7 7.7-2.7 10.8 0" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
    <path d="M9.8 15.4c1.3-1.1 3.1-1.1 4.4 0" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
    <circle cx="12" cy="18.7" r="1.15" fill="currentColor"/>
  </svg>
</template>
