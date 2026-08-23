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
    <path d="M12 2.5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" fill="var(--icon-primary,#FF5A7A)"/>
    <path d="M12 12.5v8.25" fill="none" stroke="var(--icon-primary,#FF5A7A)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M8.8 17h6.4" fill="none" stroke="var(--icon-primary,#FF5A7A)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</template>
