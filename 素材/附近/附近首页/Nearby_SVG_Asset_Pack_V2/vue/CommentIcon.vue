<script setup lang="ts">
withDefaults(defineProps<{size?:number|string;color?:string}>(),{size:24,color:'#34C38F'})
</script>
<template>
<svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" :style="{color}"><path d="M5 4.5h14a2.5 2.5 0 0 1 2.5 2.5v7a2.5 2.5 0 0 1-2.5 2.5h-7l-4.8 3v-3H5A2.5 2.5 0 0 1 2.5 14V7A2.5 2.5 0 0 1 5 4.5Z" stroke="currentColor" stroke-width="1.7" fill="none"/><circle cx="8" cy="10.5" r=".9"/><circle cx="12" cy="10.5" r=".9"/><circle cx="16" cy="10.5" r=".9"/></svg>
</template>