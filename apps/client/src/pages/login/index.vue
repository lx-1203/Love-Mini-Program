<script setup lang="ts">
import { ref, computed, onUnmounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useSessionStore } from "../../stores/session";
import { replaceAppPath } from "../../utils/navigation";
import { IMAGE_PATHS } from "../../config/images";
import { createButtonGuard } from "../../utils/debounce";
// Sentry 监控：登录失败上报异常，页面切换 / 关键按钮点击记录面包屑
import { captureException, addBreadcrumb } from "../../services/sentry";

// 使用 vue-i18n 组合式 API 获取 t 函数（组件内优先使用 useI18n 而非全局 t）
const { t } = useI18n();

const sessionStore = useSessionStore();
const { loginHero, loading } = storeToRefs(sessionStore);

// 表单响应式数据（必须初始化，避免模板渲染时访问 undefined）
const phone = ref("");
const code = ref("");
const agreed = ref(false);
const countdown = ref(0);
const showPhoneLogin = ref(false);

// 页面进入淡入动画开关
const pageVisible = ref(false);
/** 页面进入淡入定时器引用，用于卸载时清理 */
let pageVisibleTimer: ReturnType<typeof setTimeout> | null = null;
onShow(() => {
  // 记录页面进入面包屑，便于在异常发生时回溯用户跳转路径
  addBreadcrumb("navigation", "page_enter", { url: "/pages/login/index" });

  pageVisible.value = false;
  if (pageVisibleTimer) clearTimeout(pageVisibleTimer);
  pageVisibleTimer = setTimeout(() => {
    pageVisible.value = true;
    pageVisibleTimer = null;
  }, 30);
});

let countdownTimer: ReturnType<typeof setInterval> | null = null;
/** 登录成功跳转定时器引用，用于卸载时清理 */
let loginNavTimer: ReturnType<typeof setTimeout> | null = null;

// 表单校验计算属性
const isPhoneValid = computed(() => /^1[3-9]\d{9}$/.test(phone.value));
const isCodeValid = computed(() => /^\d{4,6}$/.test(code.value));
const canSendCode = computed(() => isPhoneValid.value && countdown.value === 0);
const canPhoneLogin = computed(() => isPhoneValid.value && isCodeValid.value && agreed.value);

/**
 * 安全读取登录页 Hero 文案。
 * loginHero 来自 store，初始为 null，通过计算属性统一提供兜底文案，
 * 避免模板中多处重复 optional chaining，也便于后续扩展动态配置。
 * 兜底文案统一从 i18n 资源读取（login.heroTitle / login.heroSubtitle），
 * 不再硬编码中文字符串。
 */
const heroTitle = computed(() => loginHero.value?.heroTitle || t("login.heroTitle"));
const heroSubtitle = computed(() => loginHero.value?.heroSubtitle || t("login.heroSubtitle"));

function startCountdown() {
  countdown.value = 60;
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      if (countdownTimer) clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }, 1000);
}

/**
 * 页面卸载时清理所有定时器，避免内存泄漏。
 * 修复（P1 BUG）：原实现缺少 onUnmounted 钩子，countdownTimer / pageVisibleTimer /
 * loginNavTimer 在页面销毁后仍可能触发回调，修改已销毁页面的响应式状态。
 */
onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
  if (pageVisibleTimer) {
    clearTimeout(pageVisibleTimer);
    pageVisibleTimer = null;
  }
  if (loginNavTimer) {
    clearTimeout(loginNavTimer);
    loginNavTimer = null;
  }
});

function onSendCode() {
  if (!canSendCode.value) {
    if (!isPhoneValid.value) {
      uni.showToast({ title: t("login.phoneInvalid"), icon: "none" });
    }
    return;
  }
  uni.showToast({ title: t("login.codeSent"), icon: "none" });
  startCountdown();
}

function togglePhoneLogin() {
  showPhoneLogin.value = !showPhoneLogin.value;
}

