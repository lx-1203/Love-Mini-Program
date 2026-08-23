<script setup lang="ts">
withDefaults(defineProps<{size?:number|string;color?:string}>(),{size:24,color:'#34C38F'})
</script>
<template>
<svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" :style="{color}"><path d="M12 20.4S4.9 16.2 3.6 11.3C2.7 7.7 4.7 4.5 8 4.5c1.8 0 3.2.9 4 2.2.8-1.3 2.2-2.2 4-2.2 3.3 0 5.3 3.2 4.4 6.8C19.1 16.2 12 20.4 12 20.4Z" stroke="currentColor" stroke-width="1.7" fill="none"/><path d="M15.7 15.2h4.1M17.75 13.15v4.1" stroke="currentColor" stroke-width="1.4" fill="none"/></svg>
</template>