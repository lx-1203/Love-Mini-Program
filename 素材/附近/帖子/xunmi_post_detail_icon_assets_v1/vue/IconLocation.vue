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
    <path d="M12 21s6.2-5.8 6.2-11A6.2 6.2 0 0 0 5.8 10c0 5.2 6.2 11 6.2 11Z" stroke="currentColor" :stroke-width="strokeWidth" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.2" stroke="currentColor" :stroke-width="strokeWidth"/>
  </svg>
</template>
