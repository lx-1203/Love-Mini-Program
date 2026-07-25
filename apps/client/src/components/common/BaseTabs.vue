<template>
  <!--
    统一标签页组件 BaseTabs
    - 支持三种样式变体：underline（下划线）、pill（胶囊）、block（块状）
    - 支持横向滚动（scrollable）和等分宽度（equalSplit）
    - 支持徽章（数字 > 99 显示 99+）
    - 通过 CSS 变量适配暗色主题
  -->
  <view
    class="base-tabs"
    :class="[`base-tabs--${variant}`, { 'is-scrollable': scrollable }]"
    <!-- #ifdef H5 -->
    role="tablist"
    <!-- #endif -->
  >
    <scroll-view
      v-if="scrollable"
      scroll-x
      :scroll-into-view="`tab-${modelValue}`"
      scroll-with-animation
      class="base-tabs-scroll"
    >
      <view class="base-tabs-list">
        <view
          v-for="tab in tabs"
          :id="`tab-${tab.key}`"
          :key="tab.key"
          class="base-tab-item"
          :class="{ 'is-active': isActive(tab.key) }"
          hover-class="base-tab-item--pressed"
          :hover-stay-time="80"
          @tap="handleClick(tab)"
          <!-- #ifdef H5 -->
          role="tab"
          :aria-selected="isActive(tab.key)"
          :aria-label="tab.label"
          <!-- #endif -->
        >
          <text class="base-tab-label">{{ tab.label }}</text>
          <view
            v-if="tab.badge !== undefined && tab.badge !== null && tab.badge !== ''"
            class="base-tab-badge"
            :style="badgeStyle"
          >{{ formatBadge(tab.badge) }}</view>
          <view v-if="variant === 'underline'" class="base-tab-underline" />
        </view>
      </view>
    </scroll-view>

    <view v-else class="base-tabs-list">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="base-tab-item"
        :class="{ 'is-active': isActive(tab.key) }"
        :style="equalSplit ? { flex: '1 1 0' } : {}"
        hover-class="base-tab-item--pressed"
        :hover-stay-time="80"
        @tap="handleClick(tab)"
        <!-- #ifdef H5 -->
        role="tab"
        :aria-selected="isActive(tab.key)"
        :aria-label="tab.label"
        <!-- #endif -->
      >
        <text class="base-tab-label">{{ tab.label }}</text>
        <view
          v-if="tab.badge !== undefined && tab.badge !== null && tab.badge !== ''"
          class="base-tab-badge"
          :style="badgeStyle"
        >{{ formatBadge(tab.badge) }}</view>
        <view v-if="variant === 'underline'" class="base-tab-underline" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * BaseTabs 统一标签页组件
 *
 * 使用方式：
 * <BaseTabs v-model="activeKey" :tabs="tabs" variant="underline" />
 */

import { computed } from "vue";

/** 单个 Tab 配置 */
export interface BaseTab {
  /** 唯一标识 */
  key: string;
  /** 显示文本 */
  label: string;
  /** 可选徽章：数字（>99 显示 99+）或字符串 */
  badge?: number | string;
}

interface Props {
  /** Tab 列表 */
  tabs: BaseTab[];
  /** 当前激活的 tab key（v-model） */
  modelValue: string;
  /** 样式变体：underline（下划线）/ pill（胶囊）/ block（块状） */
  variant?: "underline" | "pill" | "block";
  /** 是否支持横向滚动（默认 false，与 equalSplit 互斥） */
  scrollable?: boolean;
  /** 是否等分宽度（默认 true，scrollable=true 时失效） */
  equalSplit?: boolean;
  /** 激活颜色（默认使用品牌色 CSS 变量） */
  activeColor?: string;
  /** 徽章背景色（默认使用品牌色） */
  badgeColor?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: "underline",
  scrollable: false,
  equalSplit: true,
  activeColor: "",
  badgeColor: "",
});

const emit = defineEmits<{
  (e: "update:modelValue", key: string): void;
  (e: "change", key: string, tab: BaseTab): void;
}>();

