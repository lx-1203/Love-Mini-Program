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
      <path :d="`m3.8 5.2 16.4 6.4-16.4 6.4 2.9-6.4-2.9-6.4Z M6.7 11.6h9.2`" :fill="'none'" :stroke="'#34C38F'" stroke="none" :stroke-linecap="'round'" :stroke-linejoin="'round'" />
  </svg>
</template>
