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
    <path d="M6 7h10v7.2a4.8 4.8 0 0 1-4.8 4.8H10a4 4 0 0 1-4-4V7Z" fill="none" :stroke="resolvedColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M16 9h1.5a2.5 2.5 0 0 1 0 5H16" fill="none" :stroke="resolvedColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M8 4.5v2" fill="none" :stroke="resolvedColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M12 4.5v2" fill="none" :stroke="resolvedColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>
