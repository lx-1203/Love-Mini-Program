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
    <path d="m9 5.5 6.5 6.5L9 18.5" fill="none" stroke="#646A70" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</template>