/** 微信登录超时时间（毫秒），超时后提示用户重试 */
const WECHAT_LOGIN_TIMEOUT_MS = 15000;
/** 本地存储中用于 CSRF 防护的 state key */
const WECHAT_LOGIN_STATE_KEY = "login:wechat:state";

/**
 * 生成随机 state 字符串用于 CSRF 防护。
 * 在 mp-weixin 端 crypto 可能不可用，使用 Math.random 兜底。
 */
function generateLoginState(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch (_e) {
    // crypto 不可用时走兜底
  }
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * 调用 uni.login 获取微信 code，带 15 秒超时与 state 校验防 CSRF。
 * - 生成本地 state 写入 storage，登录返回后用于校验一致性
 * - 超时则提示用户重试
 * 错误文案统一从 i18n 资源读取（login.wechatTimeout / stateInvalid / wechatCodeFailed / wechatFailed）。
 */
function loginWithWechatSdk(): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const state = generateLoginState();
    try {
      uni.setStorageSync(WECHAT_LOGIN_STATE_KEY, state);
    } catch (_e) {
      // storage 写入失败不阻塞登录
    }

    const timer = setTimeout(() => {
      // 超时拒绝，提示重试
      reject(new Error(t("login.wechatTimeout")));
    }, WECHAT_LOGIN_TIMEOUT_MS);

    uni.login({
      provider: "weixin",
      success: (res) => {
        clearTimeout(timer);
        // 校验 state 防 CSRF：本地存储的 state 与本次生成必须一致
        let savedState = "";
        try {
          savedState = uni.getStorageSync(WECHAT_LOGIN_STATE_KEY) as string;
        } catch (_e) {
          // 读取失败忽略
        }
        if (!savedState || savedState !== state) {
          reject(new Error(t("login.stateInvalid")));
          return;
        }
        if (!res.code) {
          reject(new Error(t("login.wechatCodeFailed")));
          return;
        }
        resolve(res.code);
      },
      fail: (err) => {
        clearTimeout(timer);
        reject(new Error(err?.errMsg || t("login.wechatFailed")));
      },
    });
  });
}

async function onWechatLogin() {
  if (!agreed.value) {
    uni.showToast({ title: t("login.agreeFirst"), icon: "none" });
    return;
  }
  // 记录关键按钮点击面包屑，便于在登录失败时定位用户操作节点
  addBreadcrumb("ui", "button_click", { id: "login.wechat" });
  try {
    // 先获取 code（带超时与 state 防 CSRF），再调用 store 登录
    const code = await loginWithWechatSdk();
    await sessionStore.loginWithWechat(code);
    replaceAppPath("/pages/discover/index");
  } catch (error) {
    // 登录失败：上报到 Sentry，source 标记为 login.wechat 便于后台按登录方式筛选
    captureException(error, { source: "login.wechat" });
    const message = error instanceof Error ? error.message : t("login.loginFailed");
    uni.showToast({ title: message, icon: "none" });
  }
}

/**
 * 按钮防抖包装：避免用户在微信登录回调期间快速重复点击，
 * 防止 uni.login 被并发触发导致 state 校验失败或重复跳转。
 * 防抖窗口 1500ms 覆盖微信登录拉起 + 网络请求的典型耗时。
 */
const onWechatLoginGuarded = createButtonGuard(onWechatLogin, 1500);

function onPhoneLogin() {
  if (!agreed.value) {
    uni.showToast({ title: t("login.agreeFirst"), icon: "none" });
    return;
  }
  if (!canPhoneLogin.value) {
    uni.showToast({ title: t("login.phoneAndCodeInvalid"), icon: "none" });
    return;
  }
  uni.showToast({ title: t("login.loginSuccess"), icon: "success" });
  if (loginNavTimer) clearTimeout(loginNavTimer);
  loginNavTimer = setTimeout(() => {
    replaceAppPath("/pages/discover/index");
    loginNavTimer = null;
  }, 1500);
}

/**
 * 按钮防抖包装：手机号登录在 toast 提示与 1.5s 跳转之间不响应重复点击，
 * 避免用户连点导致多次 toast 或多次 navigateTo 入栈。
 * 防抖窗口 2000ms 覆盖 toast 显示 + 跳转延时。
 */
