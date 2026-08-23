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
    <circle cx="12" cy="12" r="9.1" fill="none" stroke="#34C38F" stroke-width="2"/>
    <path d="m7.8 12 2.8 2.8 5.8-6" fill="none" stroke="#34C38F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</template>
