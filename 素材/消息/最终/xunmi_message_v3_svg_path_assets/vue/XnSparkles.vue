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
      <path :d="`m6 4 .7 2.3L9 7l-2.3.7L6 10l-.7-2.3L3 7l2.3-.7L6 4Zm11 7 .9 3 3.1.9-3.1.9-.9 3-.9-3-3.1-.9 3.1-.9.9-3Zm-6.5 1.2.6 1.9 1.9.6-1.9.6-.6 1.9-.6-1.9-1.9-.6 1.9-.6.6-1.9Z`" :fill="'none'" :stroke="'#F5C542'" stroke="none" :stroke-linecap="'round'" :stroke-linejoin="'round'" />
  </svg>
</template>
