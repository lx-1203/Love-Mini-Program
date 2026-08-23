<script setup lang="ts">
interface Props { size?: number | string; label?: string }
const props = withDefaults(defineProps<Props>(), { size: 18, label: '关注' })
</script>
<template>
  <button class="xn-action xn-follow" type="button">
    <svg viewBox="0 0 24 24" :width="props.size" :height="props.size" aria-hidden="true">
      <path d="m12 4.1 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.6-4.8 2.6.9-5.4-3.9-3.8 5.4-.8L12 4.1Z" fill="none" stroke="#34C38F" stroke-width="1.65" stroke-linejoin="round"/>
    </svg>
    <span>{{ props.label }}</span>
  </button>
</template>
<style scoped>
.xn-action{border:1px solid #CFEFE3;border-radius:999px;padding:.7em 1.15em;display:inline-flex;align-items:center;gap:.45em;background:#fff;color:#34C38F;font:inherit;font-weight:600}
</style>
