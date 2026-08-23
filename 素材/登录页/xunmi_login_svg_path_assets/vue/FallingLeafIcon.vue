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
    <path d="M6.5 14.8C10 14.4 14.2 12.6 17.8 7c.7 3.5-.1 7.2-3 9.7-2.5 2.1-5.3 1.2-8.3-1.9Z" fill="#C8E45D"/>
    <path d="M7.2 14.3c2.4-.6 4.7-2 7-4.3" fill="none" stroke="#A4C94A" stroke-width="1.2" stroke-linecap="round"/>
  </svg>
</template>
