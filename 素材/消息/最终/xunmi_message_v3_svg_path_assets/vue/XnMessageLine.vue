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
      <path :d="`M4 5.5A3.5 3.5 0 0 1 7.5 2h9A3.5 3.5 0 0 1 20 5.5v6A3.5 3.5 0 0 1 16.5 15h-6.2L6 19.2v-4.5a3.5 3.5 0 0 1-2-3.2v-6Z`" :fill="'none'" :stroke="'currentColor'" :stroke-width="'1.7'" :stroke-linecap="'round'" :stroke-linejoin="'round'" />
      <path :d="`M8 8.5h.01M12 8.5h.01M16 8.5h.01`" :fill="'none'" :stroke="'currentColor'" :stroke-width="'2.4'" :stroke-linecap="'round'" :stroke-linejoin="'round'" />
  </svg>
</template>
