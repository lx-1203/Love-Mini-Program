<script setup lang="ts">
interface Props { size?: number | string; label?: string }
const props = withDefaults(defineProps<Props>(), { size: 18, label: '打招呼' })
</script>
<template>
  <button class="xn-action xn-hello" type="button">
    <svg viewBox="0 0 24 24" :width="props.size" :height="props.size" aria-hidden="true">
      <path d="M4 5.5A3.5 3.5 0 0 1 7.5 2h9A3.5 3.5 0 0 1 20 5.5v6A3.5 3.5 0 0 1 16.5 15h-6.2L6 19.2v-4.5a3.5 3.5 0 0 1-2-3.2v-6Z" fill="#34C38F"/>
      <path d="M8 8.5h.01M12 8.5h.01M16 8.5h.01" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round"/>
    </svg>
    <span>{{ props.label }}</span>
  </button>
</template>
<style scoped>
.xn-action{border:0;border-radius:999px;padding:.7em 1.15em;display:inline-flex;align-items:center;gap:.45em;background:#34C38F;color:#fff;font:inherit;font-weight:600}
</style>
