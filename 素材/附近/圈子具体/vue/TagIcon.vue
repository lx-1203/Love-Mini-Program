<script setup lang="ts">
withDefaults(defineProps<{
  size?: number | string
  strokeWidth?: number
  title?: string
}>(), {
  size: 24,
  strokeWidth: 1.8,
  title: undefined
})
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    role="img"
    :aria-hidden="title ? undefined : true"
    :aria-label="title"
  >
    <path d="M4 6.2A2.2 2.2 0 0 1 6.2 4h5.1a2 2 0 0 1 1.4.6l6.7 6.7a2 2 0 0 1 0 2.8l-5.3 5.3a2 2 0 0 1-2.8 0l-6.7-6.7A2 2 0 0 1 4 11.3Z" />
<circle cx="8" cy="8" r="1.1" />
  </svg>
</template>
