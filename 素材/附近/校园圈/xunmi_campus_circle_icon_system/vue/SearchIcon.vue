<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string; strokeWidth?: number }>(), {
  size: 24,
  strokeWidth: 1.8,
})
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    
<circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" stroke-width="1.8"/>
<path d="M16 16L21 21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>

  </svg>
</template>
