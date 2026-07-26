<script setup lang="ts">
/**
 * AppShell 应用布局组件
 *
 * 三种变体：
 * - standard：标准头部（标题 + 副标题 + 可选返回按钮 + 右侧操作区）
 * - immersive：沉浸型（无显式头部，内容延伸到顶部状态栏）
 * - minimal：简洁型（仅安全区适配，无头部）
 *
 * 特性：
 * - 自动适配顶部 statusBar 和底部 TabBar 安全区
 * - 内置 page-fade-in 动画
 * - 支持背景渐变（品牌主色到背景色）
 * - 支持自定义背景图
 */

import { computed, ref, nextTick } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useI18n } from 'vue-i18n';
import { IMAGE_PATHS } from '@/config/images';

interface Props {
  /** 布局变体 */
  variant?: 'standard' | 'immersive' | 'minimal';
  /** 标题 */
  title?: string;
  /** 副标题 */
  subtitle?: string;
  /** 是否显示返回按钮 */
  showBack?: boolean;
  /** 背景变体 */
  bgVariant?: 'default' | 'gradient' | 'image';
  /** 背景图（bgVariant='image' 时生效） */
  bgImage?: string;
  /** 头部是否固定 */
  fixed?: boolean;
  /** 是否适配顶部安全区（默认 true） */
  safeArea?: boolean;
  /** 是否适配 TabBar 底部安全区（默认 true） */
  tabBarSafe?: boolean;
  /** 是否启用页面淡入动画 */
  animate?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'standard',
  title: '',
  subtitle: '',
  showBack: false,
  bgVariant: 'default',
  bgImage: '',
  fixed: false,
  safeArea: true,
  tabBarSafe: true,
  animate: true,
});

const emit = defineEmits<{
  (e: 'back'): void;
}>();

const { t } = useI18n();

/** 页面淡入动画控制 */
const pageVisible = ref(false);

onShow(() => {
  if (!props.animate) {
    pageVisible.value = true;
    return;
  }
  pageVisible.value = false;
  void nextTick(() => {
    pageVisible.value = true;
  });
});

/** 计算容器类名 */
const shellClass = computed(() => [
  'shell',
  `shell--${props.variant}`,
  `shell-bg--${props.bgVariant}`,
  {
    'is-fixed': props.fixed,
    'page-fade-in': pageVisible.value && props.animate,
  },
]);

/** 计算容器样式 */
const shellStyle = computed(() => {
  const style: Record<string, string> = {};
  if (props.bgVariant === 'image' && props.bgImage) {
    style.backgroundImage = `url(${props.bgImage})`;
    style.backgroundSize = 'cover';
    style.backgroundPosition = 'center top';
    style.backgroundRepeat = 'no-repeat';
  }
  return style;
});

/** 头部样式 */
const headerStyle = computed(() => {
  if (!props.safeArea) return {};
  // 通过 CSS env() 函数获取状态栏高度
  return {
    paddingTop: 'calc(env(safe-area-inset-top) + 24rpx)',
  };
});

/** 底部内边距 */
const bodyPaddingBottom = computed(() => {
  if (!props.tabBarSafe) return '0';
  return 'calc(env(safe-area-inset-bottom) + 180rpx)';
});

/** 处理返回按钮点击 */
function handleBack(): void {
  emit('back');
  // 默认行为：返回上一页
  // #ifdef MP-WEIXIN
  // mp-weixin 的 uni.navigateBack 不返回 Promise，必须使用 success/fail 回调风格
  uni.navigateBack({
    delta: 1,
    fail: () => {
      // 返回失败（如无上一页）时静默处理，避免未捕获异常
    },
  });
  // #endif
  // #ifndef MP-WEIXIN
  // H5 / App 端：navigateBack 返回 Promise，使用 catch 处理失败
  uni.navigateBack({ delta: 1 }).catch(() => {
    // 返回失败时静默处理
  });
  // #endif
}
</script>

