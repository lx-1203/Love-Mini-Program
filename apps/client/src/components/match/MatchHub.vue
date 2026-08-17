<script setup lang="ts">
/**
 * 匹配中心 Hub（v3.1 契约 §11/§19 页面 03）。
 * 展示：绿 Hero、今日剩余/已喜欢、在线速配卡、关系进度、开始匹配。
 */
withDefaults(
  defineProps<{
    remaining: number;
    used: number;
    onlineCount: number;
    crushing: number;
    matched: number;
    whispers: number;
  }>(),
  { remaining: 0, used: 0, onlineCount: 0, crushing: 0, matched: 0, whispers: 0 }
);

const emit = defineEmits<{ (e: "start"): void; (e: "onlineStart"): void }>();
</script>

<template>
  <view class="match-hub">
    <view class="match-hub__hero">
      <text class="match-hub__title">寻觅</text>
      <text class="match-hub__subtitle">正在为你寻找同频的那个人</text>
      <view class="match-hub__quota">
        <view class="match-hub__quota-item">
          <text class="match-hub__quota-value">{{ remaining }}</text>
          <text class="match-hub__quota-label">今日剩余（次）</text>
        </view>
        <view class="match-hub__quota-divider" />
        <view class="match-hub__quota-item">
          <text class="match-hub__quota-value">{{ used }}</text>
          <text class="match-hub__quota-label">今日已喜欢（人）</text>
        </view>
      </view>
      <view class="match-hub__start press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="emit('start')">
        <text class="match-hub__start-text">开始匹配</text>
      </view>
    </view>

    <view class="match-hub__online press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="emit('onlineStart')">
      <view class="match-hub__online-dot" />
      <view class="match-hub__online-body">
        <text class="match-hub__online-title">现在在线</text>
        <text class="match-hub__online-desc">有 {{ onlineCount }} 位匹配度较高的人在线</text>
      </view>
      <text class="match-hub__online-cta">立即匹配</text>
    </view>

    <view class="match-hub__relation">
      <text class="match-hub__relation-title">关系进度</text>
      <view class="match-hub__relation-row">
        <view class="match-hub__relation-item">
          <text class="match-hub__relation-value">{{ crushing }}</text>
          <text class="match-hub__relation-label">心动中</text>
        </view>
        <view class="match-hub__relation-item">
          <text class="match-hub__relation-value">{{ matched }}</text>
          <text class="match-hub__relation-label">已匹配</text>
        </view>
        <view class="match-hub__relation-item">
          <text class="match-hub__relation-value">{{ whispers }}</text>
          <text class="match-hub__relation-label">悄悄话</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.match-hub {
  margin: 0 32rpx 24rpx;
}

.match-hub__hero {
  padding: 40rpx 32rpx 32rpx;
  border-radius: 40rpx;
  background: linear-gradient(135deg, #36C99A 0%, #B8EFD9 100%);
}

.match-hub__title {
  display: block;
  font-size: 48rpx;
  font-weight: 900;
  color: #FFFFFF;
}

.match-hub__subtitle {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.94);
}

.match-hub__quota {
  display: flex;
  align-items: center;
  margin-top: 28rpx;
  padding: 20rpx 24rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.22);
}

.match-hub__quota-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}

.match-hub__quota-value {
  font-size: 36rpx;
  font-weight: 900;
  color: #FFFFFF;
}

.match-hub__quota-label {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.9);
}

.match-hub__quota-divider {
  width: 2rpx;
  height: 48rpx;
  background: rgba(255, 255, 255, 0.35);
}

.match-hub__start {
  margin-top: 24rpx;
  height: 88rpx;
  border-radius: 44rpx;
  background: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
}

.match-hub__start-text {
  font-size: 30rpx;
  font-weight: 800;
  color: #36C99A;
}

.match-hub__online {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 20rpx;
  padding: 24rpx;
  border-radius: 28rpx;
  background: #FFFFFF;
  box-shadow: 0 8rpx 24rpx rgba(61, 201, 148, 0.08);
}

.match-hub__online-dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  background: #36C99A;
  box-shadow: 0 0 0 8rpx rgba(61, 201, 148, 0.15);
  flex-shrink: 0;
}

.match-hub__online-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.match-hub__online-title {
  font-size: 28rpx;
  font-weight: 800;
  color: #222222;
}

.match-hub__online-desc {
  font-size: 22rpx;
  color: #666666;
}

.match-hub__online-cta {
  font-size: 24rpx;
  font-weight: 700;
  color: #36C99A;
}

.match-hub__relation {
  margin-top: 20rpx;
  padding: 24rpx;
  border-radius: 28rpx;
  background: #FFFFFF;
  box-shadow: 0 8rpx 24rpx rgba(61, 201, 148, 0.06);
}

.match-hub__relation-title {
  display: block;
  font-size: 26rpx;
  font-weight: 800;
  color: #222222;
}

.match-hub__relation-row {
  display: flex;
  margin-top: 16rpx;
}

.match-hub__relation-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}

.match-hub__relation-value {
  font-size: 32rpx;
  font-weight: 900;
  color: #36C99A;
}

.match-hub__relation-label {
  font-size: 20rpx;
  color: #666666;
}
</style>
