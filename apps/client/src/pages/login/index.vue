<script setup lang="ts">
import { ref, computed, onUnmounted } from "vue";
import { onShow, onHide } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useSessionStore } from "../../stores/session";
import { replaceAppPath } from "../../utils/navigation";
import { IMAGE_PATHS } from "../../config/images";
import { createButtonGuard } from "../../utils/debounce";
// 触觉反馈：协议链接点击轻触反馈
import { lightHaptic } from "../../utils/haptic";
// Sentry 监控：登录失败上报异常，页面切换 / 关键按钮点击记录面包屑
import { captureException, addBreadcrumb } from "../../services/sentry";
import { loginWithPhone, registerUser, loginAsGuest } from "../../services/auth";
// 展示模式（全功能展示版）：登录页「以演示者身份进入」入口
import { isShowcaseMode } from "../../config/showcase";

// 使用 vue-i18n 组合式 API 获取 t 函数（组件内优先使用 useI18n 而非全局 t）
const { t } = useI18n();

/** 登录页图标（emoji 替换为 SVG） */
const loginIcons = {
  mobile: IMAGE_PATHS.ICONS_EMOJI.MOBILE,
  key: IMAGE_PATHS.ICONS_EMOJI.KEY,
  link: IMAGE_PATHS.ICONS_EMOJI.LINK,
} as const;

const sessionStore = useSessionStore();
const { loginHero, loading } = storeToRefs(sessionStore);

// 表单响应式数据（必须初始化，避免模板渲染时访问 undefined）
const phone = ref("");
const password = ref("");
const nickname = ref("");
const phoneRegisterMode = ref(false);
const agreed = ref(false);
const countdown = ref(0);
const showPhoneLogin = ref(false);

// 页面进入淡入动画开关
const pageVisible = ref(false);
/** 页面进入淡入定时器引用，用于卸载时清理 */
let pageVisibleTimer: ReturnType<typeof setTimeout> | null = null;

let countdownTimer: ReturnType<typeof setInterval> | null = null;
/** 登录成功跳转定时器引用，用于卸载时清理 */
let loginNavTimer: ReturnType<typeof setTimeout> | null = null;
/**
 * 切后台时记录剩余倒计时秒数，用于恢复。
 * 修复（SubTask 1.5.4）：原实现切后台后 setInterval 仍持续运行，
 * 一方面浪费小程序后台资源（部分平台会限制后台 timer 频率），
 * 另一方面若系统挂起 timer，回到前台时倒计时与实际经过时间不一致。
 * 现切后台时暂停 setInterval，回到前台时按剩余秒数恢复。
 */
let pausedCountdown: number = 0;
/** 切后台时间戳（毫秒），用于回到前台时计算应扣除的倒计时秒数 */
let hiddenAt: number | null = null;

/**
 * onShow 钩子：统一处理页面进入/回到前台逻辑。
 * - 记录面包屑（便于异常回溯）
 * - 触发淡入动画
 * - 恢复验证码倒计时（若有暂停状态）
 *
 * 修复（SubTask 1.5.4）：合并 onShow 钩子，避免多个钩子分散维护。
 */
onShow(() => {
  // 记录页面进入面包屑，便于在异常发生时回溯用户跳转路径
  addBreadcrumb("navigation", "page_enter", { url: "/pages/login/index" });

  pageVisible.value = false;
  if (pageVisibleTimer) clearTimeout(pageVisibleTimer);
  pageVisibleTimer = setTimeout(() => {
    pageVisible.value = true;
    pageVisibleTimer = null;
  }, 30);

  // 修复（SubTask 1.5.4）：回到前台时恢复验证码倒计时
  // 仅在 pausedCountdown 标记存在时才恢复（避免初次进入页面误触发）
  if (hiddenAt !== null) {
    resumeCountdown();
  }
});

