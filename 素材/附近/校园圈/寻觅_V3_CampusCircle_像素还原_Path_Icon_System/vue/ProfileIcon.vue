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
    <path d="M12 4.15a3.15 3.15 0 1 0 0 6.3 3.15 3.15 0 0 0 0-6.3Z" fill="none" stroke="currentColor" stroke-width="1.55"/>
    <path d="M5.15 20.2c.45-3.75 2.85-6.05 6.85-6.05s6.4 2.3 6.85 6.05" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round"/>
  </svg>
</template>
