<script setup lang="ts">
const props = withDefaults(defineProps<{
  percent: number;
}>(), {
  percent: 0,
});

const emit = defineEmits<{ (e: "complete"): void }>();
</script>

<template>
  <view class="my-completion" hover-class="my-completion--pressed" @tap="emit('complete')">
    <view class="my-completion__head">
      <text class="my-completion__title">资料完整度</text>
      <text class="my-completion__percent">{{ props.percent }}%</text>
    </view>
    <view class="my-completion__bar">
      <view class="my-completion__bar-inner" :style="{ width: `${Math.min(100, Math.max(0, props.percent))}%` }" />
    </view>
    <view class="my-completion__foot">
      <text class="my-completion__tip">完善资料可以获得更多曝光和匹配机会</text>
      <view class="my-completion__btn">
        <text class="my-completion__btn-text">去完善</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.my-completion {
  margin: 32rpx 32rpx 0;
  padding: 28rpx 32rpx;
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.08);
}

.my-completion--pressed {
  opacity: 0.92;
}

.my-completion__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.my-completion__title {
  font-size: 30rpx;
  font-weight: 800;
  color: #333A37;
}

.my-completion__percent {
  font-size: 30rpx;
  font-weight: 800;
  color: #36C99A;
}

.my-completion__bar {
  height: 10rpx;
  margin-top: 20rpx;
  border-radius: 999rpx;
  background: #E8FBF3;
  overflow: hidden;
}

.my-completion__bar-inner {
  height: 100%;
  border-radius: 999rpx;
  background: #36C99A;
}

.my-completion__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 18rpx;
}

.my-completion__tip {
  flex: 1;
  font-size: 20rpx;
  color: #9AA39F;
  padding-right: 16rpx;
}

.my-completion__btn {
  flex-shrink: 0;
  padding: 12rpx 26rpx;
  border-radius: 999rpx;
  background: #36C99A;
}

.my-completion__btn-text {
  font-size: 22rpx;
  font-weight: 700;
  color: #ffffff;
}
</style>
