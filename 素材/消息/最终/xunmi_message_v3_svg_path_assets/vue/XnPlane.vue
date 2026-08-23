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
      <path :d="`m3.4 11.2 17.2-7.1a.8.8 0 0 1 1 1l-7.1 17.2-2.4-7.7-8.7-3.4Z M11.2 14.6 17.3 8.5`" :fill="'none'" :stroke="'#58B7D7'" stroke="none" :stroke-linecap="'round'" :stroke-linejoin="'round'" />
  </svg>
</template>
