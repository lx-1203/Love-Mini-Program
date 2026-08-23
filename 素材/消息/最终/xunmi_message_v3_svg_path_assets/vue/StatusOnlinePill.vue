<script setup lang="ts">
interface Props { text?: string; size?: number | string }
const props = withDefaults(defineProps<Props>(), { text: '在线', size: 16 })
</script>
<template>
  <span class="xn-status" :style="{ fontSize: `${Number(props.size)}px` }">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5.2a6.8 6.8 0 1 0 0 13.6 6.8 6.8 0 0 0 0-13.6Z" fill="#FFFFFF"/>
    </svg>
    <span>{{ props.text }}</span>
  </span>
</template>
<style scoped>
.xn-status{display:inline-flex;align-items:center;gap:.35em;padding:.35em .7em;border-radius:999px;background:#34C38F;color:#fff;font-weight:600;line-height:1}
.xn-status svg{width:1em;height:1em;flex:none}
</style>
