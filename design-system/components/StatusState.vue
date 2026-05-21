<!-- ============================================================
  StatusState - 状态标签组件
  变更点：
  1. 从 tokens 读取全部样式
  2. 增加 tone 类型：brand / success / warning / error / info / neutral
  3. 增加 size 变体：sm / md / lg
  4. 增加 dot 模式（带小圆点）
============================================================ -->
<script setup lang="ts">
import { computed } from 'vue';
import { designTokens } from '../tokens';

const props = defineProps<{
  label: string;
  tone?: 'brand' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  pulse?: boolean;
}>();

const t = computed(() => designTokens);

const toneMap = {
  brand:    { bg: t.value.color.brand[50],    text: t.value.color.brand[500],    dot: t.value.color.brand[400] },
  success:  { bg: '#E8FAF6',                  text: '#23A08C',                    dot: '#3ECBB1' },
  warning:  { bg: t.value.color.accent[50],    text: t.value.color.accent[600],    dot: t.value.color.accent[400] },
  error:    { bg: '#FEF0F0',                   text: '#D93025',                    dot: '#EA4335' },
  info:     { bg: t.value.color.brand[50],    text: t.value.color.brand[500],    dot: t.value.color.brand[400] },
  neutral:  { bg: t.value.color.neutral[100],  text: t.value.color.neutral[600],   dot: t.value.color.neutral[400] },
};

const sizeMap = {
  sm: { padding: `${t.value.spacing[1]}rpx ${t.value.spacing[2]}rpx`, fontSize: `${t.value.typography.size.overline}rpx` },
  md: { padding: `${t.value.spacing[1]}rpx ${t.value.spacing[3]}rpx`, fontSize: `${t.value.typography.size.caption}rpx` },
  lg: { padding: `${t.value.spacing[2]}rpx ${t.value.spacing[4]}rpx`, fontSize: `${t.value.typography.size.bodySm}rpx` },
};

const currentTone = computed(() => toneMap[props.tone || 'brand']);
const currentSize = computed(() => sizeMap[props.size || 'md']);

const pillStyle = computed(() => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: `${t.value.spacing[1]}rpx`,
  padding: currentSize.value.padding,
  borderRadius: `${t.value.radius.full}rpx`,
  background: currentTone.value.bg,
  color: currentTone.value.text,
  fontSize: currentSize.value.fontSize,
  fontWeight: t.value.typography.weight.medium,
  lineHeight: 1,
}));

const dotStyle = computed(() => ({
  width: `${t.value.spacing[2]}rpx`,
  height: `${t.value.spacing[2]}rpx`,
  borderRadius: `${t.value.radius.full}rpx`,
  background: currentTone.value.dot,
}));
</script>

<template>
  <text class="pill" :style="pillStyle">
    <view v-if="dot" class="pill__dot" :class="{ 'pill__dot--pulse': pulse }" :style="dotStyle" />
    {{ label }}
  </text>
</template>

<style lang="scss" scoped>
.pill {
  &__dot--pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.2); }
  }
}
</style>
