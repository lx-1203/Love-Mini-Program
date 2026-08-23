<script setup lang="ts">
withDefaults(defineProps<{size?:number|string;color?:string}>(),{size:24,color:'#34C38F'})
</script>
<template>
<svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" :style="{color}"><path d="m12 3 8 4-8 4-8-4 8-4Z"/><path d="M6.5 10.8v6.3M9.5 12.3v4.8M14.5 12.3v4.8M17.5 10.8v6.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/><path d="M4 18.5h16v2H4z"/></svg>
</template>