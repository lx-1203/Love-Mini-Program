<script setup lang="ts">
withDefaults(defineProps<{size?:number|string;color?:string}>(),{size:24,color:'#34C38F'})
</script>
<template>
<svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" :style="{color}"><path d="M12 20.2S4 15.3 3.3 9.8C2.9 6.7 4.9 4.4 7.7 4.4c1.8 0 3.3 1 4.3 2.4 1-1.4 2.5-2.4 4.3-2.4 2.8 0 4.8 2.3 4.4 5.4C20 15.3 12 20.2 12 20.2Z" stroke="currentColor" stroke-width="1.7" fill="none"/></svg>
</template>