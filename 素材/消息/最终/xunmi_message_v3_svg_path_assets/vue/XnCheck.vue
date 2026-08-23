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
      <path :d="`m5.5 12.2 4 4 9-9`" :fill="'none'" :stroke="'currentColor'" :stroke-width="'2'" :stroke-linecap="'round'" :stroke-linejoin="'round'" />
  </svg>
</template>
