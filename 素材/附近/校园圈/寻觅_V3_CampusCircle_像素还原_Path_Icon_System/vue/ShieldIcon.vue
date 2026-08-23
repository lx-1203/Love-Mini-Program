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
    <path d="M12 3.05 19 5.7v5.55c0 4.25-2.7 7.65-7 9.7-4.3-2.05-7-5.45-7-9.7V5.7l7-2.65Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="m8.35 12.05 2.35 2.35 4.95-4.95" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</template>
