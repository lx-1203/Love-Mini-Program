<script setup lang="ts">
/**
 * 用户协议页面（微信小程序提审合规必备）
 *
 * 功能说明：
 * - 通过 getLegalText(LegalTextType.USER_AGREEMENT) 从后端 CMS 拉取最新用户协议
 * - 后端不可达 / mock 模式 / 返回空时，回退到 i18n 本地 fallback 文案
 * - 顶部展示标题、版本号、最后更新时间
 * - 中部使用 scroll-view 渲染法律正文，支持长文本滚动
 * - 底部"我已阅读"按钮，点击返回上一页
 * - 提供 loading / empty / error 三态处理
 *
 * mp-weixin 兼容性：
 * - 使用 @tap（不使用 @click）
 * - 使用 hover-class（不使用 :hover 伪类）
 * - 不使用 import.meta.env.DEV
 * - 不使用 optional catch binding（catch 必须带参数）
 * - 使用 design tokens（var(--c-*) 等）
 */
import { onMounted, ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import AppShell from "../../../components/layout/AppShell.vue";
import { getLegalText, LegalTextType } from "../../../config/legal-texts";
import type { LegalTextView } from "../../../config/legal-texts";
import { lightHaptic } from "../../../utils/haptic";

/** 加载状态枚举（避免使用魔法字符串） */
type LoadState = "loading" | "success" | "error" | "empty";

const { t } = useI18n();

/** 当前加载状态 */
const loadState = ref<LoadState>("loading");
/** 法律文本数据 */
const legalText = ref<LegalTextView | null>(null);
/** 错误信息（error 状态时展示） */
const errorMessage = ref<string>("");

/**
 * onMounted：拉取用户协议文本。
 *
 * 调用 getLegalText，内部已封装：
 * - 5 分钟内存缓存
 * - mock 模式直接返回 fallback
 * - 后端不可达时回退到 i18n 本地文案
 * - 永不抛错（最坏情况返回本地 fallback）
 *
 * 但为了向用户明确展示"加载中"→"已加载"的过渡，
 * 这里仍保留 loading 状态切换；若返回的 version 为 local-fallback，
 * 视为后端不可达（仍展示 fallback 文案，不报错）。
 */
onMounted(() => {
  void loadUserAgreement();
});

async function loadUserAgreement(): Promise<void> {
  loadState.value = "loading";
  errorMessage.value = "";
  try {
    const result = await getLegalText(LegalTextType.USER_AGREEMENT);
    legalText.value = result;
    // 若正文为空，标记为 empty 状态
    if (!result || !result.content || result.content.trim().length === 0) {
      loadState.value = "empty";
      return;
    }
    loadState.value = "success";
  } catch (error) {
    // getLegalText 内部已兜底，理论上不会抛错；
    // 但保险起见仍捕获，避免 Promise rejection 阻塞 UI
    errorMessage.value =
      error instanceof Error ? error.message : t("legal.loadFailed");
    loadState.value = "error";
  }
}

/** 顶部展示的标题（优先使用后端返回的 title，否则回退到 i18n） */
const displayTitle = computed<string>(() => {
  return legalText.value?.title || t("legal.userAgreement.title");
});

/** 版本号（后端返回时展示，否则展示本地 fallback 标识） */
const displayVersion = computed<string>(() => {
  if (!legalText.value?.version) return "";
  // 本地 fallback 文案不展示版本号（避免误导用户）
  if (legalText.value.version === "local-fallback") return "";
  return legalText.value.version;
});

/** 最后更新时间（ISO 8601 → YYYY-MM-DD） */
const displayUpdatedAt = computed<string>(() => {
  if (!legalText.value?.updatedAt) return "";
  try {
    const date = new Date(legalText.value.updatedAt);
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch (_e) {
    return "";
  }
});

/** 是否展示元信息（版本号或更新时间至少一项存在） */
const showMeta = computed<boolean>(() => {
  return displayVersion.value !== "" || displayUpdatedAt.value !== "";
});

/**
 * 点击"我已阅读"按钮：轻触反馈 + 返回上一页。
 *
 * 使用 uni.navigateBack 而非 replaceAppPath，因为法律文本页通常
 * 是从登录页 / 设置页 navigateTo 进入，返回上一页符合用户预期。
 * 若页面栈为空（如冷启动直达），fallback 到 discover 首页。
 */
function handleAcknowledge(): void {
  lightHaptic();
  // #ifdef MP-WEIXIN
  uni.navigateBack({
    fail: () => {
      // 页面栈为空时 fallback 到首页
      uni.switchTab({ url: "/pages/discover/index" });
    },
  });
  // #endif
  // #ifndef MP-WEIXIN
  uni.navigateBack().catch(() => {
    uni.switchTab({ url: "/pages/discover/index" }).catch(() => {
      // 静默处理
    });
  });
  // #endif
}

/**
 * 点击重试：重新拉取用户协议。
 */
function handleRetry(): void {
  lightHaptic();
  void loadUserAgreement();
}
</script>

<template>
  <AppShell title="用户协议" :show-tab-bar="false">
    <view class="legal-page">
      <!-- 顶部标题区 -->
      <view class="legal-header">
        <text class="legal-header__title">{{ displayTitle }}</text>
        <view v-if="showMeta" class="legal-header__meta">
          <text v-if="displayVersion" class="legal-header__version">
            {{ displayVersion }}
          </text>
          <text v-if="displayUpdatedAt" class="legal-header__updated">
            {{ t("legal.userAgreement.lastUpdated") }}: {{ displayUpdatedAt }}
          </text>
        </view>
      </view>

      <!-- 加载中 -->
      <view v-if="loadState === 'loading'" class="legal-state legal-state--loading">
        <view class="legal-state__spinner" />
        <text class="legal-state__text">{{ t("common.loading") }}</text>
      </view>

      <!-- 加载错误 -->
      <view v-else-if="loadState === 'error'" class="legal-state legal-state--error">
        <text class="legal-state__text">{{ errorMessage || t("legal.loadFailed") }}</text>
        <view
          class="legal-state__btn press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="handleRetry"
        >
          <text class="legal-state__btn-text">{{ t("common.retry") }}</text>
        </view>
      </view>

      <!-- 空内容 -->
      <view v-else-if="loadState === 'empty'" class="legal-state legal-state--empty">
        <text class="legal-state__text">{{ t("legal.loadFailed") }}</text>
        <view
          class="legal-state__btn press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="handleRetry"
        >
          <text class="legal-state__btn-text">{{ t("common.retry") }}</text>
        </view>
      </view>

      <!-- 正文（成功加载） -->
      <scroll-view
        v-else
        class="legal-content"
        scroll-y
        :enhanced="true"
        :show-scrollbar="false"
      >
        <text class="legal-content__text" user-select>{{ legalText?.content }}</text>
      </scroll-view>

      <!-- 底部"我已阅读"按钮（loading/error/empty 状态也保留，确保用户可返回） -->
      <view class="legal-footer">
        <view
          class="legal-footer__btn press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="handleAcknowledge"
        >
          <text class="legal-footer__btn-text">
            {{ t("legal.userAgreement.accept") }}
          </text>
        </view>
      </view>
    </view>
  </AppShell>
</template>

<style scoped lang="scss">
.legal-page {
  display: flex;
  flex-direction: column;
  /* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
  min-height: 100%;
  background: var(--c-bg-page);
}

/* ========== 顶部标题区 ========== */
.legal-header {
  padding: var(--sp-6) var(--sp-6) var(--sp-4);
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  background: var(--c-bg-container);
  border-bottom: 1rpx solid var(--c-border-light, rgba(15, 23, 42, 0.04));
}

.legal-header__title {
  font-size: var(--fs-2xl);
  font-weight: 700;
  color: var(--c-text-primary);
  line-height: 1.4;
}

.legal-header__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-3);
  align-items: center;
}

.legal-header__version {
  font-size: var(--fs-xs);
  padding: 2rpx 12rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-bg-brand);
  color: var(--c-brand-700);
}

