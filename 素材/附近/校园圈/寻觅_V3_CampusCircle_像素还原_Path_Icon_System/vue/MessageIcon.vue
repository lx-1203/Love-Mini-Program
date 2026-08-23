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
    <path d="M5.15 4.15h13.7c.64 0 1.15.51 1.15 1.15v9.55c0 .64-.51 1.15-1.15 1.15H9.05l-4.15 3.35v-3.35h-.75c-.64 0-1.15-.51-1.15-1.15V5.3c0-.64.51-1.15 1.15-1.15h1Z" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linejoin="round"/>
    <path d="M8 10.4h.01M12 10.4h.01M16 10.4h.01" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/>
  </svg>
</template>
