<script setup lang="ts">
import type { UserProfileDTO } from "../../../types/profile";

defineProps<{ profile: UserProfileDTO }>();
const emit = defineEmits<{ (e: "tapAvatar"): void }>();
</script>

<template>
  <view class="public-hero">
    <image
      v-if="profile.media.cover"
      class="public-hero__bg"
      :src="profile.media.cover"
      mode="aspectFill"
      alt=""
    />
    <view v-else class="public-hero__bg public-hero__bg--fallback" />
    <!-- 顶部深色渐变：承托状态栏文字 -->
    <view class="public-hero__top-gradient" />
    <!-- 底部浅色渐变：衔接白色卡片 -->
    <view class="public-hero__bottom-gradient" />

    <view class="public-hero__avatar" @tap="emit('tapAvatar')">
      <image
        v-if="profile.basic.avatar"
        class="public-hero__avatar-img"
        :src="profile.basic.avatar"
        mode="aspectFill"
        alt=""
      />
      <text v-else class="public-hero__avatar-initial">{{ (profile.basic.name || "?").charAt(0) }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.public-hero {
  position: relative;
  width: 100%;
  /* 理想图：宽幅横版风景大图（封面放大，沉浸式） */
  height: 640rpx;
}

.public-hero__bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.public-hero__bg--fallback {
  background: linear-gradient(180deg, #E8FBF3 0%, #FFFFFF 100%);
}

.public-hero__top-gradient {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 160rpx;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.35) 0%, rgba(0, 0, 0, 0) 100%);
  pointer-events: none;
}

.public-hero__bottom-gradient {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 160rpx;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(255, 255, 255, 0.9) 100%);
  pointer-events: none;
}

.public-hero__avatar {
  position: absolute;
  left: 40rpx;
  bottom: -40rpx;
  width: 176rpx;
  height: 176rpx;
  border-radius: 50%;
  border: 8rpx solid #36C99A;
  box-shadow: 0 10rpx 28rpx rgba(0, 0, 0, 0.18);
  overflow: hidden;
  background: #E8FBF3;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
}

.public-hero__avatar-img {
  width: 100%;
  height: 100%;
}

.public-hero__avatar-initial {
  font-size: 56rpx;
  font-weight: 800;
  color: #36C99A;
}
</style>
