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
      <path :d="`M4 7.5A2.5 2.5 0 0 1 6.5 5h2l1-1.5h5L15.5 5h2A2.5 2.5 0 0 1 20 7.5v8.8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.3V7.5Z M12 15.5a3.1 3.1 0 1 0 0-6.2 3.1 3.1 0 0 0 0 6.2Z`" :fill="'none'" :stroke="'currentColor'" :stroke-width="'1.6'" :stroke-linecap="'round'" :stroke-linejoin="'round'" />
  </svg>
</template>
