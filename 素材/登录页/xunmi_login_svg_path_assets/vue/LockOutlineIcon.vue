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
    <rect x="4.5" y="10" width="15" height="10.5" rx="2.2" fill="none" stroke="#34C38F" stroke-width="1.9"/>
    <path d="M7.8 10V7.2a4.2 4.2 0 0 1 8.4 0V10" fill="none" stroke="#34C38F" stroke-width="1.9" stroke-linecap="round"/>
  </svg>
</template>
