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
    viewBox="0 0 48 24"
    :width="size"
    :height="size"
    fill="none"
    aria-hidden="true"
    :style="{ color }"
  >
    <path d="M7.5 4.5h33A7.5 7.5 0 0 1 48 12v0A7.5 7.5 0 0 1 40.5 19.5h-33A7.5 7.5 0 0 1 0 12v0a7.5 7.5 0 0 1 7.5-7.5Z" fill="var(--icon-primary,#22C997)"/>
    <path d="M8.2 12 11 14.7 16.3 9.4" fill="none" stroke="var(--icon-on-primary,#fff)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</template>
