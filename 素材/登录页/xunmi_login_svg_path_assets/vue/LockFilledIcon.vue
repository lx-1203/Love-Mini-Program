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
    <rect x="4.2" y="9.4" width="15.6" height="11.1" rx="2.1" fill="#22C997"/>
    <path d="M7.5 9.4V7.1a4.5 4.5 0 0 1 9 0v2.3" fill="none" stroke="#22C997" stroke-width="2" stroke-linecap="round"/>
  </svg>
</template>
