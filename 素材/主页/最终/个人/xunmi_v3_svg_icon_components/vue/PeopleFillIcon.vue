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
    <path d="M8.25 11.2a3.45 3.45 0 1 0 0-6.9 3.45 3.45 0 0 0 0 6.9Zm7.5-.8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.2 19.4v-1.1a5.05 5.05 0 0 1 10.1 0v1.1a1.8 1.8 0 0 1-1.8 1.8H5a1.8 1.8 0 0 1-1.8-1.8Zm10.9-5.2a5.55 5.55 0 0 1 6.7 4.1v1.1a1.8 1.8 0 0 1-1.8 1.8h-2.9v-2.9a6.8 6.8 0 0 0-2-4.1Z" fill="var(--icon-primary,#FF4D78)"/>
  </svg>
</template>
