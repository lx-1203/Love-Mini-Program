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
    <path d="M9.6 10.1 12.1 4.2c.28-.66 1-.99 1.66-.72.58.24.91.86.78 1.48l-.8 3.74h5.3a2.5 2.5 0 0 1 2.45 3.03l-1.25 6.1A2.95 2.95 0 0 1 17.36 20H10a2.4 2.4 0 0 1-2.4-2.4v-5.1a2.4 2.4 0 0 1 2-2.37Zm-6.35.2h2.15v9.6H3.25a1.05 1.05 0 0 1-1.05-1.05v-7.5c0-.58.47-1.05 1.05-1.05Z" fill="var(--icon-primary,#FFAE42)"/>
  </svg>
</template>
