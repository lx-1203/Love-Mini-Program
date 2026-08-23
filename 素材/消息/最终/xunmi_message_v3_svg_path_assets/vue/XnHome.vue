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
      <path :d="`M3.8 10.3 12 3.8l8.2 6.5v9.5a.9.9 0 0 1-.9.9h-4.8v-5.2h-5v5.2H4.7a.9.9 0 0 1-.9-.9v-9.5Z`" :fill="'none'" :stroke="'currentColor'" :stroke-width="'1.75'" :stroke-linecap="'round'" :stroke-linejoin="'round'" />
  </svg>
</template>
