<template>
  <!--
    统一页面状态容器 PageStateContainer
    - 支持 loading / error / empty / content 四种状态
    - 状态切换淡入淡出
    - 复用 EmptyState、ErrorState 组件
  -->
  <view
    class="page-state-container"
    <!-- #ifdef H5 -->
    role="region"
    :aria-busy="state === 'loading'"
    :aria-label="regionAriaLabel"
    <!-- #endif -->
  >
    <!-- 加载态 -->
    <view v-if="state === 'loading'" class="state-slot state-loading">
      <slot name="loading">
        <view class="loading-default">
          <view class="loading-spinner" />
          <text class="loading-text">{{ loadingText }}</text>
        </view>
      </slot>
    </view>

    <!-- 错误态 -->
    <view v-else-if="state === 'error'" class="state-slot state-error">
      <slot name="error">
        <ErrorState
          :description="errorText"
          :image="errorImage"
          :retryable="retryable"
          @retry="handleRetry"
        />
      </slot>
    </view>

    <!-- 空态 -->
    <view v-else-if="state === 'empty'" class="state-slot state-empty">
      <slot name="empty">
        <EmptyState
          :description="emptyText"
          :image="emptyImage"
        />
      </slot>
    </view>

    <!-- 内容态 -->
    <view v-else class="state-slot state-content">
      <slot />
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * PageStateContainer 统一页面状态管理组件
 *
 * 使用方式：
 * <PageStateContainer :state="currentState" @retry="loadData">
 *   <MyList :data="data" />
 * </PageStateContainer>
 *
 * state 取值：loading | error | empty | content
 */

import { computed } from "vue";
import { useI18n } from "vue-i18n";
import ErrorState from "./ErrorState.vue";
import EmptyState from "./EmptyState.vue";

interface Props {
  /** 当前状态 */
  state: "loading" | "error" | "empty" | "content";
  /** 加载中文案 */
  loadingText?: string;
  /** 错误文案 */
  errorText?: string;
  /** 错误态图片 */
  errorImage?: string;
  /** 空态文案 */
  emptyText?: string;
  /** 空态图片 */
  emptyImage?: string;
  /** 是否显示重试按钮 */
  retryable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loadingText: "",
  errorText: "",
  errorImage: "",
  emptyText: "",
  emptyImage: "",
  retryable: true,
});

const { t } = useI18n();

const loadingText = computed(() => props.loadingText || t("common.loading"));
const errorText = computed(() => props.errorText || t("messages.loadFailed"));
const emptyText = computed(() => props.emptyText || t("common.noData"));

const regionAriaLabel = computed(() => {
  if (props.state === "loading") return loadingText.value;
  if (props.state === "error") return errorText.value;
  if (props.state === "empty") return emptyText.value;
  return "";
});

const emit = defineEmits<{
  (e: "retry"): void;
}>();

/** 处理重试事件 */
function handleRetry(): void {
  emit("retry");
}
</script>

<style lang="scss" scoped>
.page-state-container {
  width: 100%;
  min-height: 320rpx;
  position: relative;
}

.state-slot {
  width: 100%;
  // 状态切换淡入动画
  animation: state-fade-in 0.24s ease-out;
}

.state-loading,
.state-error,
.state-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320rpx;
  padding: 48rpx 32rpx;
}

.loading-default {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;

  .loading-spinner {
    width: 56rpx;
    height: 56rpx;
    border: 4rpx solid var(--c-divider-light, rgba(15, 23, 42, 0.06));
    border-top-color: var(--c-brand, #3FCF8E);
    border-radius: 50%;
    animation: spinner-rotate 0.8s linear infinite;
  }

  .loading-text {
    font-size: 26rpx;
    color: var(--c-text-tertiary, #9AA1AB);
  }
}

@keyframes state-fade-in {
  from {
    opacity: 0;
    transform: translateY(8rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes spinner-rotate {
  to {
    transform: rotate(360deg);
  }
}
</style>
