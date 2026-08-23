<script setup lang="ts">
withDefaults(defineProps<{size?:number|string;color?:string}>(),{size:24,color:'#34C38F'})
</script>
<template>
<svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" :style="{color}"><path d="m3.5 10.7 8.5-7 8.5 7v9.2a1.6 1.6 0 0 1-1.6 1.6H5.1a1.6 1.6 0 0 1-1.6-1.6v-9.2Z" stroke="currentColor" stroke-width="1.8" fill="none"/><path d="M9.3 21v-6.2h5.4V21" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>
</template>