<template>
  <view
    :class="shellClass"
    :style="shellStyle"
    role="main"
    :aria-label="title || subtitle || ''"
  >
    <!-- 头部（仅 standard 变体显示） -->
    <view
      v-if="variant === 'standard'"
      class="shell__header"
      :style="headerStyle"
      role="banner"
      :aria-label="title || subtitle || ''"
    >
      <!-- 自定义头部插槽 -->
      <slot name="header">
        <view class="shell__header-main">
          <view
            v-if="showBack"
            class="shell__back"
            hover-class="shell__back--pressed"
            :hover-stay-time="80"
            @tap="handleBack"
            role="button"
            :aria-label="t('common.back')"
          >
            <image
              class="shell__back-icon"
              :src="IMAGE_PATHS.ICONS_COMMON.BACK"
              mode="aspectFit" alt=""
            />
            <text class="shell__back-text">{{ t('common.back') }}</text>
          </view>
          <text v-if="subtitle" class="shell__eyebrow">{{ subtitle }}</text>
          <text v-if="title" class="shell__title">{{ title }}</text>
        </view>
      </slot>
      <view class="shell__header-right">
        <slot name="header-right" />
      </view>
    </view>

    <!-- 沉浸型变体：仅占位状态栏安全区 -->
    <view
      v-else-if="variant === 'immersive' && safeArea"
      class="shell__safe-top"
      :style="{ height: 'env(safe-area-inset-top)' }"
    />

    <!-- 主体内容 -->
    <view class="shell__body" :style="{ paddingBottom: bodyPaddingBottom }">
      <slot />
    </view>

    <!-- 底部插槽 -->
    <view v-if="$slots.footer" class="shell__footer">
      <slot name="footer" />
    </view>
  </view>
</template>

<style scoped lang="scss">
.shell {
  min-height: 100%;
  height: 100%;
  box-sizing: border-box;
  // 默认页面背景
  background: var(--c-bg-page, #F4F6FA);
}

// 背景变体
.shell-bg--default {
  background: var(--c-bg-page, #F4F6FA);
}

.shell-bg--gradient {
  // 品牌色到背景色的渐变
  background: linear-gradient(
    180deg,
    var(--c-bg-brand, #E8F8F0) 0%,
    var(--c-bg-page, #F4F6FA) 280rpx
  );
}

.shell-bg--image {
  // 背景图通过 inline style 注入
  background-color: var(--c-bg-page, #F4F6FA);
}

// 变体内边距
.shell--standard {
  padding: 0 28rpx;
}

.shell--immersive {
  padding: 0;
}

.shell--minimal {
  padding: 0 28rpx;
}

// 头部
.shell__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24rpx;
  margin-bottom: 28rpx;
}

.shell__header-main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.shell__back {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  align-self: flex-start;
  margin-bottom: 16rpx;
  padding: 20rpx 24rpx 20rpx 16rpx;
  /* 修复 P2（触摸目标过小）：min-height/min-width 确保 ≥88rpx（44px @2x），满足 iOS HIG / Material Design 标准 */
  min-height: 88rpx;
  min-width: 88rpx;
  border-radius: 999rpx;
  background: var(--c-bg-container, #FFFFFF);
  border: 1rpx solid var(--c-border-light, var(--c-neutral-shadow-xs, var(--c-neutral-shadow-xs, rgba(15, 23, 42, 0.04))));
}

.shell__back--pressed {
  opacity: 0.7;
}

.shell__back-icon {
  width: 40rpx;
  height: 40rpx;
}

.shell__back-text {
  font-size: 24rpx;
  color: var(--c-brand, #3FCF8E);
  font-weight: 500;
}

.shell__eyebrow {
  display: block;
  color: var(--c-text-secondary, #5B6470);
  font-size: 24rpx;
  margin-bottom: 8rpx;
  letter-spacing: 0;
}

.shell__title {
  display: block;
  font-size: 44rpx;
  font-weight: 700;
  color: var(--c-text-primary, #1F2329);
}

.shell__body {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.shell__footer {
  margin-top: auto;
}

// 页面淡入动画
.page-fade-in {
  animation: page-fade-in 0.3s ease-out;
}

@keyframes page-fade-in {
  from {
    opacity: 0;
    transform: translateY(8rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
