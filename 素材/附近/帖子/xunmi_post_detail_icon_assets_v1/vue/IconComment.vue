<script setup lang="ts">
withDefaults(defineProps<{ size?: number|string; color?: string; strokeWidth?: number }>(), {
  size: 24,
  color: 'currentColor',
  strokeWidth: 1.7
})
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    :style="{ color }"
    aria-hidden="true"
  >
    <path d="M5.1 18.3c-1.3-1.5-2.1-3.5-2.1-5.7C3 7.9 7 4.5 12 4.5s9 3.4 9 8.1-4 8.1-9 8.1c-1.1 0-2.2-.2-3.2-.5L5 21l.7-2.7c-.2-.0-.4-.0-.6-.0Z" stroke="currentColor" :stroke-width="strokeWidth" stroke-linejoin="round"/><circle cx="8" cy="12.6" r=".9" fill="currentColor"/><circle cx="12" cy="12.6" r=".9" fill="currentColor"/><circle cx="16" cy="12.6" r=".9" fill="currentColor"/>
  </svg>
</template>
