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
    <path d="M4 17.5V20h2.5L18.2 8.3a1.9 1.9 0 0 0 0-2.6l-.9-.9a1.9 1.9 0 0 0-2.6 0L3.9 15.5" />
<path d="M13.5 6.5l4 4" />
  </svg>
</template>
