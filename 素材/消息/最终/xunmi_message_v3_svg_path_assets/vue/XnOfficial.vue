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
      <path :d="`M5 6.5A3.5 3.5 0 0 1 8.5 3h7A3.5 3.5 0 0 1 19 6.5v8a3.5 3.5 0 0 1-3.5 3.5h-7A3.5 3.5 0 0 1 5 14.5v-8Z`" :fill="'none'" :stroke="'#34C38F'" stroke="none" :stroke-linecap="'round'" :stroke-linejoin="'round'" />
      <path :d="`m9 11 2 2 4-4`" :fill="'none'" :stroke="'#FFFFFF'" :stroke-width="'1.7'" :stroke-linecap="'round'" :stroke-linejoin="'round'" />
  </svg>
</template>
