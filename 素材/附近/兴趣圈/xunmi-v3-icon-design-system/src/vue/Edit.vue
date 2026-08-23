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
  strokeWidth: 1.8,
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
    <path d="M5 19h4l9.8-9.8a2.1 2.1 0 0 0-3-3L6 16v3Z" fill="none" :stroke="resolvedColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M14.8 7.2l2 2" fill="none" :stroke="resolvedColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>
