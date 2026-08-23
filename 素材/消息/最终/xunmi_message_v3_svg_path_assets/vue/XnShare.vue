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
      <path :d="`M8.2 12.7 15.8 8.4M8.2 11.3l7.6 4.3M6.5 14.2a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4Zm11-11a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4Zm0 11a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0-0-4.4Z`" :fill="'none'" :stroke="'currentColor'" :stroke-width="'1.6'" :stroke-linecap="'round'" :stroke-linejoin="'round'" />
  </svg>
</template>
