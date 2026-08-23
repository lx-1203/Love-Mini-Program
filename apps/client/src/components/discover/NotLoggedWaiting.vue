<script setup lang="ts">
import { IMAGE_PATHS } from "../../config/images";

const emit = defineEmits<{ (e: "goLogin"): void }>();

function goLogin() {
  emit("goLogin");
}
</script>

<template>
  <view class="not-logged" @tap="goLogin">
    <!-- 整图背景：widthFix 完整展示 等待页面.png（人物圆环+吉祥物），不裁切 -->
    <image
      class="not-logged__bg"
      :src="IMAGE_PATHS.POSTERS.NOT_LOGGED_WAITING"
      mode="widthFix"
    />

    <!-- 底部登录按钮（整页可点即跳登录） -->
    <view class="not-logged__overlay">
      <view class="not-logged__btn" hover-class="not-logged__btn--pressed">
        <text class="not-logged__btn-text">快去登录吧</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.not-logged {
  position: relative;
  width: 100%;
  min-height: 100vh;
  overflow: hidden;
  /* 与 等待页面.png 背景色一致，避免上下留边出现生硬色块 */
  background: #f6fbfc;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.not-logged__bg {
  display: block;
  width: 100%;
  height: auto;
}

.not-logged__overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-bottom: calc(env(safe-area-inset-bottom) + 120rpx);
}

.not-logged__btn {
  width: 480rpx;
  height: 96rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #36c99a 0%, #2db97a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 32rpx rgba(54, 201, 154, 0.4);
}

.not-logged__btn--pressed {
  opacity: 0.85;
  transform: scale(0.97);
}

.not-logged__btn-text {
  font-size: 32rpx;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 2rpx;
}
</style>