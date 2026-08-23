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
    
<path d="M2 14V12.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
<path d="M7 14V9.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
<path d="M12 14V6.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
<path d="M17 14V3.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>

  </svg>
</template>
