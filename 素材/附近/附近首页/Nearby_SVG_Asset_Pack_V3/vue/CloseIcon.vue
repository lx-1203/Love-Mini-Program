<script setup lang="ts">
withDefaults(defineProps<{size?:number|string;color?:string;variant?:'outline'|'filled'}>(),{size:24,color:'currentColor',variant:'outline'})
</script>
<template><svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" :stroke="color" :stroke-width="variant==='outline'?1.75:1.25" stroke-linecap="round" stroke-linejoin="round"><path d="m6 6 12 12M18 6 6 18"/></svg></template>