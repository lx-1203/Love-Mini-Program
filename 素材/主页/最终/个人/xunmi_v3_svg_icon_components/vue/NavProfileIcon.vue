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
    <path d="M12 4.2a4.1 4.1 0 1 0 0 8.2 4.1 4.1 0 0 0 0-8.2Z" fill="var(--icon-primary,#20C997)"/>
    <path d="M4.2 20a7.8 7.8 0 0 1 15.6 0" fill="var(--icon-primary,#20C997)"/>
  </svg>
</template>
