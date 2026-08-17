<template>
  <view class="nearby-section">
    <view class="nearby-section__head">
      <text class="nearby-section__title">{{ title }}</text>
      <view
        v-if="moreText"
        class="nearby-section__more press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="moreText"
        @tap="$emit('more')"
      >
        <text class="nearby-section__more-text">{{ moreText }}</text>
        <text class="nearby-section__more-arrow">›</text>
      </view>
    </view>
    <slot />
  </view>
</template>

<script setup lang="ts">
/**
 * NearbySection — 附近首页统一分区（v3 Nearby 冻结）
 * 标题 + 右侧「全部/查看全部」+ 内容插槽，保证首页分区视觉一致。
 */
withDefaults(
  defineProps<{
    title: string;
    moreText?: string;
  }>(),
  { moreText: "" }
);

defineEmits<{ (e: "more"): void }>();
</script>

<style scoped lang="scss">
.nearby-section {
  margin-top: 32rpx;
}

.nearby-section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4rpx 16rpx;
}

.nearby-section__title {
  font-size: 30rpx;
  font-weight: 800;
  color: var(--c-text-primary, #222222);
}

.nearby-section__more {
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.nearby-section__more-text {
  font-size: 22rpx;
  color: var(--c-text-tertiary, #666666);
}

.nearby-section__more-arrow {
  font-size: 26rpx;
  color: var(--c-text-quaternary, #C8CFCD);
}
</style>
