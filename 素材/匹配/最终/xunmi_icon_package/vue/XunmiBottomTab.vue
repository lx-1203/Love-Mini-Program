<template>
  <button class="xunmi-tab" :class="{active}" type="button">
    <span class="xunmi-tab__icon"><slot /></span>
    <span class="xunmi-tab__label">{{ label }}</span>
    <span v-if="badge" class="xunmi-tab__badge">{{ badge }}</span>
  </button>
</template>
<script setup lang="ts">
defineProps<{ label: string; active?: boolean; badge?: number | string }>()
defineOptions({ name: 'XunmiBottomTab' })
</script>
<style scoped>
.xunmi-tab{position:relative;display:flex;flex-direction:column;align-items:center;gap:5px;border:0;background:transparent;color:#A8ADB7;font:inherit}.xunmi-tab.active{color:#34C38F}.xunmi-tab__icon{width:24px;height:24px}.xunmi-tab__label{font-size:12px;line-height:16px}.xunmi-tab__badge{position:absolute;top:-5px;right:-7px;min-width:16px;height:16px;padding:0 4px;border-radius:999px;background:#FF5A91;color:#fff;font-size:10px;line-height:16px;text-align:center}
</style>
