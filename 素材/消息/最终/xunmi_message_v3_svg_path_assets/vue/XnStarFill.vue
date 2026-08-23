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
      <path :d="`m12 4.1 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4l-4.8 2.6.9-5.4-3.9-3.8 5.4-.8L12 4.1Z`" :fill="'none'" :stroke="'#34C38F'" stroke="none" :stroke-linecap="'round'" :stroke-linejoin="'round'" />
  </svg>
</template>
