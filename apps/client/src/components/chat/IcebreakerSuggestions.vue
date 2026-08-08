<script setup lang="ts">
/**
 * IcebreakerSuggestions - 破冰话题建议组件
 *
 * 在聊天输入框上方展示 3 个基于对方资料的个性化破冰话题。
 * 点击话题可一键发送到输入框，支持横向滚动和"换话题"刷新。
 * 使用品牌色系但保持柔和，不刺眼。
 */
import { useI18n } from "vue-i18n";

defineProps<{
  /** 破冰话题项列表 */
  items: Array<{
    id: number;
    content: string;
    category: string;
    source: string;
  }>;
  /** 是否正在加载 */
  loading: boolean;
}>();

const emit = defineEmits<{
  /** 选中某个话题，传出话题内容 */
  select: [content: string];
  /** 请求刷新话题 */
  refresh: [];
}>();

const { t } = useI18n();
</script>

<template>
  <view class="icebreaker-suggestions">
    <!-- 标题行 -->
    <view class="icebreaker__header">
      <text class="icebreaker__label">{{ t('chat.icebreakerTitle') }}</text>
      <view class="icebreaker__header-right">
        <text v-if="loading" class="icebreaker__loading-hint">{{ t('chat.icebreakerLoading') }}</text>
        <view
          class="icebreaker__refresh-btn"
          @tap="emit('refresh')"
          role="button"
          :aria-label="t('chat.icebreakerRefreshAria')"
        >
          <text class="icebreaker__refresh-icon">&#x21bb;</text>
          <text class="icebreaker__refresh-text">{{ t('chat.icebreakerRefresh') }}</text>
        </view>
      </view>
    </view>

    <!-- 加载态 -->
    <view
      v-if="loading && items.length === 0"
      class="icebreaker__loading"
      role="status"
      aria-live="polite"
      :aria-label="t('chat.icebreakerLoading')"
    >
      <view class="icebreaker__skeleton" v-for="n in 3" :key="n">
        <view class="icebreaker__skeleton-line" />
        <view class="icebreaker__skeleton-line icebreaker__skeleton-line--short" />
      </view>
    </view>

    <!-- 话题卡片列表：横向滚动 -->
    <scroll-view
      v-else-if="items.length > 0"
      class="icebreaker__scroll"
      scroll-x
      :show-scrollbar="false"
      :enhanced="true"
    >
      <view class="icebreaker__list" role="list">
        <view
          v-for="item in items"
          :key="item.id"
          class="icebreaker__card"
          @tap="emit('select', item.content)"
          role="button"
          :aria-label="t('chat.icebreakerCardAria', { content: item.content })"
        >
          <view class="icebreaker__card-badge">
            <text class="icebreaker__card-badge-text">{{ item.category }}</text>
          </view>
          <text class="icebreaker__card-content">{{ item.content }}</text>
          <text class="icebreaker__card-hint">{{ t('chat.icebreakerCardHint') }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 空态 -->
    <view
      v-else
      class="icebreaker__empty"
      role="status"
      aria-live="polite"
    >
      <text class="icebreaker__empty-text">{{ t('chat.icebreakerEmpty') }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.icebreaker-suggestions {
  padding: var(--sp-5) var(--sp-6);
  border-radius: var(--r-lg, 20rpx) var(--r-lg, 20rpx) 0 0;
  background: linear-gradient(
    135deg,
    var(--c-secondary-blue-bg-tint, var(--c-secondary-blue-bg-tint, rgba(37, 99, 235, 0.04))),
    var(--c-secondary-blue-bg-tint, var(--c-secondary-blue-bg-tint, rgba(91, 127, 255, 0.03)))
  );
  border-bottom: 1px solid var(--c-secondary-blue-bg-tint, var(--c-secondary-blue-bg-tint, rgba(37, 99, 235, 0.06)));
}

/* ========== 标题行 ========== */
.icebreaker__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--sp-4);
}

.icebreaker__label {
  font-size: var(--fs-md, 26rpx);
  font-weight: 700;
  color: var(--c-brand);
  letter-spacing: 0.5rpx;
}

.icebreaker__header-right {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.icebreaker__loading-hint {
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-text-tertiary);
}

.icebreaker__refresh-btn {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  padding: var(--sp-2) var(--sp-4);
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-secondary-blue-bg-tint, var(--c-secondary-blue-bg-tint, rgba(37, 99, 235, 0.08)));
  transition: background var(--d-normal, 200ms);
}

