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
      <path :d="`M5.2 10.6 6 5.2l4.1 2.5A6.6 6.6 0 0 1 13.9 7L18 4.8l.8 5.8c.8 1.1 1.2 2.4 1.2 3.7a8 8 0 0 1-16 0c0-1.3.4-2.6 1.2-3.7Z`" :fill="'none'" :stroke="'#F4A11A'" stroke="none" :stroke-linecap="'round'" :stroke-linejoin="'round'" />
      <path :d="`M8.6 12.6h.01M15.4 12.6h.01M10 16c1.3.9 2.7.9 4 0`" :fill="'none'" :stroke="'#6B4A3A'" :stroke-width="'1.6'" :stroke-linecap="'round'" :stroke-linejoin="'round'" />
  </svg>
</template>
