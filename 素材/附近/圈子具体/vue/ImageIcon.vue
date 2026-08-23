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
    <rect x="3" y="4" width="18" height="16" rx="2" />
<circle cx="8" cy="9" r="1.2" />
<path d="M4.5 17l4.5-4.5 3.2 3 2.3-2.3 4.5 4.5" />
  </svg>
</template>
