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
      <path :d="`M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M4.8 20a7.2 7.2 0 0 1 14.4 0`" :fill="'none'" :stroke="'currentColor'" :stroke-width="'1.75'" :stroke-linecap="'round'" :stroke-linejoin="'round'" />
  </svg>
</template>