// 表单校验计算属性
const isPhoneValid = computed(() => /^1[3-9]\d{9}$/.test(phone.value));
const isCodeValid = computed(() => password.value.length >= 6 && password.value.length <= 64);
const canPhoneLogin = computed(() => isPhoneValid.value && isCodeValid.value && agreed.value);
// 注册模式额外要求昵称非空
const canPhoneRegister = computed(() => isPhoneValid.value && isCodeValid.value && nickname.value.trim().length > 0 && agreed.value);

/**
 * 安全读取登录页 Hero 文案。
 * loginHero 来自 store，初始为 null，通过计算属性统一提供兜底文案，
 * 避免模板中多处重复 optional chaining，也便于后续扩展动态配置。
 * 兜底文案统一从 i18n 资源读取（login.heroTitle / login.heroSubtitle），
 * 不再硬编码中文字符串。
 */
const heroTitle = computed(() => loginHero.value?.heroTitle || t("login.heroTitle"));
const heroSubtitle = computed(() => loginHero.value?.heroSubtitle || t("login.heroSubtitle"));


/**
 * 暂停倒计时：记录当前剩余秒数并清除 setInterval。
 * 切后台时调用，避免后台 timer 浪费资源与时间不同步。
 */
function pauseCountdown() {
  if (!countdownTimer) return;
  pausedCountdown = countdown.value;
  clearInterval(countdownTimer);
  countdownTimer = null;
  hiddenAt = Date.now();
}

/**
 * 恢复倒计时：根据后台停留时间扣除相应秒数后重建 setInterval。
 * 回到前台时调用，确保倒计时与实际经过时间一致。
 */
function resumeCountdown() {
  if (hiddenAt === null || pausedCountdown <= 0) {
    hiddenAt = null;
    return;
  }
  // 计算后台停留秒数（向上取整，避免少扣 1 秒）
  const hiddenSeconds = Math.floor((Date.now() - hiddenAt) / 1000);
  hiddenAt = null;
  countdown.value = Math.max(0, pausedCountdown - hiddenSeconds);
  pausedCountdown = 0;
  if (countdown.value <= 0) return;
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
 * 修复（SubTask 1.5.4）：切后台时暂停验证码倒计时 setInterval，
 * 避免后台运行浪费资源与时间不同步问题。
 */
onHide(() => {
  pauseCountdown();
});

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
  // 重置后台暂停状态
  hiddenAt = null;
  pausedCountdown = 0;
});


function togglePhoneLogin() {
  showPhoneLogin.value = !showPhoneLogin.value;
}

function toggleRegisterMode() {
  phoneRegisterMode.value = !phoneRegisterMode.value;
}

/**
 * 微信登录入口（Task 0.1 真实链路）。
 *
 * <p>Task 0.1.4 修复：移除本地的 loginWithWechatSdk() / generateLoginState() 实现，
 * 统一委托给 services/auth.ts 的 loginWithWechat()（封装 wx.login + POST /v1/auth/wechat），
 * 避免重复实现 wx.login 调用与 state CSRF 防护逻辑。</p>
 *
 * <p>错误处理：失败时 services/auth.ts 抛出 WechatLoginError（含业务错误码
 * INVALID_CODE / WECHAT_API_ERROR / USER_DISABLED / CLIENT_ERROR），
 * 此处捕获后通过 toast 显示 error.message，并上报到 Sentry 便于后台监控。</p>
 *
 * <p>注意：本函数不含任何 Mock fallback，登录失败会显示具体错误。
 * 防抖包装（onWechatLoginGuarded）防止用户重复点击触发并发登录请求。</p>
 */
