<script setup lang="ts">
withDefaults(defineProps<{size?:number|string;color?:string;variant?:'outline'|'filled'}>(),{size:24,color:'currentColor',variant:'outline'})
</script>
<template><svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" :stroke="color" :stroke-width="variant==='outline'?1.75:1.25" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20S4 15.3 3.5 9.8C3.1 6.8 5 4.5 7.8 4.5c1.8 0 3.3 1 4.2 2.4.9-1.4 2.4-2.4 4.2-2.4 2.8 0 4.7 2.3 4.3 5.3C19.9 15.3 12 20 12 20Z"/></svg></template>