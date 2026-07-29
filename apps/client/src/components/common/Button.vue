<script setup lang="ts">
import { computed, ref } from 'vue';
import { lightHaptic } from '../../utils/haptic';
import Ripple from './Ripple.vue';

/**
 * 按钮点击事件参数（最小契约）
 *
 * uni-app 的 @tap 事件在不同平台形态不一：
 * - H5 / mp-weixin：detail 包含 x / y（页面坐标）
 * - 触摸类事件：changedTouches[0].clientX / clientY
 * 此处仅声明实际消费的字段，便于类型安全与静态检查。
 */
interface TapEventLike {
  detail?: { x?: number; y?: number };
  changedTouches?: Array<{ clientX?: number; clientY?: number }>;
}

const props = withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'wechat' | 'danger' | 'success' | 'romance' | 'text';
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  ripple?: boolean;
}>(), {
  variant: 'primary',
  size: 'md',
  block: false,
  loading: false,
  disabled: false,
  ripple: true,
});

const emit = defineEmits<{
  tap: [e: TapEventLike];
}>();

/** Ripple 子组件 ref，用于主动调用 start(clientX, clientY) */
const rippleRef = ref<{ start: (clientX?: number, clientY?: number) => void } | null>(null);

const btnClass = computed(() => [
  'btn',
  `btn--${props.variant}`,
  `btn--${props.size}`,
  {
    'btn--block': props.block,
    'btn--loading': props.loading,
    'btn--disabled': props.disabled,
  },
]);

const heightMap: Record<string, string> = {
  sm: 'var(--btn-height-sm)',
  md: 'var(--btn-height-md)',
  lg: 'var(--btn-height-lg)',
};
const paddingXMap: Record<string, string> = {
  sm: 'var(--btn-padding-x-sm)',
  md: 'var(--btn-padding-x-md)',
  lg: 'var(--btn-padding-x-lg)',
};
const fontSizeMap: Record<string, string> = {
  sm: 'var(--fs-base)',
  md: 'var(--fs-lg)',
  lg: 'var(--fs-xl)',
};
const btnStyle = computed(() => ({
  height: heightMap[props.size],
  paddingLeft: paddingXMap[props.size],
  paddingRight: paddingXMap[props.size],
  fontSize: fontSizeMap[props.size],
}));

/**
 * Ripple 颜色映射：通过 CSS 变量引用 design token，跨主题自动适配
 * - 深色按钮（primary/wechat/danger/success/romance）使用浅色涟漪
 * - 品牌色按钮（secondary/outline）使用品牌色涟漪
 * - 浅色按钮（ghost/text）使用淡品牌色涟漪
 */
const rippleColorMap: Record<string, string> = {
  primary: 'var(--c-ripple-light)',
  secondary: 'var(--c-ripple-brand)',
  outline: 'var(--c-ripple-brand)',
  ghost: 'var(--c-ripple-brand-soft)',
  text: 'var(--c-ripple-brand-soft)',
  wechat: 'var(--c-ripple-light)',
  danger: 'var(--c-ripple-light)',
  success: 'var(--c-ripple-light)',
  romance: 'var(--c-ripple-light)',
};
const rippleColor = computed(() => rippleColorMap[props.variant] || 'var(--c-ripple-light)');

const showRipple = computed(() => {
  if (props.variant === 'text') return false;
  if (props.disabled || props.loading) return false;
  // 默认 true，可显式关闭；其余 variant（secondary/outline/ghost 等）均允许涟漪
  return props.ripple !== false;
});

/** 统一点击处理：提取点击坐标 → 触发涟漪 → 振动反馈 → 事件抛出（disabled/loading 状态拦截） */
function handleTap(e: TapEventLike) {
  if (props.disabled || props.loading) return;
  let px = 0;
  let py = 0;
  // H5 + mp-weixin 的 @tap 事件 detail 包含 x/y（页面坐标）
  if (e && e.detail && typeof e.detail.x === 'number' && typeof e.detail.y === 'number') {
    px = e.detail.x;
    py = e.detail.y;
  } else if (e && e.changedTouches && e.changedTouches[0]) {
    px = e.changedTouches[0].clientX ?? 0;
    py = e.changedTouches[0].clientY ?? 0;
  }
  rippleRef.value?.start(px, py);
  lightHaptic();
  emit('tap', e);
}
</script>

<template>
  <Ripple v-if="showRipple" ref="rippleRef" :color="rippleColor" :duration="200" :disabled="disabled || loading">
    <view
      :class="btnClass"
      :style="btnStyle"
      hover-class="btn--pressed"
      hover-stay-time="120"
      @tap="handleTap"
      role="button"
      :aria-disabled="disabled || loading"
      :aria-busy="loading"
    >
      <text v-if="icon && !loading" class="btn-icon">{{ icon }}</text>
      <view v-if="loading" class="btn-spinner" />
      <text class="btn-text"><slot /></text>
    </view>
  </Ripple>
  <view
    v-else
    :class="btnClass"
    :style="btnStyle"
    hover-class="btn--pressed"
    hover-stay-time="120"
    @tap="handleTap"
    role="button"
    :aria-disabled="disabled || loading"
    :aria-busy="loading"
  >
    <text v-if="icon && !loading" class="btn-icon">{{ icon }}</text>
    <view v-if="loading" class="btn-spinner" />
    <text class="btn-text"><slot /></text>
  </view>
