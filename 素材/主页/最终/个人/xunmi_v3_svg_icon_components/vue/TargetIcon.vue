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
    <path d="M12 3.1a8.9 8.9 0 1 0 0 17.8 8.9 8.9 0 0 0 0-17.8Z" fill="none" stroke="var(--icon-primary,#FF8C2B)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2Z" fill="none" stroke="var(--icon-primary,#FF8C2B)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M12 10.55a1.45 1.45 0 1 0 0 2.9 1.45 1.45 0 0 0 0-2.9Z" fill="var(--icon-primary,#FF8C2B)"/>
  </svg>
</template>
