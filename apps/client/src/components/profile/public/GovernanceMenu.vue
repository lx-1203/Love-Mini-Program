<script setup lang="ts">
/**
 * 他人主页治理菜单（v3.1 契约 §8）。
 * 展示：举报 / 拉黑 / 取消匹配（仅已匹配显示）。
 */
withDefaults(
  defineProps<{
    visible: boolean;
    matched?: boolean;
  }>(),
  { visible: false, matched: false }
);

const emit = defineEmits<{
  (e: "close"): void;
  (e: "report"): void;
  (e: "block"): void;
  (e: "unmatch"): void;
}>();
</script>

<template>
  <view v-if="visible" class="governance-mask" @tap="emit('close')">
    <view class="governance-sheet" @tap.stop>
      <view class="governance-sheet__title">更多操作</view>
      <view class="governance-sheet__item" @tap="emit('report')">举报</view>
      <view class="governance-sheet__item" @tap="emit('block')">拉黑</view>
      <view v-if="matched" class="governance-sheet__item governance-sheet__item--danger" @tap="emit('unmatch')">
        取消匹配
      </view>
      <view class="governance-sheet__cancel" @tap="emit('close')">取消</view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.governance-mask {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-end;
}

.governance-sheet {
  width: 100%;
  background: #FFFFFF;
  border-radius: 32rpx 32rpx 0 0;
  padding: 24rpx 0 calc(env(safe-area-inset-bottom) + 24rpx);
}

.governance-sheet__title {
  text-align: center;
  font-size: 24rpx;
  color: #666666;
  padding-bottom: 12rpx;
}

.governance-sheet__item {
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  color: #222222;
  border-top: 1rpx solid #F0F3F2;
}

.governance-sheet__item--danger {
  color: #E94D87;
}

.governance-sheet__cancel {
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  font-weight: 700;
  color: #222222;
  border-top: 12rpx solid #F7FAF9;
}
</style>
