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
      <path :d="`M12 13.5a5.2 5.2 0 1 0 0-10.4 5.2 5.2 0 0 0 0 10.4ZM12 13.5v7.3M8.5 18.2h7`" :fill="'none'" :stroke="'#FF5A91'" :stroke-width="'1.7'" :stroke-linecap="'round'" :stroke-linejoin="'round'" />
  </svg>
</template>
