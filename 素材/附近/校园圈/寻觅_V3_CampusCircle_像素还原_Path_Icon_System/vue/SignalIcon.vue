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
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    :style="{ color }"
    aria-hidden="true"
  >
    <path d="M3 18V14.5M8.8 18V11M14.6 18V7.5M20.4 18V4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
  </svg>
</template>
