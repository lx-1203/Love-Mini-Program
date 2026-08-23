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
      <path :d="`M5 12h.01M12 12h.01M19 12h.01`" :fill="'none'" :stroke="'currentColor'" :stroke-width="'3.2'" :stroke-linecap="'round'" :stroke-linejoin="'round'" />
  </svg>
</template>
