<script setup lang="ts">
interface Props { size?: number | string; label?: string }
const props = withDefaults(defineProps<Props>(), { size: 18, label: '喜欢' })
</script>
<template>
  <button class="xn-action xn-like" type="button">
    <svg viewBox="0 0 24 24" :width="props.size" :height="props.size" aria-hidden="true">
      <path d="M12 20.1S4 15.6 4 9.7A4.4 4.4 0 0 1 12 7.1a4.4 4.4 0 0 1 8 2.6c0 5.9-8 10.4-8 10.4Z" fill="#FF5A91"/>
    </svg>
    <span>{{ props.label }}</span>
  </button>
</template>
<style scoped>
.xn-action{border:0;border-radius:999px;padding:.7em 1.15em;display:inline-flex;align-items:center;gap:.45em;background:#FFF0F5;color:#FF5A91;font:inherit;font-weight:600}
</style>
