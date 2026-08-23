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
    <path d="M7 8.5h10a4.5 4.5 0 0 1 4.2 6l-1.1 3.1a2.5 2.5 0 0 1-4.3.7L13.6 16H10.4l-2.2 2.3a2.5 2.5 0 0 1-4.3-.7l-1.1-3.1a4.5 4.5 0 0 1 4.2-6Z" fill="none" :stroke="resolvedColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M7 11v4" fill="none" :stroke="resolvedColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M5 13h4" fill="none" :stroke="resolvedColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M16.5 12.2h.01" fill="none" :stroke="resolvedColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M19 14h.01" fill="none" :stroke="resolvedColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>
