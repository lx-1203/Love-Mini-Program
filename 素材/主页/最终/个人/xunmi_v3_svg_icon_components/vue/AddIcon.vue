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
    <path d="M5 12h14M12 5v14" fill="none" stroke="var(--icon-primary,#20B98B)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</template>
