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
    <path d="M12 5v14M5 12h14" />
  </svg>
</template>
