<template>
  <span class="xunmi-status" :class="`xunmi-status--${type}`"><span class="xunmi-status__dot" />{{ text }}</span>
</template>
<script setup lang="ts">
defineProps<{ text: string; type?: 'online' | 'distance' }>()
defineOptions({ name: 'XunmiStatusBadge' })
</script>
<style scoped>
.xunmi-status{display:inline-flex;align-items:center;gap:7px;padding:7px 12px;border-radius:999px;background:#fff;font-size:13px;line-height:18px}.xunmi-status--online{color:#34C38F;box-shadow:0 4px 16px rgba(52,195,143,.1)}.xunmi-status--distance{color:#FF9EAA}.xunmi-status__dot{width:10px;height:10px;border-radius:50%;background:currentColor}
</style>
