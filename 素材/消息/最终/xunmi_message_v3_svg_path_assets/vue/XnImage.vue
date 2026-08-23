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
      <path :d="`M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18.5v-13Z M7.5 16 11 12.5l2.5 2.5 2-2 3 3`" :fill="'none'" :stroke="'currentColor'" :stroke-width="'1.7'" :stroke-linecap="'round'" :stroke-linejoin="'round'" />
      <path :d="`M16.5 8a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Z`" :fill="'none'" :stroke="'currentColor'" :stroke-width="'1.5'" :stroke-linecap="'round'" :stroke-linejoin="'round'" />
  </svg>
</template>
