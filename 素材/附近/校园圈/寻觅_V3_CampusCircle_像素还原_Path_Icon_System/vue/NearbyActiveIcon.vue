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
    <path d="M12 21.65S4.5 14.55 4.5 9.05A7.5 7.5 0 1 1 19.5 9.05c0 5.5-7.5 12.6-7.5 12.6Z" fill="currentColor"/>
    <path d="M12 6.55a2.45 2.45 0 1 0 0 4.9 2.45 2.45 0 0 0 0-4.9Z" fill="#fff"/>
  </svg>
</template>