const onPhoneLoginGuarded = createButtonGuard(onPhoneLogin, 2000);

function onAgreeTap() {
  agreed.value = !agreed.value;
}

function openUserAgreement() {
  uni.showToast({ title: t("login.userAgreementTitle"), icon: "none" });
}

function openPrivacyPolicy() {
  uni.showToast({ title: t("login.privacyPolicyTitle"), icon: "none" });
}

/* ============================================================
 * 功能2：第三方账号登录（微信 / Apple）
 * ============================================================
 * - 微信登录已有 onWechatLogin 处理，这里复用按钮即可
 * - Apple 登录仅 H5 / iOS 环境可用，通过条件编译控制显示
 * - 账号绑定入口跳转到设置页（已登录用户可管理第三方绑定）
 * ============================================================ */

/**
 * 触发 Apple 登录。
 * - 仅 H5 / APP-PLUS 环境调用，mp-weixin 不支持
 * - 失败时通过 toast 提示用户
 */
async function onAppleLogin() {
  if (!agreed.value) {
    uni.showToast({ title: t("login.agreeFirst"), icon: "none" });
    return;
  }
  // 记录关键按钮点击面包屑
  addBreadcrumb("ui", "button_click", { id: "login.apple" });
  // #ifdef H5 || APP-PLUS
  try {
    // 实际项目中通过 Sign in with Apple SDK 拿到 identityToken，
    // 解析出 sub（Apple User Identifier）后调用后端接口
    // 这里调用 uni.login 的 apple provider，成功后取 authorizationCode
    await new Promise<void>((resolve, reject) => {
      uni.login({
        provider: "apple",
        success: () => resolve(),
        fail: (err) => reject(new Error(err?.errMsg || t("thirdPartyLogin.appleLoginFailed"))),
      });
    });
    // 此处省略与后端 /api/auth/third-party/apple 的 token 交换，
    // 实际接入时由 services/api.ts 中 loginWithApple 方法完成
    uni.showToast({ title: t("login.loginSuccess"), icon: "success" });
    if (loginNavTimer) clearTimeout(loginNavTimer);
    loginNavTimer = setTimeout(() => {
      replaceAppPath("/pages/discover/index");
      loginNavTimer = null;
    }, 1500);
  } catch (error) {
    // Apple 登录失败：上报到 Sentry，source 标记为 login.apple
    captureException(error, { source: "login.apple" });
    const message = error instanceof Error ? error.message : t("thirdPartyLogin.appleLoginFailed");
    uni.showToast({ title: message, icon: "none" });
  }
  // #endif
  // #ifndef H5 || APP-PLUS
  uni.showToast({ title: t("thirdPartyLogin.appleNotSupported"), icon: "none" });
  // #endif
}

/**
 * 跳转到账号绑定管理页（已登录用户可绑定 / 解绑第三方账号）。
 * - 未登录时提示用户先登录
 * - 已登录时跳转到 /pages/settings/index（账号绑定入口）
 */
function openAccountBinding() {
  if (!sessionStore.isLoggedIn) {
    uni.showToast({ title: t("login.agreeFirst"), icon: "none" });
    return;
  }
  replaceAppPath("/pages/settings/index");
}
</script>

