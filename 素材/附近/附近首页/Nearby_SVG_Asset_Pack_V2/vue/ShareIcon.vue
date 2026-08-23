<script setup lang="ts">
withDefaults(defineProps<{size?:number|string;color?:string}>(),{size:24,color:'#34C38F'})
</script>
<template>
<svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" :style="{color}"><path d="M8.3 11.3 18.8 5.8l-1.4 12.5-4.4-3.3-2.5 2.5-.2-5.1-2-1.1Z" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="m10.4 12.4 8.4-6.1" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>
</template>