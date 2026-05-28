<script setup lang="ts">
import { ref, computed } from "vue";
import { storeToRefs } from "pinia";
import { useSessionStore } from "../../stores/session";
import { replaceAppPath } from "../../utils/navigation";

const sessionStore = useSessionStore();
const { loginHero, loading } = storeToRefs(sessionStore);

// 视频加载失败降级
const videoError = ref(false);
function onVideoError() {
  videoError.value = true;
}

// 计算属性：是否使用视频背景
const useVideoBg = computed(() => {
  return loginHero.value?.activeMode === 'video' && !videoError.value;
});

async function login() {
  await sessionStore.loginWithWechat();
  replaceAppPath("/pages/home/index");
}
</script>

<template>
  <view class="login-page">
    <!-- 视频背景 -->
    <view class="login-page__bg">
      <video
        v-if="useVideoBg"
        class="login-page__video"
        src="/static/assets/videos/campus-bg.mp4"
        autoplay
        loop
        muted
        object-fit="cover"
        @error="onVideoError"
      />
      <!-- 渐变遮罩 -->
      <view class="login-page__overlay" />
    </view>

    <!-- 内容区域 -->
    <view class="login-page__content">
      <!-- Logo 和标题 -->
      <view class="login-page__header">
        <text class="login-page__logo">🏫</text>
        <text class="login-page__title">{{ loginHero?.heroTitle || '校园恋爱' }}</text>
        <text class="login-page__subtitle">
          {{ loginHero?.heroSubtitle || '从内容、活动和有边界的聊天开始认识彼此' }}
        </text>
      </view>

      <!-- 登录按钮 -->
      <view class="login-page__action">
        <button class="login-page__btn" :disabled="loading" @click="login">
          <text class="login-page__btn-icon">💬</text>
          <text class="login-page__btn-text">微信登录</text>
        </button>
        <text class="login-page__hint">登录后先进入首页，再按需要完成资料</text>
      </view>

      <!-- 底部协议 -->
      <view class="login-page__footer">
        <text class="login-page__agreement">
          登录即代表您同意《用户协议》和《隐私政策》
        </text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.login-page {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

/* ========== 背景层 ========== */
.login-page__bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
}

.login-page__video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.login-page__overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.2) 0%,
    rgba(0, 0, 0, 0.4) 50%,
    rgba(0, 0, 0, 0.6) 100%
  );
}

/* ========== 内容层 ========== */
.login-page__content {
  position: relative;
  z-index: 1;
  padding: 48rpx 48rpx 64rpx;
  display: flex;
  flex-direction: column;
  gap: 48rpx;
}

/* ========== 头部 ========== */
.login-page__header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.login-page__logo {
  font-size: 80rpx;
  margin-bottom: 8rpx;
}

.login-page__title {
  font-size: 48rpx;
  font-weight: 700;
  color: #ffffff;
  text-align: center;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.login-page__subtitle {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.85);
  text-align: center;
  line-height: 1.5;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

/* ========== 操作区 ========== */
.login-page__action {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.login-page__btn {
  width: 100%;
  height: 96rpx;
  border-radius: 48rpx;
  background: linear-gradient(135deg, var(--td-brand-color-6), var(--td-brand-color-7));
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  box-shadow: 0 8rpx 24rpx rgba(37, 99, 235, 0.35);
  transition: transform 0.2s ease;
}

.login-page__btn:active {
  transform: scale(0.98);
}

.login-page__btn:disabled {
  opacity: 0.7;
}

.login-page__btn-icon {
  font-size: 36rpx;
}

.login-page__btn-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #ffffff;
}

.login-page__hint {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
}

/* ========== 底部 ========== */
.login-page__footer {
  display: flex;
  justify-content: center;
}

.login-page__agreement {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
}
</style>
