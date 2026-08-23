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
    <path d="M2.2 12s3.4-6.1 9.8-6.1S21.8 12 21.8 12s-3.4 6.1-9.8 6.1S2.2 12 2.2 12Z" fill="var(--icon-primary,#4A95FF)"/>
    <path d="M12 8.55a3.45 3.45 0 1 0 0 6.9 3.45 3.45 0 0 0 0-6.9Z" fill="var(--icon-on-primary,#fff)"/>
    <path d="M12 10.35a1.65 1.65 0 1 0 0 3.3 1.65 1.65 0 0 0 0-3.3Z" fill="var(--icon-primary,#4A95FF)"/>
  </svg>
</template>
