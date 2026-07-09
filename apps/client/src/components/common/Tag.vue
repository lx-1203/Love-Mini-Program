<script setup lang="ts">
import { computed } from 'vue';
import { designTokens } from '../../theme/tokens';

const props = withDefaults(defineProps<{
  variant?: 'gray' | 'blue' | 'pill' | 'topic' | 'cert' | 'success' | 'warning' | 'error' | 'romance' | 'vip' | 'campus' | 'signup' | 'ongoing' | 'preview' | 'location' | 'price';
  label?: string;
  icon?: string;
  selected?: boolean;
  size?: 'sm' | 'md';
  shape?: 'sm' | 'pill';
}>(), {
  variant: 'gray',
  selected: false,
  size: 'md',
  shape: 'pill',
});

const t = designTokens;

const tagClass = computed(() => [
  'tag',
  `tag--${props.variant}`,
  { 'tag--selected': props.selected },
  `tag--${props.size}`,
  `tag--shape-${props.shape}`,
]);
</script>

<template>
  <view :class="tagClass">
    <text v-if="icon" class="tag-icon">{{ icon }}</text>
    <text class="tag-label">{{ label }}</text>
    <slot />
  </view>
</template>

<style scoped>
.tag {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  font-weight: 500;
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  border: var(--border-subtle);
  white-space: nowrap;
  user-select: none;
}
.tag:active { opacity: 0.8; transform: scale(0.97); }

.tag--sm { padding: var(--tag-padding-y-sm) var(--tag-padding-x-sm); font-size: var(--tag-font-size-sm); }
.tag--md { padding: var(--tag-padding-y-md) var(--tag-padding-x-md); font-size: var(--tag-font-size-md); }

.tag--shape-sm { border-radius: var(--tag-radius); }
.tag--shape-pill { border-radius: var(--tag-radius-pill); }

.tag--gray {
  background: var(--c-neutral-100);
  color: var(--c-text-secondary);
  border-color: var(--c-border-light);
}
.tag--blue {
  background: var(--c-bg-brand);
  color: var(--c-brand-500);
  border-color: var(--c-border-card-brand);
}
.tag--blue:active { background: var(--c-bg-secondary); }
.tag--blue.tag--selected {
  background: var(--c-brand);
  color: var(--c-text-inverse);
  border-color: var(--c-brand);
}
.tag--pill {
  border-color: var(--border-default);
  background: var(--c-bg-container);
  color: var(--c-text-secondary);
}
.tag--topic {
  background: var(--c-neutral-50);
  color: var(--c-text-tertiary);
  border-color: var(--c-border-light);
}
.tag--cert {
  background: var(--c-bg-brand);
  color: var(--c-brand-500);
  border-color: var(--c-border-card-brand);
  font-weight: 600;
}
.tag--success {
  background: rgba(16, 185, 129, 0.1);
  color: var(--c-success);
  border-color: rgba(16, 185, 129, 0.22);
}
.tag--warning {
  background: rgba(245, 158, 11, 0.1);
  color: var(--c-warning);
  border-color: rgba(245, 158, 11, 0.22);
}
.tag--error {
  background: rgba(229, 69, 77, 0.1);
  color: var(--c-error);
  border-color: rgba(229, 69, 77, 0.22);
}
.tag--romance {
  background: var(--c-romance-50);
  color: var(--c-romance-500);
  border-color: rgba(236, 72, 153, 0.22);
}
.tag--romance.tag--selected {
  background: var(--c-gradient-romance);
  color: var(--c-text-inverse);
  border-color: transparent;
}
.tag--vip {
  background: var(--c-gradient-vip);
  color: var(--c-text-inverse);
  border-color: rgba(201, 163, 106, 0.35);
  font-weight: 600;
}
.tag--campus {
  background: var(--c-badge-campus);
  color: var(--c-text-inverse);
  border: none;
  font-weight: 600;
}
.tag--signup {
  background: var(--c-state-signup-bg);
  color: var(--c-state-signup-text);
  border: none;
  font-weight: 600;
}
.tag--ongoing {
  background: var(--c-state-ongoing-bg);
  color: var(--c-state-ongoing-text);
  border: none;
  font-weight: 600;
}
.tag--preview {
  background: var(--c-state-preview-bg);
  color: var(--c-state-preview-text);
  border: none;
  font-weight: 600;
}
.tag--location {
  background: var(--c-location-bg);
  color: var(--c-location-text);
  border: none;
  font-weight: 500;
}
.tag--price {
  background: transparent;
  color: var(--c-price);
  border: none;
  font-weight: 700;
}

.tag-icon { font-size: inherit; }
.tag-label { font-size: inherit; }
</style>
