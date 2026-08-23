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
    <path d="M12 21s7.2-6.2 7.2-11.2A7.2 7.2 0 1 0 4.8 9.8C4.8 14.8 12 21 12 21Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M12 7.7a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</template>
