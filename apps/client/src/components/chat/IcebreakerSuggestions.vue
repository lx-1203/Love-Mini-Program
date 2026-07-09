<script setup lang="ts">
/**
 * IcebreakerSuggestions - 破冰话题建议组件
 *
 * 在聊天输入框上方展示 3 个基于对方资料的个性化破冰话题。
 * 点击话题可一键发送到输入框，支持横向滚动和"换话题"刷新。
 * 使用品牌色系但保持柔和，不刺眼。
 */
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
</script>

<template>
  <view class="icebreaker-suggestions">
    <!-- 标题行 -->
    <view class="icebreaker__header">
      <text class="icebreaker__label">破冰话题</text>
      <view class="icebreaker__header-right">
        <text v-if="loading" class="icebreaker__loading-hint">推荐中...</text>
        <view class="icebreaker__refresh-btn" @tap="emit('refresh')">
          <text class="icebreaker__refresh-icon">&#x21bb;</text>
          <text class="icebreaker__refresh-text">换话题</text>
        </view>
      </view>
    </view>

    <!-- 加载态 -->
    <view v-if="loading && items.length === 0" class="icebreaker__loading">
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
      <view class="icebreaker__list">
        <view
          v-for="item in items"
          :key="item.id"
          class="icebreaker__card"
          @tap="emit('select', item.content)"
        >
          <view class="icebreaker__card-badge">
            <text class="icebreaker__card-badge-text">{{ item.category }}</text>
          </view>
          <text class="icebreaker__card-content">{{ item.content }}</text>
          <text class="icebreaker__card-hint">点击发送</text>
        </view>
      </view>
    </scroll-view>

    <!-- 空态 -->
    <view v-else class="icebreaker__empty">
      <text class="icebreaker__empty-text">暂无推荐话题，试试点击"换话题"</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.icebreaker-suggestions {
  padding: 20rpx 24rpx;
  border-radius: 20rpx 20rpx 0 0;
  background: linear-gradient(
    135deg,
    rgba(37, 99, 235, 0.04),
    rgba(91, 127, 255, 0.03)
  );
  border-bottom: 1px solid rgba(37, 99, 235, 0.06);
}

/* ========== 标题行 ========== */
.icebreaker__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.icebreaker__label {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--c-brand);
  letter-spacing: 0.5rpx;
}

.icebreaker__header-right {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.icebreaker__loading-hint {
  font-size: 22rpx;
  color: var(--c-text-tertiary);
}

.icebreaker__refresh-btn {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 8rpx 16rpx;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.08);
  transition: background 0.2s;
}

.icebreaker__refresh-btn:active {
  background: rgba(37, 99, 235, 0.14);
}

.icebreaker__refresh-icon {
  font-size: 22rpx;
  font-weight: 700;
  color: var(--c-brand);
}

.icebreaker__refresh-text {
  font-size: 22rpx;
  color: var(--c-brand);
  font-weight: 600;
}

/* ========== 横向滚动 ========== */
.icebreaker__scroll {
  width: 100%;
}

.icebreaker__list {
  display: flex;
  gap: 16rpx;
  padding-right: 24rpx;
}

/* ========== 话题卡片 ========== */
.icebreaker__card {
  flex-shrink: 0;
  width: 360rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  padding: 22rpx 24rpx;
  border-radius: 24rpx;
  background: #ffffff;
  border: 1rpx solid rgba(37, 99, 235, 0.08);
  box-shadow: 0 2rpx 12rpx rgba(37, 99, 235, 0.04);
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.icebreaker__card:active {
  transform: scale(0.97);
  border-color: var(--c-brand-200);
  box-shadow: 0 4rpx 16rpx rgba(37, 99, 235, 0.06);
}

.icebreaker__card-badge {
  align-self: flex-start;
  display: inline-flex;
  padding: 4rpx 12rpx;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(37, 99, 235, 0.04));
}

.icebreaker__card-badge-text {
  font-size: 20rpx;
  color: var(--c-brand);
  font-weight: 600;
}

.icebreaker__card-content {
  font-size: 26rpx;
  color: var(--c-text-primary);
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.icebreaker__card-hint {
  font-size: 20rpx;
  color: var(--c-text-tertiary);
}

/* ========== 加载骨架 ========== */
.icebreaker__loading {
  display: flex;
  gap: 16rpx;
}

.icebreaker__skeleton {
  flex-shrink: 0;
  width: 360rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding: 20rpx 22rpx;
  border-radius: 18rpx;
  background: #ffffff;
  border: 1px solid rgba(37, 99, 235, 0.06);
}

.icebreaker__skeleton-line {
  height: 22rpx;
  border-radius: 6rpx;
  background: linear-gradient(
    90deg,
    rgba(37, 99, 235, 0.04) 25%,
    rgba(37, 99, 235, 0.08) 50%,
    rgba(37, 99, 235, 0.04) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
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
  padding: 32rpx 0;
  text-align: center;
}

.icebreaker__empty-text {
  font-size: 24rpx;
  color: var(--c-text-tertiary);
}
</style>