<script setup lang="ts">
/**
 * 通用卡片组件
 * 视觉对齐青藤参考：
 *  - 圆角默认 --r-lg: 16rpx
 *  - 边缘色 1rpx solid var(--c-border-card)
 *  - 软阴影 var(--s-card-soft)（双层 4% 不透明）
 *  - 内边距默认 32rpx（对应 --sp-8 标准 7 档）
 *  - active 态阴影提升至 c-elevation-2 + 品牌描边
 */
import { computed } from 'vue';
import { designTokens } from '../../theme/tokens';
import Ripple from './Ripple.vue';

const props = withDefaults(defineProps<{
  variant?: 'default' | 'interactive' | 'gradient' | 'atmosphere';
  padding?: number;
  radius?: number;
  ripple?: boolean;
  gradient?: 'romance' | 'brand' | 'pink' | 'vip' | false;
}>(), {
  variant: 'default',
  padding: 32,
  radius: 16,
  ripple: true,
  gradient: false,
});

const t = designTokens;

const cardClass = computed(() => [
  'card',
  'card-base',
  `card--${props.variant}`,
  {
    'card--gradient-romance': props.gradient === 'romance',
    'card--gradient-brand': props.gradient === 'brand',
    'card--gradient-pink': props.gradient === 'pink',
    'card--gradient-vip': props.gradient === 'vip',
  },
]);

const cardStyle = computed(() => ({
  padding: `${props.padding}rpx`,
  borderRadius: `${props.radius}rpx`,
}));

const rippleColor = computed(() => {
  if (props.gradient === 'romance' || props.gradient === 'pink') return 'rgba(255,255,255,0.2)';
  if (props.gradient === 'brand') return 'rgba(255,255,255,0.2)';
  if (props.gradient === 'vip') return 'rgba(255,255,255,0.2)';
  if (props.variant === 'gradient') return 'rgba(255,255,255,0.2)';
  if (props.variant === 'atmosphere') return 'rgba(63,207,142,0.08)';
  return 'rgba(63,207,142,0.06)';
});
</script>

<template>
  <Ripple v-if="variant === 'interactive' && ripple" :color="rippleColor">
    <view :class="cardClass" :style="cardStyle">
      <slot />
    </view>
  </Ripple>
  <view v-else :class="cardClass" :style="cardStyle">
    <slot />
  </view>
</template>

<style scoped>
/* 卡片基底：白底 + 双层软阴影 + 1rpx 边缘色，对齐青藤参考 */
.card {
  background: var(--c-bg-container);
  box-shadow: var(--s-card-soft);
  border: var(--c-border-card);
  transition: transform var(--card-press-duration) cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow var(--card-press-duration) cubic-bezier(0.4, 0, 0.2, 1),
              border-color var(--card-press-duration) cubic-bezier(0.4, 0, 0.2, 1);
}
.card--interactive {
  cursor: pointer;
}
/* active 态：缩放 + 阴影提升至 elevation-2 + 品牌描边（mp-weixin 不支持 :hover，仅 :active） */
.card--interactive:active {
  transform: scale(var(--card-press-scale));
  box-shadow: var(--c-elevation-2);
  border: var(--c-border-card-brand);
}
.card--gradient {
  background: var(--c-gradient-brand);
  color: var(--c-text-inverse);
  border: none;
  box-shadow: var(--s-brand);
}
.card--atmosphere {
  background: var(--c-gradient-card-atmosphere);
  border: var(--c-border-card);
  box-shadow: none;
}
.card--gradient-romance {
  background: var(--c-gradient-romance);
  color: var(--c-text-inverse);
  border: none;
  box-shadow: var(--s-romance);
}
.card--gradient-brand {
  background: var(--c-gradient-brand);
  color: var(--c-text-inverse);
  border: none;
  box-shadow: var(--s-brand);
}
.card--gradient-pink {
  background: var(--c-gradient-romance);
  color: var(--c-text-inverse);
  border: none;
  box-shadow: var(--s-romance);
}
.card--gradient-vip {
  background: var(--c-gradient-vip);
  color: var(--c-text-inverse);
  border: none;
  box-shadow: var(--s-vip);
}
</style>
