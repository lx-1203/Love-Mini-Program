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
      <path :d="`M12.2 20.2c-4 0-6.5-2.6-6.5-6.2 0-2.5 1.2-4.6 3.7-6.9-.2 2 1 3 2 3.6.3-2.7 1.4-4.7 3.3-6.3.8 2.3 3.7 3.8 3.7 7.4 0 4.6-2.8 8.4-6.2 8.4Z`" :fill="'none'" :stroke="'#FF7A45'" stroke="none" :stroke-linecap="'round'" :stroke-linejoin="'round'" />
  </svg>
</template>