.icebreaker__refresh-btn:active {
  background: var(--c-secondary-blue-border-tint-strong, var(--c-secondary-blue-border-tint-strong, rgba(37, 99, 235, 0.14)));
}

.icebreaker__refresh-icon {
  font-size: var(--fs-sm, 22rpx);
  font-weight: 700;
  color: var(--c-brand);
}

.icebreaker__refresh-text {
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-brand);
  font-weight: 600;
}

/* ========== 横向滚动 ========== */
.icebreaker__scroll {
  width: 100%;
}

.icebreaker__list {
  display: flex;
  gap: var(--sp-4);
  padding-right: var(--sp-6);
}

/* ========== 话题卡片 ========== */
.icebreaker__card {
  flex-shrink: 0;
  /* 卡片固定宽度（横向滚动布局），无对应 token */
  width: 360rpx;
  display: flex;
  flex-direction: column;
  /* 10rpx 无对应 token 档位，保留 */
  gap: 10rpx;
  /* 22rpx 无对应 token 档位，保留 */
  padding: 22rpx var(--sp-6);
  border-radius: var(--r-xl, 24rpx);
  background: var(--c-bg-container, #FFFFFF);
  border: 1rpx solid var(--c-secondary-blue-bg-tint, var(--c-secondary-blue-bg-tint, rgba(37, 99, 235, 0.08)));
  box-shadow: 0 2rpx 12rpx var(--c-secondary-blue-bg-tint, var(--c-secondary-blue-bg-tint, rgba(37, 99, 235, 0.04)));
  transition: all var(--d-normal, 200ms) cubic-bezier(0.34, 1.56, 0.64, 1);
}

.icebreaker__card:active {
  transform: scale(0.97);
  border-color: var(--c-brand-200);
  box-shadow: 0 4rpx 16rpx var(--c-secondary-blue-bg-tint, var(--c-secondary-blue-bg-tint, rgba(37, 99, 235, 0.06)));
}

.icebreaker__card-badge {
  align-self: flex-start;
  display: inline-flex;
  padding: var(--sp-1) var(--sp-3);
  border-radius: var(--r-full, 9999rpx);
  background: linear-gradient(135deg, var(--c-secondary-blue-bg-tint, var(--c-secondary-blue-bg-tint, rgba(37, 99, 235, 0.08))), var(--c-secondary-blue-bg-tint, var(--c-secondary-blue-bg-tint, rgba(37, 99, 235, 0.04))));
}

.icebreaker__card-badge-text {
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-brand);
  font-weight: 600;
}

.icebreaker__card-content {
  font-size: var(--fs-md, 26rpx);
  color: var(--c-text-primary);
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.icebreaker__card-hint {
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-text-tertiary);
}

/* ========== 加载骨架 ========== */
.icebreaker__loading {
  display: flex;
  gap: var(--sp-4);
}

.icebreaker__skeleton {
  flex-shrink: 0;
  /* 骨架卡片固定宽度（横向滚动布局），无对应 token */
  width: 360rpx;
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  /* 22rpx 无对应 token 档位，保留 */
  padding: var(--sp-5) 22rpx;
  border-radius: var(--r-lg, 18rpx);
  background: var(--c-bg-container, #FFFFFF);
  border: 1px solid var(--c-secondary-blue-bg-tint, var(--c-secondary-blue-bg-tint, rgba(37, 99, 235, 0.06)));
}

.icebreaker__skeleton-line {
  height: 22rpx;
  border-radius: var(--r-xs, 6rpx);
  background: linear-gradient(
    90deg,
    var(--c-secondary-blue-bg-tint, var(--c-secondary-blue-bg-tint, rgba(37, 99, 235, 0.04))) 25%,
    var(--c-secondary-blue-bg-tint, var(--c-secondary-blue-bg-tint, rgba(37, 99, 235, 0.08))) 50%,
    var(--c-secondary-blue-bg-tint, var(--c-secondary-blue-bg-tint, rgba(37, 99, 235, 0.04))) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer var(--d-particle, 1500ms) ease-in-out infinite;
}

.icebreaker__skeleton-line--short {
  width: 60%;
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* ========== 空态 ========== */
.icebreaker__empty {
  padding: var(--sp-7) 0;
  text-align: center;
}

.icebreaker__empty-text {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-tertiary);
}
</style>