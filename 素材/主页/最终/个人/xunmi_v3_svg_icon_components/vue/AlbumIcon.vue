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
    <path d="M4.3 4.3h15.4a1.6 1.6 0 0 1 1.6 1.6v12.2a1.6 1.6 0 0 1-1.6 1.6H4.3a1.6 1.6 0 0 1-1.6-1.6V5.9a1.6 1.6 0 0 1 1.6-1.6Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="m5.5 16.6 4.3-4.2 2.9 2.7 2.5-2.5 3.3 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M8 8.2a1.2 1.2 0 1 0 0 .1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</template>
