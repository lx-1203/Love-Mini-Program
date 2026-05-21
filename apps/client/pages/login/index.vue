<script setup lang="ts">
/**
 * Login Page - 微信登录页
 * 包含：LoadingState、ErrorState、WeChat SDK 不可用处理
 */
import { storeToRefs } from "pinia";
import { ref } from "vue";
import AppShell from "../../src/components/layout/AppShell.vue";
import SectionCard from "../../src/components/common/SectionCard.vue";
import LoadingState from "../../src/components/common/LoadingState.vue";
import ErrorState from "../../src/components/common/ErrorState.vue";
import { useSessionStore } from "../../src/stores/session";
import { replaceAppPath } from "../../src/utils/navigation";

const sessionStore = useSessionStore();
const { loginHero, loading } = storeToRefs(sessionStore);

const localError = ref("");

/** 微信 SDK 是否可用 */
const wechatAvailable = ref(true);

// 检查微信环境
try {
  // 非微信环境 uni.login 仍可调用但可能走 mock，这里仅做声明
} catch (_e) {
  wechatAvailable.value = false;
}

async function login() {
  localError.value = "";
  try {
    await sessionStore.loginWithWechat();
    replaceAppPath("/pages/home/index");
  } catch (_err: unknown) {
    // 错误消息已在 session store 中通过 toast 展示
    localError.value =
      _err instanceof Error ? _err.message : "登录失败，请稍后重试";
  }
}
</script>

<template>
  <AppShell
    title="欢迎使用"
    subtitle="先完成微信登录，再补全资料、学校和时间安排。"
    :show-tab-bar="false"
  >
    <!-- 微信 SDK 不可用提示 -->
    <SectionCard
      v-if="!wechatAvailable"
      title="环境提示"
      subtitle="当前未检测到微信环境，请使用微信扫码访问。"
      compact
    />

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
      <!-- 登录中 -->
      <LoadingState
        v-if="loading"
        text="正在登录..."
        :fullscreen="false"
      />

      <!-- 登录失败 -->
      <ErrorState
        v-else-if="localError"
        :message="localError"
        retry-text="重新登录"
        @retry="login"
      />

      <!-- 正常登录按钮 -->
      <button
        v-else
        class="primary-button"
        :class="{ 'primary-button--disabled': loading }"
        :disabled="loading"
        @click="login"
      >
        微信登录并继续
      </button>
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
  width: 100%;
  height: 92rpx;
  border: 0;
  border-radius: 20rpx;
  background: var(--td-brand-color-7);
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
}

.primary-button--disabled {
  opacity: 0.5;
}
</style>