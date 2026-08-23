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
    <path d="M12 20.65S3.25 15.55 3.25 9.2A4.95 4.95 0 0 1 12 6.1a4.95 4.95 0 0 1 8.75 3.1c0 6.35-8.75 11.45-8.75 11.45Z" fill="var(--icon-primary,#A66BFF)"/>
  </svg>
</template>
