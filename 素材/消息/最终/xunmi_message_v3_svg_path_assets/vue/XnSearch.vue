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
      <path :d="`M10.8 4.2a6.6 6.6 0 1 0 0 13.2 6.6 6.6 0 0 0 0-13.2Z M16 16l4.2 4.2`" :fill="'none'" :stroke="'currentColor'" :stroke-width="'1.9'" :stroke-linecap="'round'" :stroke-linejoin="'round'" />
  </svg>
</template>
