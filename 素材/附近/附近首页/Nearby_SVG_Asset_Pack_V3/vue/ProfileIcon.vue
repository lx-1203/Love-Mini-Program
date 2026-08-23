<script setup lang="ts">
withDefaults(defineProps<{size?:number|string;color?:string;variant?:'outline'|'filled'}>(),{size:24,color:'currentColor',variant:'outline'})
</script>
<template><svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" :stroke="color" :stroke-width="variant==='outline'?1.75:1.25" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3"/><path d="M5 20c.4-4 2.7-6 7-6s6.6 2 7 6"/></svg></template>