<script setup lang="ts">
import { storeToRefs } from "pinia";
import AppShell from "../../src/components/layout/AppShell.vue";
import SectionCard from "../../src/components/common/SectionCard.vue";
import { useSessionStore } from "../../src/stores/session";
import { replaceAppPath } from "../../src/utils/navigation";

const sessionStore = useSessionStore();
const { loginHero, loading } = storeToRefs(sessionStore);

async function login() {
  await sessionStore.loginWithWechat();
  replaceAppPath("/pages/home/index");
}
</script>

<template>
  <AppShell
    title="欢迎使用"
    subtitle="先完成微信登录，再补全资料、学校和时间安排。"
    :show-tab-bar="false"
  >
    <SectionCard title="主视觉" subtitle="登录主视觉由系统配置项控制。">
      <view class="hero">
        <view class="hero__media">
          <text class="hero__mode">
            {{ loginHero?.activeMode === 'video' ? '视频主视觉' : '动画兜底' }}
          </text>
        </view>
        <view>
          <text class="hero__title">{{ loginHero?.heroTitle || '校园恋爱' }}</text>
          <text class="hero__subtitle">
            {{ loginHero?.heroSubtitle || '从内容、活动和有边界的聊天开始认识彼此。' }}
          </text>
        </view>
      </view>
    </SectionCard>

    <SectionCard title="登录" subtitle="登录后先进入首页，再按需要完成资料。">
      <button class="primary-button" :disabled="loading" @click="login">微信登录并继续</button>
    </SectionCard>
  </AppShell>
</template>

<style scoped lang="scss">
.hero {
  display: grid;
  gap: 18rpx;
}

.hero__media {
  min-height: 280rpx;
  border-radius: 24rpx;
  background:
    radial-gradient(circle at top left, rgba(37, 99, 235, 0.22), transparent 55%),
    linear-gradient(135deg, #0f172a, #1e293b);
  display: grid;
  place-items: center;
}

.hero__mode {
  color: #fff;
  font-size: 28rpx;
  font-weight: 700;
}

.hero__title {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
}

.hero__subtitle {
  display: block;
  margin-top: 10rpx;
  color: var(--td-text-color-secondary);
  line-height: 1.6;
}

.primary-button {
  height: 92rpx;
  border: 0;
  border-radius: 20rpx;
  background: var(--td-brand-color-7);
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
}
</style>
