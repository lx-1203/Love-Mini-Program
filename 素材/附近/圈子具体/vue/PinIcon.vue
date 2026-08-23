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
    <path d="M7 4h10l-1 5 3 3H4l3-3Z" />
<path d="M12 12v8" />
  </svg>
</template>
