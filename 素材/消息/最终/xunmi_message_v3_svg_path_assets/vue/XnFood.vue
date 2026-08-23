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
      <path :d="`M6.5 3.8v8.5M9.5 3.8v8.5M7.9 3.8v15.8M17.5 3.8v8.1c0 1.3-1 2.3-2.3 2.3h-1.1M17.5 14.2v5.4`" :fill="'none'" :stroke="'#D69B42'" :stroke-width="'1.7'" :stroke-linecap="'round'" :stroke-linejoin="'round'" />
  </svg>
</template>
