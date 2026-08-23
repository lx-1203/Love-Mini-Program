<script setup lang="ts">
withDefaults(defineProps<{size?:number|string;color?:string}>(),{size:24,color:'#34C38F'})
</script>
<template>
<svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" :style="{color}"><circle cx="12" cy="8" r="3.2"/><circle cx="5.8" cy="9.8" r="2.3" opacity=".7"/><circle cx="18.2" cy="9.8" r="2.3" opacity=".7"/><path d="M5 19c.2-3.2 2.5-5.2 7-5.2s6.8 2 7 5.2"/></svg>
</template>