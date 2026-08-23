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
    
<circle cx="9" cy="8" r="3" stroke="currentColor" stroke-width="1.7"/>
<path d="M3.5 20C3.9 16.4 6 14.3 9 14.3C12 14.3 14.1 16.4 14.5 20" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
<path d="M15.2 5.6C17.6 5.3 19.4 7 19.4 9.1C19.4 10.6 18.5 11.8 17.2 12.4M16.1 14.5C19.1 14.7 20.5 16.6 20.7 19.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>

  </svg>
</template>
