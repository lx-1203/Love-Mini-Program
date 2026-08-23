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
    <path d="M12 3.2c2.1 1.5 4.4 2.3 7.2 2.7v5.8c0 4.5-2.5 7.6-7.2 9.1-4.7-1.5-7.2-4.6-7.2-9.1V5.9c2.8-.4 5.1-1.2 7.2-2.7Z" fill="none" stroke="#34C38F" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="m8.2 12 2.4 2.4 5.3-5.3" fill="none" stroke="#34C38F" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</template>
