<script setup lang="ts">
interface Props {
  size?: number | string
  color?: string
}
const props = withDefaults(defineProps<Props>(), {
  size: 24,
  color: 'currentColor',
})
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    :width="props.size"
    :height="props.size"
    fill="none"
    :style="{ color: props.color }"
    aria-hidden="true"
  >
      <path :d="`M4.5 9h15v10.5h-15V9ZM3.3 6h17.4v3H3.3V6ZM8 6c-1.7 0-2.7-.9-2.7-2.2C5.3 2.9 6 2 7.1 2c1.6 0 3 2 4.9 4M16 6c1.7 0 2.7-.9 2.7-2.2 0-.9-.7-1.8-1.8-1.8-1.6 0-3 2-4.9 4M12 6v13.5`" :fill="'none'" :stroke="'currentColor'" :stroke-width="'1.45'" :stroke-linecap="'round'" :stroke-linejoin="'round'" />
  </svg>
</template>
