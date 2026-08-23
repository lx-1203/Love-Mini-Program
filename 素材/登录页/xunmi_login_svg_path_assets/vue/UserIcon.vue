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
    <circle cx="12" cy="7.2" r="3.3" fill="none" stroke="#34C38F" stroke-width="1.9"/>
    <path d="M5.2 20.2a6.8 6.8 0 0 1 13.6 0" fill="none" stroke="#34C38F" stroke-width="1.9" stroke-linecap="round"/>
  </svg>
</template>
