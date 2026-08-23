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
      <path :d="`M12 20s6.2-5.6 6.2-10.5A6.2 6.2 0 0 0 5.8 9.5C5.8 14.4 12 20 12 20Z M12 12.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z`" :fill="'none'" :stroke="'currentColor'" :stroke-width="'1.7'" :stroke-linecap="'round'" :stroke-linejoin="'round'" />
  </svg>
</template>
