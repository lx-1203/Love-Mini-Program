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
      <path :d="`M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Z M8.7 10h.01M15.3 10h.01M8.5 14c1.1 1.4 2.4 2.1 3.5 2.1s2.4-.7 3.5-2.1`" :fill="'none'" :stroke="'currentColor'" :stroke-width="'1.55'" :stroke-linecap="'round'" :stroke-linejoin="'round'" />
  </svg>
</template>
