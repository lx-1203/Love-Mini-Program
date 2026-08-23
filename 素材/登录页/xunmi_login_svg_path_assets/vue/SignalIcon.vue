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
    <path d="M3.5 20.5h3V16h-3zM9 20.5h3V12H9zM14.5 20.5h3V7.5h-3zM20 20.5h1.5V3.5H20z" fill="currentColor"/>
  </svg>
</template>
