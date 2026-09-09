<template>
  <view class="loading-spinner-wrap" role="status" aria-live="polite">
    <view class="loading-spinner-ring" />
    <text v-if="text" class="loading-spinner-text">{{ text }}</text>
  </view>
</template>

<script setup lang="ts">
/**
 * 2026-09-06 全站加载态统一：圆圈转圈（可选文案）。
 *
 * 背景：用户反馈各页加载态不一致（骨架屏 / 文案 / 纯白转场混杂），
 * 统一为圆圈转圈样式；PageStateContainer 默认 loading 槽已切换为本组件，
 * 各页自绘 loading 也应复用本组件（或保持同名 .loading-spinner 视觉）。
 */
withDefaults(defineProps<{
  /** 加载中文案（可选） */
  text?: string;
}>(), {
  text: "",
});
</script>

<style scoped lang="scss">
.loading-spinner-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  padding: 80rpx 0;
}

.loading-spinner-ring {
  width: 56rpx;
  height: 56rpx;
  border: 5rpx solid rgba(32, 201, 151, 0.18);
  border-top-color: #20c997;
  border-radius: 50%;
  animation: loading-spinner-rotate 900ms linear infinite;
}

.loading-spinner-text {
  font-size: 26rpx;
  color: #9aa39f;
}

@keyframes loading-spinner-rotate {
  to {
    transform: rotate(360deg);
  }
}
</style>