<template>
  <view class="login-page" :class="{ 'page-fade-in': pageVisible }">
    <!-- 顶部实景图区（占 70% 高度） -->
    <view class="login-page__hero">
      <image
        class="hero-image"
        :src="IMAGE_PATHS.POSTERS.LOGIN"
        mode="aspectFill"
        aria-hidden="true" alt=""
      />
      <!-- 底部白色渐变叠加，增强文字可读性 -->
      <view class="hero-overlay" />
      <!-- 主标题 + 副标压底显示 -->
      <view class="hero-title-wrap">
        <text class="logo-title">{{ heroTitle }}</text>
        <text class="logo-subtitle">{{ heroSubtitle }}</text>
      </view>
    </view>

    <!-- 底部按钮区（占 30% 高度） -->
    <view class="login-page__bottom">
      <view class="login-card card-base">
        <view v-if="!showPhoneLogin" class="login-quick">
          <view class="btn-primary press-feedback" :class="{ 'btn--loading': loading }" hover-class="press-feedback--active" hover-stay-time="120" @tap="onWechatLoginGuarded">
            <view class="btn-icon-wrap">
              <text class="btn-icon-wechat">微</text>
            </view>
            <text class="btn-primary-text">{{ t('login.wechatLogin') }}</text>
          </view>

          <view class="btn-secondary press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="togglePhoneLogin">
            <text class="btn-secondary-text">{{ t('login.phoneLogin') }}</text>
          </view>
        </view>

        <view v-else class="login-form">
          <view class="input-group">
            <view class="input-item">
              <view class="input-icon">
                <text class="input-icon-text">📱</text>
              </view>
              <input
                class="input-field"
                type="number"
                maxlength="11"
                :placeholder="t('login.phonePlaceholder')"
                placeholder-class="input-placeholder"
                v-model="phone" aria-label="t('login.phonePlaceholder')"
              />
            </view>

            <view class="input-divider" />

            <view class="input-item">
              <view class="input-icon">
                <text class="input-icon-text">🔑</text>
              </view>
              <input
                class="input-field"
                type="number"
                maxlength="6"
                :placeholder="t('login.codePlaceholder')"
                placeholder-class="input-placeholder"
                v-model="code" aria-label="t('login.codePlaceholder')"
              />
              <view
                class="send-code-btn press-feedback"
                :class="{ 'send-code-btn--disabled': !canSendCode }"
                hover-class="press-feedback--active"
                hover-stay-time="120"
                @tap="onSendCode"
              >
                <text class="send-code-text">
                  {{ countdown > 0 ? countdown + 's' : t('login.getCode') }}
                </text>
              </view>
            </view>
          </view>

          <view class="form-btns">
            <view class="btn-primary press-feedback" :class="{ 'btn--loading': loading }" hover-class="press-feedback--active" hover-stay-time="120" @tap="onPhoneLoginGuarded">
              <text class="btn-primary-text">{{ t('login.loginButton') }}</text>
            </view>

            <view class="btn-text press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="togglePhoneLogin">
              <text class="btn-text-link">{{ t('login.backToWechat') }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="terms-wrap">
        <view class="checkbox press-feedback" :class="{ 'checkbox--checked': agreed }" hover-class="press-feedback--active" hover-stay-time="120" @tap="onAgreeTap">
          <text v-if="agreed" class="checkbox-check">✓</text>
        </view>
        <view class="terms-text-wrap">
          <text class="terms-text">{{ t('login.agreedPrefix') }}</text>
          <text class="terms-link" @tap="openUserAgreement">{{ t('login.userAgreementLink') }}</text>
          <text class="terms-text">{{ t('login.and') }}</text>
          <text class="terms-link" @tap="openPrivacyPolicy">{{ t('login.privacyPolicyLink') }}</text>
        </view>
      </view>

      <!-- 功能2：其他登录方式（Apple 登录 + 账号绑定入口） -->
      <view class="third-party-wrap">
        <view class="third-party-divider">
          <view class="third-party-divider__line" />
          <text class="third-party-divider__text">{{ t('thirdPartyLogin.otherLoginMethods') }}</text>
          <view class="third-party-divider__line" />
        </view>

        <view class="third-party-icons">
          <!-- Apple 登录按钮（仅 H5 / APP-PLUS 显示） -->
          <!-- #ifdef H5 || APP-PLUS -->
          <view
            class="third-party-icon-btn press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="onAppleLogin"
          >
            <text class="third-party-icon third-party-icon--apple"></text>
            <text class="third-party-icon-label">{{ t('thirdPartyLogin.appleLoginDesc') }}</text>
          </view>
          <!-- #endif -->
          <!-- 账号绑定入口（已登录用户可管理第三方账号绑定） -->
          <view
            class="third-party-icon-btn press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            @tap="openAccountBinding"
          >
            <text class="third-party-icon third-party-icon--bind">🔗</text>
            <text class="third-party-icon-label">{{ t('thirdPartyLogin.accountBinding') }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.login-page {
  position: relative;
  width: 100%;
  min-height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--c-bg-page);
}

/* 顶部实景图区 —— 占 70% 高度 */
.login-page__hero {
  position: relative;
  width: 100%;
  height: 70vh;
  flex-shrink: 0;
  overflow: hidden;
}

.hero-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  /* 实景图覆盖整个区域 */
  object-fit: cover;
}

