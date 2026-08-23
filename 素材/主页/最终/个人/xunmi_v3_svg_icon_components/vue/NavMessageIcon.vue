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
    <path d="M4 5.2h16a2.3 2.3 0 0 1 2.3 2.3v8.3a2.3 2.3 0 0 1-2.3 2.3h-8.1l-4.4 3v-3H4a2.3 2.3 0 0 1-2.3-2.3V7.5A2.3 2.3 0 0 1 4 5.2Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M7.2 11.6h.1M11.95 11.6h.1M16.7 11.6h.1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</template>
