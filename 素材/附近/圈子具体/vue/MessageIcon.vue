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
    <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5c-1.1 0-2.2-.2-3.1-.7L4 20l1.7-4.8A7.5 7.5 0 1 1 20 11.5Z" />
<circle cx="9" cy="11.5" r="0.9" fill="currentColor" stroke="none"/>
<circle cx="12.5" cy="11.5" r="0.9" fill="currentColor" stroke="none"/>
<circle cx="16" cy="11.5" r="0.9" fill="currentColor" stroke="none"/>
  </svg>
</template>
