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
      <path :d="`M5.2 4.5h13.6A1.8 1.8 0 0 1 20.6 6.3v11.4a1.8 1.8 0 0 1-1.8 1.8H5.2a1.8 1.8 0 0 1-1.8-1.8V6.3a1.8 1.8 0 0 1 1.8-1.8ZM7 4.7v14.6M17 4.7v14.6M3.6 9h16.8M3.6 15h16.8`" :fill="'none'" :stroke="'currentColor'" :stroke-width="'1.4'" :stroke-linecap="'round'" :stroke-linejoin="'round'" />
  </svg>
</template>
