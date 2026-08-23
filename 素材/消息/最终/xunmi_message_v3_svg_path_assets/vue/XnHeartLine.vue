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
      <path :d="`M12 20.1S4 15.6 4 9.7A4.4 4.4 0 0 1 12 7.1a4.4 4.4 0 0 1 8 2.6c0 5.9-8 10.4-8 10.4Z`" :fill="'none'" :stroke="'currentColor'" :stroke-width="'1.8'" :stroke-linecap="'round'" :stroke-linejoin="'round'" />
  </svg>
</template>
