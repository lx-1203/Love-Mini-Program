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
    
<path d="M2.5 5.3C7.9 0.9 16.1 0.9 21.5 5.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
<path d="M5.5 9C9.2 6 14.8 6 18.5 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
<path d="M9 12.7C10.8 11.2 13.2 11.2 15 12.7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
<circle cx="12" cy="15.3" r="1.2" fill="currentColor"/>

  </svg>
</template>
