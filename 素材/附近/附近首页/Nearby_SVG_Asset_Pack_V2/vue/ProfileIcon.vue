<script setup lang="ts">
withDefaults(defineProps<{size?:number|string;color?:string}>(),{size:24,color:'#34C38F'})
</script>
<template>
<svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" :style="{color}"><circle cx="12" cy="8" r="3.4" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M5 20c.4-4.2 2.7-6.4 7-6.4s6.6 2.2 7 6.4" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>
</template>