.legal-header__updated {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
}

/* ========== 三态：loading / error / empty ========== */
.legal-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-4);
  padding: var(--sp-8) var(--sp-6);
}

.legal-state__spinner {
  width: 48rpx;
  height: 48rpx;
  border: 4rpx solid var(--c-border-default, rgba(15, 23, 42, 0.08));
  border-top-color: var(--c-brand);
  border-radius: 50%;
  animation: legal-spinner 0.8s linear infinite;
}

@keyframes legal-spinner {
  to {
    transform: rotate(360deg);
  }
}

.legal-state__text {
  font-size: var(--fs-md);
  color: var(--c-text-tertiary);
  text-align: center;
  line-height: 1.6;
}

.legal-state__btn {
  padding: var(--sp-3) var(--sp-6);
  border-radius: var(--r-md, 12rpx);
  background: var(--c-brand);
}

.legal-state__btn-text {
  font-size: var(--fs-sm);
  color: var(--c-text-inverse, #ffffff);
  font-weight: 600;
}

/* ========== 正文 scroll-view ========== */
.legal-content {
  flex: 1;
  padding: var(--sp-6);
  box-sizing: border-box;
}

.legal-content__text {
  display: block;
  font-size: var(--fs-md);
  color: var(--c-text-primary);
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
}

/* ========== 底部"我已阅读"按钮 ========== */
.legal-footer {
  padding: var(--sp-4) var(--sp-6)
    calc(env(safe-area-inset-bottom) + var(--sp-4));
  background: var(--c-bg-container);
  border-top: 1rpx solid var(--c-border-light, rgba(15, 23, 42, 0.04));
}

.legal-footer__btn {
  width: 100%;
  height: var(--btn-height-md, 96rpx);
  border-radius: var(--r-xl, 24rpx);
  background: var(--c-brand);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--s-float-btn, 0 4rpx 12rpx rgba(63, 207, 142, 0.25));
}

.legal-footer__btn-text {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--c-text-inverse, #ffffff);
  letter-spacing: 2rpx;
}
</style>
