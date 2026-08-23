<script setup lang="ts">
withDefaults(defineProps<{size?:number|string;color?:string}>(),{size:24,color:'#34C38F'})
</script>
<template>
<svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" :style="{color}"><path d="M12 20s-6.8-4.3-7.7-8.7C3.7 8.3 5.4 5.4 8.4 5.4c1.7 0 3 1 3.6 2.4.6-1.4 1.9-2.4 3.6-2.4 3 0 4.7 2.9 4.1 5.9C18.8 15.7 12 20 12 20Z" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="18.2" cy="18.1" r="3.1" stroke="currentColor" stroke-width="1.4" fill="#fff"/><path d="M18.2 16.6v3M16.7 18.1h3" stroke="currentColor" stroke-width="1.1" fill="none"/></svg>
</template>