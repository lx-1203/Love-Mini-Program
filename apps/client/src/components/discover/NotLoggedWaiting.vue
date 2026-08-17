<script setup lang="ts">

import XunmiMascot from "../common/XunmiMascot.vue";

const emit = defineEmits<{ (e: "goLogin"): void }>();

const FEATURES = [
  { icon: "♥", label: "精确匹配", color: "#FF6B81" },
  { icon: "💬", label: "聊天互动", color: "#36C99A" },
  { icon: "🎓", label: "校园趣遇", color: "#4D8DFF" },
  { icon: "📈", label: "关系成长", color: "#FF9A57" },
];

function goLogin() {
  emit("goLogin");
}
</script>

<template>
  <view class="not-logged">
    <view class="not-logged__head">
      <text class="not-logged__title">正在为你寻找同频的那个人</text>
      <text class="not-logged__sub">附近有 12 位同频的你</text>
    </view>

    <!-- 寻觅芽吉祥物（挥手） -->
    <view class="not-logged__art">
      <XunmiMascot mood="waving" size="xl" animated />
    </view>

    <text class="not-logged__tip">登录后即可解锁全部功能</text>

    <view class="not-logged__features">
      <view v-for="f in FEATURES" :key="f.label" class="not-logged__feature">
        <view class="not-logged__feature-icon" :style="{ background: `${f.color}1F` }">
          <text class="not-logged__feature-icon-text" :style="{ color: f.color }">{{ f.icon }}</text>
        </view>
        <text class="not-logged__feature-label">{{ f.label }}</text>
      </view>
    </view>

    <view class="not-logged__actions">
      <view class="not-logged__btn not-logged__btn--wx" hover-class="not-logged__btn--pressed" @tap="goLogin">
        <text class="not-logged__btn-text not-logged__btn-text--dark">微信一键登录</text>
      </view>
      <view class="not-logged__btn not-logged__btn--phone" hover-class="not-logged__btn--pressed" @tap="goLogin">
        <text class="not-logged__btn-text not-logged__btn-text--green">手机号登录</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.not-logged {
  padding: 48rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.not-logged__head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.not-logged__title {
  font-size: 34rpx;
  font-weight: 800;
  color: #36C99A;
  text-align: center;
}

.not-logged__sub {
  font-size: 24rpx;
  color: #999999;
}

.not-logged__art {
  position: relative;
  width: 320rpx;
  height: 280rpx;
  margin-top: 32rpx;
  border-radius: 48rpx;
  background: linear-gradient(180deg, #E8FBF2 0%, #FFFFFF 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.not-logged__art-emoji {
  font-size: 140rpx;
}

.not-logged__art-heart {
  position: absolute;
  right: 40rpx;
  top: 40rpx;
  font-size: 56rpx;
}

.not-logged__tip {
  margin-top: 24rpx;
  font-size: 24rpx;
  color: #8A9694;
}

.not-logged__features {
  display: flex;
  gap: 20rpx;
  margin-top: 40rpx;
  width: 100%;
}

.not-logged__feature {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.not-logged__feature-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.not-logged__feature-icon-text {
  font-size: 40rpx;
  font-weight: 800;
}

.not-logged__feature-label {
  font-size: 22rpx;
  color: #666666;
  font-weight: 600;
}

.not-logged__actions {
  display: flex;
  gap: 20rpx;
  margin-top: 48rpx;
  width: 100%;
}

.not-logged__btn {
  flex: 1;
  height: 92rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.not-logged__btn--pressed {
  opacity: 0.85;
}

.not-logged__btn--wx {
  background: #36C99A;
}

.not-logged__btn--phone {
  background: #ffffff;
  border: 2rpx solid #36C99A;
}

.not-logged__btn-text {
  font-size: 28rpx;
  font-weight: 700;
}

.not-logged__btn-text--dark {
  color: #ffffff;
}

.not-logged__btn-text--green {
  color: #168B65;
}
</style>