</template>

<style lang="scss" scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  border-radius: var(--r-full);
  font-weight: bold;
  transition: transform var(--btn-press-duration) cubic-bezier(0.4, 0, 0.2, 1),
              opacity var(--btn-press-duration) cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow var(--btn-press-duration) cubic-bezier(0.4, 0, 0.2, 1),
              background-color var(--btn-press-duration) cubic-bezier(0.4, 0, 0.2, 1),
              border-color var(--btn-press-duration) cubic-bezier(0.4, 0, 0.2, 1);
  border: none;
  position: relative;
  overflow: hidden;
}

/* 按压态：scale(0.95) + opacity(0.9) */
/* 用 hover-class="btn--pressed" 替代 :active，H5 与 mp-weixin 均通过 hover-class 触发 */
.btn--pressed {
  transform: scale(var(--btn-press-scale));
  opacity: var(--btn-press-opacity);
}

.btn--block {
  width: 100%;
}

.btn--loading {
  opacity: 0.7;
  pointer-events: none;
}

.btn--disabled {
  opacity: 0.4;
  pointer-events: none;
}

/* 主按钮：品牌渐变背景 */
.btn--primary {
  background: var(--c-gradient-brand);
  color: var(--c-text-inverse);
  box-shadow: var(--s-brand);
}
.btn--primary.btn--pressed {
  box-shadow: var(--s-brand-sm);
}

/* 次按钮：白底 + 边框 */
.btn--secondary {
  background: var(--c-bg-container);
  color: var(--c-text-primary);
  border: var(--sp-1) solid var(--c-border-default);
}
.btn--secondary.btn--pressed {
  background: var(--c-bg-brand);
  border-color: var(--c-brand);
  color: var(--c-brand);
}

/* 描边按钮 */
.btn--outline {
  background: transparent;
  border: var(--sp-1) solid var(--c-border-default);
  color: var(--c-text-secondary);
}
.btn--outline.btn--pressed {
  border-color: var(--c-brand);
  color: var(--c-brand);
  background: var(--c-bg-brand);
}

/* 文字按钮/幽灵按钮：无背景无边框 */
.btn--ghost,
.btn--text {
  background: transparent;
  border: none;
  color: var(--c-text-brand);
  border-radius: var(--r-full);
}
.btn--ghost.btn--pressed,
.btn--text.btn--pressed {
  background: var(--c-bg-brand);
}

/* 浪漫渐变按钮 */
.btn--romance {
  background: var(--c-gradient-romance);
  color: var(--c-text-inverse);
  box-shadow: var(--s-romance);
}
.btn--romance.btn--pressed {
  box-shadow: var(--s-romance-md);
}

/* 微信按钮 */
.btn--wechat {
  background: var(--c-success);
  color: var(--c-text-inverse);
  box-shadow: var(--s-success);
}
.btn--wechat.btn--pressed {
  background: var(--c-brand-700);
}

/* 危险按钮 */
.btn--danger {
  background: var(--c-error);
  color: var(--c-text-inverse);
  box-shadow: var(--s-error);
}
.btn--danger.btn--pressed {
  /* #ifndef MP-WEIXIN */
  filter: brightness(0.9);
  /* #endif */
  /* #ifdef MP-WEIXIN */
  /* mp-weixin 不支持 filter: brightness，用背景色变深兜底 */
  background: var(--c-error-dark);
  /* #endif */
}

/* 成功按钮 */
.btn--success {
  background: var(--c-success);
  color: var(--c-text-inverse);
  box-shadow: var(--s-success);
}
.btn--success.btn--pressed {
  background: var(--c-brand-800);
}

/* 图标 */
.btn-icon {
  font-size: var(--fs-xl);
}

/* 加载中 Spinner */
.btn-spinner {
  width: var(--sp-7);
  height: var(--sp-7);
  border: var(--sp-1) solid var(--c-text-inverse);
  opacity: 0.3;
  border-top-color: var(--c-text-inverse);
  opacity: 1;
  border-radius: var(--r-full);
  animation: spin var(--d-slowest, 600ms) linear infinite;
}
.btn--outline .btn-spinner,
.btn--secondary .btn-spinner,
.btn--ghost .btn-spinner,
.btn--text .btn-spinner {
  border-color: var(--c-neutral-400);
  opacity: 0.3;
  border-top-color: var(--c-brand);
  opacity: 1;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
