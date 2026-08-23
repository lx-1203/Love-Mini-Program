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
    <path d="M8 5.2v13.6a1.2 1.2 0 0 0 1.9 1l8.8-6.8a1.3 1.3 0 0 0 0-2L9.9 4.2a1.2 1.2 0 0 0-1.9 1Z" fill="currentColor" stroke="none"/>
  </svg>
</template>
