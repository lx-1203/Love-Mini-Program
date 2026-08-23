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
    
<rect x="1" y="2" width="23" height="12" rx="3" stroke="currentColor" stroke-width="1.5"/>
<path d="M26 6V10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
<rect x="3.8" y="4.7" width="16.8" height="6.6" rx="1.4" fill="currentColor"/>

  </svg>
</template>
