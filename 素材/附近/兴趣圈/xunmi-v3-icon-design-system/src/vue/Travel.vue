<script setup lang="ts">
import { computed } from 'vue'

type IconState = 'default' | 'muted' | 'active' | 'disabled' | 'danger'

const props = withDefaults(defineProps<{
  size?: number | string
  state?: IconState
  color?: string
  strokeWidth?: number
  title?: string
}>(), {
  size: 24,
  state: 'default',
  strokeWidth: 1.5,
})

const stateColors: Record<IconState, string> = {
  default: '#1A1A1A',
  muted: '#667085',
  active: '#00B86B',
  disabled: '#B8C0CC',
  danger: '#FF5A70',
}

const resolvedColor = computed(() => props.color || stateColors[props.state])
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none"
    xmlns="http://www.w3.org/2000/svg"
    :aria-label="title" :aria-hidden="title ? undefined : 'true'"
    :style="{ opacity: state === 'disabled' ? 0.48 : 1 }">
    <path d="M4 13.5 10.2 12 5.4 7.2l1.4-1.4 6.8 4.2 4.6-4.6a1.6 1.6 0 0 1 2.2 0 1.6 1.6 0 0 1 0 2.2l-4.6 4.6 4.2 6.8-1.4 1.4-4.8-4.8-1.5 6.2-1.8.4-1-7.3-4.9-2.2Z" fill="none" :stroke="resolvedColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>