/** 当前激活颜色：优先使用 props 传入，否则使用品牌色 CSS 变量 */
const activeColorValue = computed(() => props.activeColor || "var(--c-brand, #3FCF8E)");
const badgeColorValue = computed(() => props.badgeColor || "var(--c-brand, #3FCF8E)");

/** 徽章内联样式 */
const badgeStyle = computed(() => ({
  backgroundColor: badgeColorValue.value,
}));

/** 判断 tab 是否激活 */
function isActive(key: string): boolean {
  return key === props.modelValue;
}

/** 处理 tab 点击 */
function handleClick(tab: BaseTab): void {
  if (isActive(tab.key)) return;
  emit("update:modelValue", tab.key);
  emit("change", tab.key, tab);
}

/** 格式化徽章显示：数字超过 99 显示 99+ */
function formatBadge(badge: number | string): string {
  if (typeof badge === "number") {
    if (badge > 99) return "99+";
    return String(badge);
  }
  return badge;
}
</script>

<style lang="scss" scoped>
.base-tabs {
  width: 100%;
  // 使用 design tokens，自动适配主题
  background: var(--c-bg-container, #FFFFFF);

  &.is-scrollable {
    .base-tabs-list {
      display: inline-flex;
      white-space: nowrap;
    }
  }
}

.base-tabs-list {
  display: flex;
  align-items: center;
  width: 100%;
  // 底部分隔线
  border-bottom: 1rpx solid var(--c-divider-light, rgba(15, 23, 42, 0.06));
}

.base-tab-item {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 20rpx 24rpx;
  // 过渡动画
  transition: all 0.3s ease;

  /* mp-weixin hover-class 按压态；H5 通过 :active 实现 */
  &--pressed {
    opacity: 0.7;
  }

  .base-tab-label {
    font-size: 28rpx;
    color: var(--c-text-secondary, #5B6470);
    transition: color 0.3s ease, font-weight 0.3s ease;
  }

  .base-tab-badge {
    margin-left: 8rpx;
    min-width: 32rpx;
    height: 32rpx;
    padding: 0 8rpx;
    border-radius: 16rpx;
    font-size: 22rpx;
    color: var(--c-text-inverse, #FFFFFF);
    line-height: 32rpx;
    text-align: center;
  }

  .base-tab-underline {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%) scaleX(0);
    width: 48rpx;
    height: 4rpx;
    border-radius: 2rpx;
    background: var(--c-brand, #3FCF8E);
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  &.is-active {
    .base-tab-label {
      color: var(--c-text-primary, #1F2329);
      font-weight: 600;
    }

    .base-tab-underline {
      transform: translateX(-50%) scaleX(1);
    }
  }
}

// 胶囊变体
.base-tabs--pill {
  .base-tabs-list {
    border-bottom: none;
    gap: 16rpx;
    padding: 16rpx 24rpx;
  }

  .base-tab-item {
    padding: 12rpx 32rpx;
    border-radius: 999rpx;
    background: var(--c-bg-page, #F4F6FA);

    .base-tab-label {
      font-size: 26rpx;
    }

    &.is-active {
      background: var(--c-brand, #3FCF8E);

      .base-tab-label {
        color: var(--c-text-inverse, #FFFFFF);
      }
    }
  }
}

// 块状变体
.base-tabs--block {
  .base-tabs-list {
    border-bottom: none;
    gap: 12rpx;
    padding: 16rpx 24rpx;
  }

  .base-tab-item {
    padding: 16rpx 24rpx;
    border-radius: 12rpx;
    background: var(--c-bg-page, #F4F6FA);

    .base-tab-label {
      font-size: 26rpx;
    }

    &.is-active {
      background: var(--c-brand, #3FCF8E);

      .base-tab-label {
        color: var(--c-text-inverse, #FFFFFF);
      }
    }
  }
}

// scroll-view 兼容
.base-tabs-scroll {
  width: 100%;
  white-space: nowrap;
}
</style>
