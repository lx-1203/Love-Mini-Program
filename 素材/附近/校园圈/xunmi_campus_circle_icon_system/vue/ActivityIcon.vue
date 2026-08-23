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
    
<rect x="6" y="3" width="12" height="18" rx="2" stroke="currentColor" stroke-width="1.7"/>
<path d="M9 7H15M9 11H15M9 15H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>

  </svg>
</template>
