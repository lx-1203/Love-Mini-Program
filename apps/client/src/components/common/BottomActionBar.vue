<script setup lang="ts">
import { designTokens } from '../../theme/tokens';

defineProps<{
  primaryLabel: string;
  secondaryLabel?: string;
}>();

const emit = defineEmits<{
  primary: [];
  secondary: [];
}>();

const t = designTokens;
</script>

<template>
  <view class="bar" :class="{ 'bar--single': !secondaryLabel }">
    <button v-if="secondaryLabel" class="bar__secondary" @tap="emit('secondary')">
      {{ secondaryLabel }}
    </button>
    <button class="bar__primary" @tap="emit('primary')">{{ primaryLabel }}</button>
  </view>
</template>

<style scoped>
.bar {
  display: flex;
  flex-direction: row;
  gap: 16rpx;
}
.bar--single {
  flex-direction: row;
}

.bar__primary,
.bar__secondary {
  flex: 1;
  height: 88rpx;
  border: 0;
  border-radius: v-bind('`${t.component.button.radius}rpx`');
  font-size: 28rpx;
  font-weight: 700;
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.bar__primary {
  background: v-bind('t.color.gradient.brand');
  color: #fff;
  box-shadow: v-bind('t.shadow.brand');
}
.bar__primary:active {
  transform: scale(0.97);
  transition: all 120ms cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: v-bind('t.shadow.brandMd');
}

.bar__secondary {
  background: v-bind('t.color.bg.container');
  color: v-bind('t.color.text.primary');
  border: 1rpx solid v-bind('t.color.border.default');
}
.bar__secondary:active {
  transform: scale(0.97);
  transition: all 120ms cubic-bezier(0.4, 0, 0.2, 1);
  background: v-bind('t.color.neutral[100]');
}
</style>
