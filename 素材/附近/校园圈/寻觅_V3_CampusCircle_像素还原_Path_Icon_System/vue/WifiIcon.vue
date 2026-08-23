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
    <path d="M2.5 6.4c5.4-4.35 13.6-4.35 19 0M5.55 10.1c3.65-2.95 9.25-2.95 12.9 0M8.95 13.85c1.75-1.4 4.35-1.4 6.1 0" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round"/>
    <path d="M12 17.15h.01" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
  </svg>
</template>
