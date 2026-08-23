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
    <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"/>
<circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>
<circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none"/>
  </svg>
</template>