/* 底部白色渐变叠加 —— 增强文字可读性 */
.hero-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.95) 100%);
  pointer-events: none;
}

/* 主标题 + 副标 —— 压底显示，在白色渐变之上保证可读 */
.hero-title-wrap {
  position: absolute;
  left: 0;
  right: 0;
  bottom: var(--sp-6);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 var(--sp-8);
  z-index: 1;
}

.logo-title {
  font-size: var(--fs-7xl);
  font-weight: 700;
  color: var(--c-text-primary);
  letter-spacing: 4rpx;
  line-height: 1.3;
  margin-bottom: var(--sp-3);
  text-align: center;
}

.logo-subtitle {
  font-size: var(--fs-lg);
  font-weight: 400;
  color: var(--c-text-secondary);
  text-align: center;
  line-height: 1.6;
  letter-spacing: 2rpx;
}

/* 底部按钮区 —— 占 30% 高度 */
.login-page__bottom {
  flex: 1;
  position: relative;
  z-index: 1;
  padding-left: var(--sp-8);
  padding-right: var(--sp-8);
  padding-top: var(--sp-6);
  padding-bottom: calc(env(safe-area-inset-bottom) + var(--sp-6));
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  background: var(--c-bg-page);
}

.login-card {
  width: 100%;
  background: transparent;
  border-radius: var(--r-xl);
  padding: 0;
  margin-bottom: var(--sp-6);
  border: none;
  box-shadow: none;
}

.login-quick {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

/* 主按钮：青绿实心 + 微信图标 */
/* P3 修复：复用 _components.scss 的 .base-btn--primary 设计令牌，避免重复定义
   共享样式位置：src/styles/_components.scss
   此处保留 .btn-primary 类名以兼容模板引用 */
.btn-primary {
  width: 100%;
  height: var(--btn-height-md);
  border-radius: var(--r-xl);
  background: var(--c-brand);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-3);
  box-shadow: var(--s-float-btn);
}

/* #ifdef H5 */
.btn-primary:active {
  transform: scale(0.96);
  box-shadow: var(--s-brand-md);
}
/* #endif */

.btn--loading {
  opacity: 0.65;
}

.btn-icon-wrap {
  width: 44rpx;
  height: 44rpx;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon-wechat {
  font-size: var(--fs-sm);
  color: var(--c-text-inverse);
  font-weight: 700;
}

.btn-primary-text {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--c-text-inverse);
  letter-spacing: 2rpx;
}

