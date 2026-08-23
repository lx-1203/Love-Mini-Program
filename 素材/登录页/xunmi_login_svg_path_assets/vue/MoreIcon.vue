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
    <circle cx="5" cy="12" r="1.65" fill="currentColor"/>
    <circle cx="12" cy="12" r="1.65" fill="currentColor"/>
    <circle cx="19" cy="12" r="1.65" fill="currentColor"/>
  </svg>
</template>
