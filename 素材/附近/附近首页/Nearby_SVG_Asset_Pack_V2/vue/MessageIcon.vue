<script setup lang="ts">
withDefaults(defineProps<{size?:number|string;color?:string}>(),{size:24,color:'#34C38F'})
</script>
<template>
<svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" :style="{color}"><path d="M4.2 4.5h15.6A2.2 2.2 0 0 1 22 6.7v8.7a2.2 2.2 0 0 1-2.2 2.2H9l-4.9 3v-3.1a2.2 2.2 0 0 1-2-2.1V6.7a2.2 2.2 0 0 1 2.1-2.2Z" stroke="currentColor" stroke-width="1.7" fill="none"/><circle cx="8" cy="11" r="1"/><circle cx="12" cy="11" r="1"/><circle cx="16" cy="11" r="1"/></svg>
</template>