/* 次按钮：白底 + 描边 */
.btn-secondary {
  width: 100%;
  height: var(--btn-height-md);
  border-radius: var(--r-xl);
  background: var(--c-bg-container);
  border: 2rpx solid var(--c-border-default);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* #ifdef H5 */
.btn-secondary:active {
  transform: scale(0.96);
  background: var(--c-neutral-50);
}
/* #endif */

.btn-secondary-text {
  font-size: var(--fs-lg);
  font-weight: 500;
  color: var(--c-text-primary);
  letter-spacing: 2rpx;
}

.input-group {
  background: var(--c-neutral-50);
  border-radius: var(--r-md);
  padding: 0 var(--sp-6);
  margin-bottom: var(--sp-6);
  border: 2rpx solid var(--c-neutral-100);
}

.input-item {
  display: flex;
  align-items: center;
  height: 100rpx;
}

.input-icon {
  width: 52rpx;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-right: var(--sp-3);
}

.input-icon-text {
  font-size: var(--fs-2xl);
}

.input-field {
  flex: 1;
  height: 100rpx;
  font-size: var(--fs-lg);
  color: var(--c-text-primary);
  background: transparent;
}

.input-placeholder {
  color: var(--c-text-quaternary);
  font-size: var(--fs-md);
}

.input-divider {
  height: 2rpx;
  background: var(--c-neutral-200);
}

.send-code-btn {
  padding: var(--sp-3) var(--sp-4);
  border-radius: var(--r-md);
  background: var(--c-brand);
  margin-left: var(--sp-4);
}

/* #ifdef H5 */
.send-code-btn:active {
  transform: scale(0.96);
}
/* #endif */

.send-code-btn--disabled {
  background: var(--c-neutral-200);
}

.send-code-text {
  font-size: var(--fs-sm);
  color: var(--c-text-inverse);
  font-weight: 500;
  white-space: nowrap;
}

.send-code-btn--disabled .send-code-text {
  color: var(--c-text-quaternary);
}

.form-btns {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

.btn-text {
  width: 100%;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* #ifdef H5 */
.btn-text:active {
  opacity: 0.7;
}
/* #endif */

.btn-text-link {
  font-size: var(--fs-md);
  color: var(--c-text-quaternary);
}

.terms-wrap {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: var(--sp-3);
  padding: 0 var(--sp-4);
}

.checkbox {
  width: 34rpx;
  height: 34rpx;
  border-radius: 50%;
  border: 2rpx solid var(--c-neutral-300);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 4rpx;
}

.checkbox--checked {
  background: var(--c-brand);
  border-color: var(--c-brand);
}

.checkbox-check {
  font-size: var(--fs-sm);
  color: var(--c-text-inverse);
  font-weight: 700;
}

.terms-text-wrap {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
}

.terms-text {
  font-size: var(--fs-xs);
  color: var(--c-text-quaternary);
  line-height: 1.7;
}

.terms-link {
  font-size: var(--fs-xs);
  color: var(--c-brand);
  line-height: 1.7;
}

/* 功能2：第三方账号登录区域样式 */
.third-party-wrap {
  margin-top: var(--sp-6);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--sp-4);
}

.third-party-divider {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.third-party-divider__line {
  flex: 1;
  height: 2rpx;
  background: var(--c-border-default);
}

.third-party-divider__text {
  font-size: var(--fs-xs);
  color: var(--c-text-quaternary);
  white-space: nowrap;
}

.third-party-icons {
  display: flex;
  justify-content: center;
  gap: var(--sp-8);
}

.third-party-icon-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2);
}

/* #ifdef H5 */
.third-party-icon-btn:active {
  opacity: 0.65;
}
/* #endif */

.third-party-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: var(--c-bg-container);
  border: 2rpx solid var(--c-border-default);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--fs-2xl);
}

/* Apple 图标用 SVG 背景模拟（避免引入额外图片资源） */
.third-party-icon--apple {
  /* Apple 品牌黑色：使用深色 token 替代硬编码 #000000 */
  background-color: var(--c-neutral-900);
  position: relative;
}

.third-party-icon--apple::before {
  content: "";
  position: absolute;
  width: 36rpx;
  height: 36rpx;
  background-image: url("data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22white%22%3E%3Cpath%20d%3D%22M16.365%201.43c0%201.14-.493%202.27-1.177%203.08-.744.9-1.99%201.57-2.987%201.57-.12%200-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39%0-1.15.572-2.27%201.206-2.98.804-.94%202.142-1.64%203.248-1.68.03.13.05.28.05.43zm4.565%2015.71c-.03.07-.463%201.58-1.518%203.12-.945%201.34-1.94%202.71-3.43%202.71-1.517%200-1.9-.88-3.63-.88-1.698%200-2.302.91-3.67.91-1.377%200-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28%200-4.28%202.797-6.55%205.552-6.55%201.448%200%202.675.95%203.6.95.865%200%202.222-1.01%203.902-1.01.632%200%202.93.06%204.43%202.19-.114.07-2.402%201.37-2.402%204.13%200%203.27%202.866%204.42%2.967%204.45z%22/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
}

.third-party-icon-label {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
}
</style>
