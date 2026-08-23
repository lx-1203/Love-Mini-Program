<template>
  <button class="xunmi-action" :class="[`xunmi-action--${variant}`]" type="button">
    <span class="xunmi-action__icon"><slot /></span>
    <span v-if="label" class="xunmi-action__label">{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
defineProps<{ label?: string; variant?: 'skip' | 'greet' | 'like' }>()
defineOptions({ name: 'XunmiActionButton' })
</script>

<style scoped>
.xunmi-action{display:inline-flex;flex-direction:column;align-items:center;gap:8px;border:0;background:transparent;padding:0;font:inherit}.xunmi-action__icon{display:grid;place-items:center;width:64px;height:64px;border-radius:50%;box-shadow:0 10px 24px rgba(17,24,39,.08)}.xunmi-action__label{font-size:14px;line-height:20px;color:#8F95A1}.xunmi-action--skip .xunmi-action__icon{background:#fff;color:#A8ADB7}.xunmi-action--greet .xunmi-action__icon{background:#fff;color:#FF5A91}.xunmi-action--like .xunmi-action__icon{background:#FF5A91;color:#fff;box-shadow:0 12px 28px rgba(255,90,145,.26)}.xunmi-action--like .xunmi-action__label{color:#FF5A91}
</style>
