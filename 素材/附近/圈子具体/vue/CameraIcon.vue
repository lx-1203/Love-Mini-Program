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
    <path d="M4 8.5h3l1.5-2h7l1.5 2h2A2 2 0 0 1 21 10.5v7A2 2 0 0 1 19 19.5H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" />
<circle cx="12" cy="14" r="3.2" />
  </svg>
</template>
