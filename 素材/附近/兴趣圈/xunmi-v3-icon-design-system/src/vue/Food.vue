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
    <path d="M6 4v7" fill="none" :stroke="resolvedColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M4.5 4v3.2a1.5 1.5 0 0 0 3 0V4" fill="none" :stroke="resolvedColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M6 11v9" fill="none" :stroke="resolvedColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M15 4v16" fill="none" :stroke="resolvedColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M15 4c2.3 2.2 3.3 5.1 3.3 8h-6.6c0-2.9 1-5.8 3.3-8Z" fill="none" :stroke="resolvedColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>
