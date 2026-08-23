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
    
<path d="M3 8.2L12 3.8L21 8.2L12 12.6L3 8.2Z" fill="currentColor"/>
<path d="M6.5 10.2V15.1C9.5 17.6 14.5 17.6 17.5 15.1V10.2" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
<path d="M21 8.2V13.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>

  </svg>
</template>