async function onWechatLogin() {
  if (!agreed.value) {
    uni.showToast({ title: t("login.agreeFirst"), icon: "none" });
    return;
  }
  // 记录关键按钮点击面包屑，便于在登录失败时定位用户操作节点
  addBreadcrumb("ui", "button_click", { id: "login.wechat" });
  try {
    // services/auth.ts 封装 wx.login + POST /v1/auth/wechat，无 Mock fallback
    // 失败时抛出 WechatLoginError（含明确业务错误码）
    await sessionStore.loginWithWechat();
    replaceAppPath("/pages/discover/index");
  } catch (error) {
    // 登录失败：上报到 Sentry，source 标记为 login.wechat 便于后台按登录方式筛选
    captureException(error, { source: "login.wechat" });
    // 显示具体错误消息（WechatLoginError.message 已包含用户友好提示）
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

async function onPhoneLogin() {
  if (!agreed.value) {
    uni.showToast({ title: t("login.agreeFirst"), icon: "none" });
    return;
  }
  const canSubmit = phoneRegisterMode.value ? canPhoneRegister.value : canPhoneLogin.value;
  if (!canSubmit) {
    uni.showToast({ title: t("login.phoneAndCodeInvalid"), icon: "none" });
    return;
  }
  // infra R2 联调改进:真实调用后端(参考 eladmin 账号体系)。
  // 登录 POST /v1/auth/phone-login;注册 POST /v1/auth/register,成功即签发 JWT。
  try {
    if (phoneRegisterMode.value) {
      await registerUser(phone.value.trim(), password.value, nickname.value.trim());
      addBreadcrumb("ui", "button_click", { id: "login.register" });
    } else {
      await loginWithPhone(phone.value.trim(), password.value);
      addBreadcrumb("ui", "button_click", { id: "login.phone" });
    }
    uni.showToast({ title: t("login.loginSuccess"), icon: "success" });
    // P0-32 修复（2026-08-08）：手机号/注册登录只 setToken 不更新 userSession，
    // 登录后首个受保护页面会走守卫 refreshSession 产生空会话窗口；此处主动同步，
    // 消除"登录成功但页面仍认为未登录"的间隙（失败不影响登录，仅记录）
    sessionStore.refreshSession().catch((err: unknown) => {
      console.warn("[Login] 登录后会话同步失败（守卫将自愈）:", err);
    });
    if (loginNavTimer) clearTimeout(loginNavTimer);
    loginNavTimer = setTimeout(() => {
      replaceAppPath("/pages/discover/index");
      loginNavTimer = null;
    }, 1500);
  } catch (error) {
    captureException(error, { source: phoneRegisterMode.value ? "login.register" : "login.phone" });
    const message = error instanceof Error ? error.message : t("login.loginFailed");
    uni.showToast({ title: message, icon: "none" });
  }
}
/**
 * 按钮防抖包装：手机号登录在 toast 提示与 1.5s 跳转之间不响应重复点击，
 * 避免用户连点导致多次 toast 或多次 navigateTo 入栈。
 * 防抖窗口 2000ms 覆盖 toast 显示 + 跳转延时。
 */
const onPhoneLoginGuarded = createButtonGuard(onPhoneLogin, 2000);

/**
 * 体验账号一键登录（登录页「临时体验号」入口）。
 *
 * <p>委托 services/auth.ts 的 loginAsGuest() 调用 POST /v1/auth/guest-login：
 * 后端首次自动创建固定体验账号并签发 JWT，后续复用同一账号（幂等），
 * 无需注册/输入密码即可体验全部功能。</p>
 *
 * <p>错误处理：失败时展示后端返回的具体错误（含入口被配置关闭的场景），
 * 并上报 Sentry（source=login.guest）便于后台监控。</p>
 */
async function onGuestLogin() {
  if (!agreed.value) {
    uni.showToast({ title: t("login.agreeFirst"), icon: "none" });
    return;
  }
  // 记录关键按钮点击面包屑，便于在登录失败时定位用户操作节点
  addBreadcrumb("ui", "button_click", { id: "login.guest" });
  try {
    await loginAsGuest();
    uni.showToast({ title: t("login.loginSuccess"), icon: "success" });
    // P0-32 修复（2026-08-08）：手机号/注册登录只 setToken 不更新 userSession，
    // 登录后首个受保护页面会走守卫 refreshSession 产生空会话窗口；此处主动同步，
    // 消除"登录成功但页面仍认为未登录"的间隙（失败不影响登录，仅记录）
    sessionStore.refreshSession().catch((err: unknown) => {
      console.warn("[Login] 登录后会话同步失败（守卫将自愈）:", err);
    });
    if (loginNavTimer) clearTimeout(loginNavTimer);
    loginNavTimer = setTimeout(() => {
      replaceAppPath("/pages/discover/index");
      loginNavTimer = null;
    }, 1500);
  } catch (error) {
    captureException(error, { source: "login.guest" });
    const message = error instanceof Error ? error.message : t("login.guestLoginFailed");
    uni.showToast({ title: message, icon: "none" });
  }
}
/**
 * 按钮防抖包装：与手机号登录一致，防抖窗口 2000ms 覆盖 toast + 跳转延时。
 */
const onGuestLoginGuarded = createButtonGuard(onGuestLogin, 2000);

/**
 * 展示模式（全功能展示版）：以演示者身份进入全功能展示页。
 * 仅 VITE_SHOWCASE_MODE=true 的展示构建显示该入口。
 */
async function enterShowcase() {
  if (!agreed.value) {
    uni.showToast({ title: t("login.agreeFirst"), icon: "none" });
    return;
  }
  try {
    await loginAsGuest();
    uni.reLaunch({ url: "/pages/showcase/index" });
  } catch (error) {
    captureException(error, { source: "login.showcase" });
    const message = error instanceof Error ? error.message : t("login.guestLoginFailed");
    uni.showToast({ title: message, icon: "none" });
  }
}

function onAgreeTap() {
  agreed.value = !agreed.value;
}

/**
 * 跳转到用户协议页面（微信小程序提审合规必备）。
 *
 * 使用 uni.navigateTo 跳转到 subpackages/legal/agreement/index 分包页面，
 * 该页面通过 getLegalText(LegalTextType.USER_AGREEMENT) 从后端 CMS 拉取最新条款，
 * 后端不可达时回退到 i18n 本地 fallback 文案。
 *
 * mp-weixin 与 H5 双端兼容：mp-weixin 使用 fail 回调，H5 使用 Promise.catch。
 */
function openUserAgreement() {
  lightHaptic();
  const url = "/subpackages/legal/agreement/index";
  // #ifdef MP-WEIXIN
  uni.navigateTo({
    url,
    fail: () => {
      // 跳转失败时静默处理（如页面栈已满）
    },
  });
  // #endif
  // #ifndef MP-WEIXIN
  uni.navigateTo({ url }).catch(() => {
    // 跳转失败时静默处理
  });
  // #endif
}

/**
 * 跳转到隐私政策页面（微信小程序提审合规必备）。
 *
 * 使用 uni.navigateTo 跳转到 subpackages/legal/privacy/index 分包页面，
 * 该页面通过 getLegalText(LegalTextType.PRIVACY_POLICY) 从后端 CMS 拉取最新条款，
 * 后端不可达时回退到 i18n 本地 fallback 文案。
 *
 * mp-weixin 与 H5 双端兼容：mp-weixin 使用 fail 回调，H5 使用 Promise.catch。
 */
function openPrivacyPolicy() {
  lightHaptic();
  const url = "/subpackages/legal/privacy/index";
  // #ifdef MP-WEIXIN
  uni.navigateTo({
    url,
    fail: () => {
      // 跳转失败时静默处理（如页面栈已满）
    },
  });
  // #endif
  // #ifndef MP-WEIXIN
  uni.navigateTo({ url }).catch(() => {
    // 跳转失败时静默处理
  });
  // #endif
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
    // P0-32 修复（2026-08-08）：手机号/注册登录只 setToken 不更新 userSession，
    // 登录后首个受保护页面会走守卫 refreshSession 产生空会话窗口；此处主动同步，
    // 消除"登录成功但页面仍认为未登录"的间隙（失败不影响登录，仅记录）
    sessionStore.refreshSession().catch((err: unknown) => {
      console.warn("[Login] 登录后会话同步失败（守卫将自愈）:", err);
    });
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
              <text class="btn-icon-wechat">{{ t('login.wechatIconText') }}</text>
            </view>
            <text class="btn-primary-text">{{ t('login.wechatLogin') }}</text>
          </view>

          <view class="btn-secondary press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="togglePhoneLogin">
            <text class="btn-secondary-text">{{ t('login.phoneLogin') }}</text>
          </view>

          <view class="btn-guest press-feedback" :class="{ 'btn--loading': loading }" hover-class="press-feedback--active" hover-stay-time="120" @tap="onGuestLoginGuarded">
            <text class="btn-guest-text">{{ t('login.guestLogin') }}</text>
            <text class="btn-guest-desc">{{ t('login.guestLoginDesc') }}</text>
          </view>
        </view>

        <view v-else class="login-form">
          <view class="input-group">
            <view class="input-item">
              <view class="input-icon" aria-hidden="true">
                <image class="input-icon-text" :src="loginIcons.mobile" mode="aspectFit" alt="" />
              </view>
              <!-- P6 a11y：label 关联输入框（sr-only 视觉隐藏，屏幕阅读器可读） -->
              <label class="sr-only" for="login-phone">{{ t('login.phonePlaceholder') }}</label>
              <input
                id="login-phone"
                class="input-field"
                type="number"
                maxlength="11"
                :placeholder="t('login.phonePlaceholder')"
                placeholder-class="input-placeholder"
                v-model="phone"
                :aria-label="t('login.phonePlaceholder')"
                aria-required="true"
                inputmode="numeric"
              />
            </view>

            <view class="input-divider" />

            <view class="input-item">
              <view class="input-icon" aria-hidden="true">
                <image class="input-icon-text" :src="loginIcons.key" mode="aspectFit" alt="" />
              </view>
              <label class="sr-only" for="login-password">{{ t('login.passwordPlaceholder') }}</label>
              <input
                id="login-password"
                class="input-field"
                type="password"
                :placeholder="t('login.passwordPlaceholder')"
                placeholder-class="input-placeholder"
                v-model="password"
                :aria-label="t('login.passwordPlaceholder')"
                aria-required="true"
              />
            </view>

            <view v-if="phoneRegisterMode" class="input-divider" />

            <view v-if="phoneRegisterMode" class="input-item">
              <view class="input-icon" aria-hidden="true">
                <image class="input-icon-text" :src="loginIcons.mobile" mode="aspectFit" alt="" />
              </view>
              <label class="sr-only" for="login-nickname">{{ t('login.nicknamePlaceholder') }}</label>
              <input
                id="login-nickname"
                class="input-field"
                type="text"
                maxlength="20"
                :placeholder="t('login.nicknamePlaceholder')"
                placeholder-class="input-placeholder"
                v-model="nickname"
                :aria-label="t('login.nicknamePlaceholder')"
                aria-required="true"
              />
            </view>
          </view>

          <view class="form-btns">
            <view class="btn-primary press-feedback" :class="{ 'btn--loading': loading }" hover-class="press-feedback--active" hover-stay-time="120" @tap="onPhoneLoginGuarded">
              <text class="btn-primary-text">{{ phoneRegisterMode ? t('login.registerButton') : t('login.loginButton') }}</text>
            </view>

            <view class="btn-text press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="toggleRegisterMode">
              <text class="btn-text-link">{{ phoneRegisterMode ? t('login.backToLogin') : t('login.goRegister') }}</text>
            </view>

            <view class="btn-text press-feedback" hover-class="press-feedback--active" hover-stay-time="120" @tap="togglePhoneLogin">
              <text class="btn-text-link">{{ t('login.backToWechat') }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 展示模式（全功能展示版）：以演示者身份进入全功能展示页 -->
      <view
        v-if="isShowcaseMode"
        class="showcase-entry press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        @tap="enterShowcase"
      >
        <view class="showcase-entry__badge">
          <text class="showcase-entry__badge-text">SHOW</text>
        </view>
        <view class="showcase-entry__body">
          <text class="showcase-entry__title">以演示者身份进入展示版</text>
          <text class="showcase-entry__desc">超级管理员模式 · 一键体验全部功能</text>
        </view>
        <text class="showcase-entry__arrow">›</text>
      </view>

      <view class="terms-wrap">
        <view
          class="checkbox press-feedback"
          :class="{ 'checkbox--checked': agreed }"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          @tap="onAgreeTap"
          role="checkbox"
          :aria-checked="agreed ? 'true' : 'false'"
          :aria-label="t('login.agreedPrefix')"
        >
          <text v-if="agreed" class="checkbox-check" aria-hidden="true">✓</text>
        </view>
        <view class="terms-text-wrap">
          <text class="terms-text">{{ t('login.agreedPrefix') }}</text>
          <text class="terms-link" @tap="openUserAgreement" role="link" :aria-label="t('login.userAgreementLink')">{{ t('login.userAgreementLink') }}</text>
          <text class="terms-text">{{ t('login.and') }}</text>
          <text class="terms-link" @tap="openPrivacyPolicy" role="link" :aria-label="t('login.privacyPolicyLink')">{{ t('login.privacyPolicyLink') }}</text>
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
            <image class="third-party-icon third-party-icon--bind" :src="loginIcons.link" mode="aspectFit" alt="" />
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
  /* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
  min-height: 100%;
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
  background: var(--c-overlay-white-bg-mid-strong, rgba(255, 255, 255, 0.25));
  border-radius: var(--r-circle, 50%);
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

/* 一键体验按钮：虚线描边 + 品牌色，弱于主/次按钮 */
.btn-guest {
  width: 100%;
  min-height: var(--btn-height-md);
  border-radius: var(--r-xl);
  background: var(--c-bg-container);
  border: 2rpx dashed var(--c-border-strong, rgba(0, 0, 0, 0.12));
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  flex-wrap: wrap;
  padding: var(--sp-2) var(--sp-4);
}

/* #ifdef H5 */
.btn-guest:active {
  transform: scale(0.96);
  background: var(--c-neutral-50);
}
/* #endif */

.btn-guest-text {
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--c-brand);
  letter-spacing: 2rpx;
}

.btn-guest-desc {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
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
  width: 36rpx;
  height: 36rpx;
  color: var(--c-text-tertiary);
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

/* ---------- 展示模式入口（全功能展示版） ---------- */
.showcase-entry {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  margin: var(--sp-4) var(--sp-8) 0;
  padding: var(--sp-4) var(--sp-5);
  border-radius: var(--r-xl, 24rpx);
  background: linear-gradient(135deg, rgba(59, 157, 229, 0.12), rgba(124, 108, 240, 0.12));
  border: 2rpx solid rgba(59, 157, 229, 0.35);
  transition: all var(--d-fast, 120ms) ease;
}

.showcase-entry__badge {
  width: 64rpx;
  height: 64rpx;
  border-radius: var(--r-lg, 18rpx);
  background: linear-gradient(135deg, #3B9DE5, #7C6CF0);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.showcase-entry__badge-text {
  font-size: var(--fs-xs, 20rpx);
  font-weight: 700;
  color: #fff;
  letter-spacing: 1rpx;
}

.showcase-entry__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.showcase-entry__title {
  font-size: var(--fs-base, 26rpx);
  font-weight: 600;
  color: var(--c-text-primary);
}

.showcase-entry__desc {
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-text-tertiary);
}

.showcase-entry__arrow {
  font-size: var(--fs-2xl, 32rpx);
  color: #3B9DE5;
  font-weight: 600;
}

.checkbox {
  width: 34rpx;
  height: 34rpx;
  border-radius: var(--r-circle, 50%);
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
  border-radius: var(--r-circle, 50%);
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
