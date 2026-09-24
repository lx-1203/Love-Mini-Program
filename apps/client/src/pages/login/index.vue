<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useSessionStore } from "../../stores/session";
// B6：后台配置即时生效——登录/注册功能开关（login_open / register_open）
import { useAppConfigStore } from "../../stores/app-config";
// 2026-08-09：登录成功统一跳转（消费 LockScreen 未登录引导写入的待跳转路径）
import { replaceAppPath, consumePendingLoginRedirect, openAppPath } from "../../utils/navigation";
// R4-00226：展示页路径走 ROUTES 常量
import { ROUTES } from "../../constants/routes";
import { IMAGE_PATHS } from "../../config/images";
import { createButtonGuard } from "../../utils/debounce";
// 触觉反馈：协议链接点击轻触反馈
import { lightHaptic } from "../../utils/haptic";
// Sentry 监控：登录失败上报异常，页面切换 / 关键按钮点击记录面包屑
import { captureException, addBreadcrumb } from "../../services/sentry";
import { loginWithPhone, registerUser, loginAsGuest, sendSmsCode, bindPhoneViaWechat } from "../../services/auth";
// 统一 API 错误模型：区分「预期业务拒绝」（入口关闭 403）与真实异常
import { AppApiError } from "../../services/api-error";
// 展示模式（全功能展示版）：登录页「以演示者身份进入」入口
import { isShowcaseMode } from "../../config/showcase";
import { isDev, isMockMode } from "../../config/env";
// R11-G2：注入 --statusbar（本页样式使用 var(--statusbar, env(...))，DevTools env 恒 0 必须由 JS 注入）
import { useMenuButtonRect } from "../../composables/useMenuButtonRect";
const { styleVars: menuStyleVars } = useMenuButtonRect();


// 使用 vue-i18n 组合式 API 获取 t 函数（组件内优先使用 useI18n 而非全局 t）
const { t } = useI18n();

/** 登录页图标（emoji 替换为 SVG） */
const loginIcons = {
  mobile: IMAGE_PATHS.ICONS_EMOJI.MOBILE,
  key: IMAGE_PATHS.ICONS_EMOJI.KEY,
  link: IMAGE_PATHS.ICONS_EMOJI.LINK,
} as const;

const sessionStore = useSessionStore();
const { loginHero } = storeToRefs(sessionStore);
// B6：登录/注册开关（store 未加载时默认开放，不影响正常登录）
const appConfigStore = useAppConfigStore();
const { isLoginOpen, isRegisterOpen } = storeToRefs(appConfigStore);

// 表单响应式数据（必须初始化，避免模板渲染时访问 undefined）
const phone = ref("");
const password = ref("");
const nickname = ref("");
// 3-N 未成年人保护：注册模式必填出生日期（picker mode="date"，end 为今天）
const birthDate = ref("");
// 短信验证码（注册模式：POST /v1/sms/send-code 发送后回填）
const smsCode = ref("");
// 获取验证码倒计时（秒，>0 时按钮禁用）
const smsCountdown = ref(0);
let smsCountdownTimer: ReturnType<typeof setInterval> | null = null;
const phoneRegisterMode = ref(false);
/* MP-R1-PAGES-LOGIN-INDEX-102：微信审核口径要求用户主动勾选协议（默认勾选属
   「默认同意」违规拒审项），冷启动默认未勾选；未勾选点任意登录入口被 agreeFirst
   守卫拦截，用户主动勾选后方可登录。 */
const agreed = ref(false);
const showPhoneLogin = ref(false);

/**
 * 演示模式入口可见性（第五轮 QA 验收入口）。
 * 仅开发 / mock 构建显示（dev 构建 NODE_ENV=development → isDev=true；
 * mock 构建 VITE_API_MODE=mock → isMockMode=true）；真实生产构建两信号均为 false → 隐藏。
 * 与展示模式入口（isShowcaseMode）互相独立：本入口直接以 mock 用户身份注入会话，
 * 不需要后端 guest-login 可用。
 */
const showDevUserEntry = computed(() => isDev || isMockMode());

/** 出生日期 picker 的最大可选日期（今天），未满 18 岁注册被后端拒绝 */
const birthDateMax = new Date().toISOString().slice(0, 10);

/** 登录成功跳转定时器引用，用于卸载时清理 */
let loginNavTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * onShow 钩子：统一处理页面进入/回到前台逻辑。
 * - 记录面包屑（便于异常回溯）
 */
onShow(() => {
  // 记录页面进入面包屑，便于在异常发生时回溯用户跳转路径
  addBreadcrumb("navigation", "page_enter", { url: "/pages/login/index" });
  // B6：注册功能被后台关闭（register_open=false）时强制回到登录模式，
  // 防止切换开关前残留的注册表单仍可提交
  if (!isRegisterOpen.value) {
    phoneRegisterMode.value = false;
  }
  // 2026-08-31 修复（录屏 06:42-06:51）：应用重启/崩溃恢复后 storage 里的 token
  // 仍有效并被 bootstrap 静默登录（toast「登录成功」），但登录页不自动前进，
  // 用户必须再手动点一次「稍后再看」。此处检测已登录即自动进入主界面。
  // 2026-09-06：与下方 watch 共用 autoForwardedToMain 一次性标记——
  // 此前两条路径（onShow + watch immediate）在同一启动中各触发一次 switchTab，
  // 双导航竞争导致开发者工具报「Page route 错误(system error)/routeDone with a
  // webviewId that is not the current page」。
  if (sessionStore.isLoggedIn && !autoForwardedToMain) {
    autoForwardedToMain = true;
    uni.switchTab({ url: "/pages/discover/index" });
  }
});

// 2026-09-06 修复（冷启动会话恢复竞态）：bootstrap 的 /auth/me 为异步请求，
// onShow 检查时可能尚未完成 → 已登录用户冷启动仍停在登录页且无人再补偿跳转。
// watch「bootstrap 完成 + 已登录」组合态：完成即自动进入主界面（仅触发一次）。
// MP-R4-CONSOLE-01（2026-09-13 独立审查 IA-CONSOLE-01）：immediate 回调在 watch()
// 执行期间同步触发，彼时 const stopSessionForwardWatch 尚未完成赋值；已登录冷启/
// 会话恢复场景下首个同步回调即调用它 → minify 后报「k is not a function」全局
// 错误（Sentry 双通道上报）。改为可空句柄 + 可选调用，首帧跳过自停（onUnmounted
// 与 autoForwardedToMain 单次标记兜底防重复跳转）。
let stopSessionForwardWatch: (() => void) | null = null;
let autoForwardedToMain = false;
// MP-R1-LOGIN-002：登录流程在途标记——微信登录成功后 store 赋值 userSession 会触发
// 本 watch，与登录函数自身 await 续体里的导航形成双 switchTab 竞争
// （「Page route 错误/routeDone with a webviewId」同类缺陷，见 92-95 行注释）。
// 流程在途期间 watch 一律让位，由 loginSuccessNavigate() 统一导航一次。
// MP-R2-PAGES-LOGIN-INDEX-007：改为响应式 ref——store 的 loading 仅在 bootstrap 期间
// 置位，登录动作不经过 store，原 :class 绑定 store.loading 恒 false（按钮加载态死绑定）。
// 现由本页登录流程在途标记驱动按钮加载态。
const loginFlowActive = ref(false);
stopSessionForwardWatch = watch(
  () => !sessionStore.loading && sessionStore.isLoggedIn,
  (sessionReady) => {
    if (sessionReady) {
      stopSessionForwardWatch?.();
      // 页面自身登录流程已接管跳转（一次性标记已置 / loginNavTimer 已挂起 /
      // 登录请求在途）时不重复跳转，保留其 pending 跳转（如资料完善向导）的语义
      if (!loginNavTimer && !autoForwardedToMain && !loginFlowActive.value) {
        autoForwardedToMain = true;
        uni.switchTab({ url: "/pages/discover/index" });
      }
    }
  },
  { immediate: true },
);

// 表单校验计算属性
const isPhoneValid = computed(() => /^1[3-9]\d{9}$/.test(phone.value));
const isCodeValid = computed(() => password.value.length >= 6 && password.value.length <= 64);
const canPhoneLogin = computed(() => isPhoneValid.value && isCodeValid.value && agreed.value);
// 注册模式额外要求昵称 + 出生日期 + 短信验证码非空
const canPhoneRegister = computed(() => isPhoneValid.value && isCodeValid.value && nickname.value.trim().length > 0 && birthDate.value.length > 0 && smsCode.value.trim().length === 6 && agreed.value);

/**
 * 安全读取登录页 Hero 文案。
 * loginHero 来自 store，初始为 null，通过计算属性统一提供兜底文案，
 * 避免模板中多处重复 optional chaining，也便于后续扩展动态配置。
 * 兜底文案统一从 i18n 资源读取（login.heroTitle / login.heroSubtitle），
 * 不再硬编码中文字符串。
 */
const heroTitle = computed(() => loginHero.value?.heroTitle || t("login.heroTitle"));
const heroSubtitle = computed(() => loginHero.value?.heroSubtitle || t("login.heroSubtitle"));
const heroDesc = computed(() => loginHero.value?.heroDesc || t("login.heroDesc"));
const heroDescSub = computed(() => loginHero.value?.heroDescSub || t("login.heroDescSub"));


/**
 * 页面卸载时清理所有定时器，避免内存泄漏。
 * 修复（P1 BUG）：原实现缺少 onUnmounted 钩子，loginNavTimer
 * 在页面销毁后仍可能触发回调，修改已销毁页面的响应式状态。
 */
onUnmounted(() => {
  if (loginNavTimer) {
    clearTimeout(loginNavTimer);
    loginNavTimer = null;
  }
  // MP-R2-PAGES-LOGIN-INDEX-006：补清短信倒计时定时器（原注释宣称清理所有定时器，
  // 实际遗漏本项——发送验证码后离开页面 interval 空转最长 60s）
  if (smsCountdownTimer) {
    clearInterval(smsCountdownTimer);
    smsCountdownTimer = null;
  }
  stopSessionForwardWatch();
});


function togglePhoneLogin() {
  showPhoneLogin.value = !showPhoneLogin.value;
}

/**
 * 登录成功后的统一跳转（2026-08-09 补全链路）：
 * - LockScreen 未登录引导页点「立即登录并完善」时写入 pending 跳转，
 *   登录成功后自动进入资料完善页（无需用户再次寻找入口）；
 * - 无 pending 时保持默认行为：进入匹配推荐页（/pages/discover/index）。
 */
function navigateAfterLogin() {
  const pending = consumePendingLoginRedirect();
  replaceAppPath(pending ?? "/pages/discover/index");
}

/**
 * 登录成功后的统一导航入口（MP-R1-LOGIN-002）。
 *
 * <p>所有登录路径（微信 / 手机号 / 体验账号 / 手机号快捷绑定）成功后必须经由本函数
 * 跳转：先置 autoForwardedToMain 一次性标记，使 userSession 赋值触发的
 * watch(isLoggedIn) 与 onShow 恢复检查都让位，保证全程只有一次导航——
 * 此前微信路径在 await 续体里直接 navigateAfterLogin()，两个一次性标记均未设置，
 * 与 watch 的 switchTab 形成双导航竞争（「Page route 错误/routeDone with a
 * webviewId」同类缺陷）。</p>
 *
 * @param delayMs 延时毫秒数；0 = 立即导航（微信路径），默认 1500（让 toast 展示后再跳）
 */
function loginSuccessNavigate(delayMs = 1500) {
  autoForwardedToMain = true;
  if (loginNavTimer) clearTimeout(loginNavTimer);
  if (delayMs > 0) {
    loginNavTimer = setTimeout(() => {
      navigateAfterLogin();
      loginNavTimer = null;
    }, delayMs);
  } else {
    navigateAfterLogin();
  }
}

function toggleRegisterMode() {
  phoneRegisterMode.value = !phoneRegisterMode.value;
}

/**
 * 2026-09-12 注册页落地：「去注册」入口改跳独立注册页（pages/register/index，
 * 设计包 deliverables/注册页）；内联注册模式保留为降级路径（仅当残留 register
 * 模式时显示「返回登录」），新用户一律进新注册页。
 */
function goRegisterPage() {
  uni.navigateTo({ url: ROUTES.REGISTER });
}

/**
 * 发送短信验证码（模拟短信：默认发送成功，返回 mockCode 供联调输入）。
 * 注册模式：校验手机号 → POST /v1/sms/send-code → 60s 倒计时。
 */
async function onSendSmsCode() {
  if (smsCountdown.value > 0) return;
  if (!isPhoneValid.value) {
    uni.showToast({ title: t("login.phoneInvalid"), icon: "none" });
    return;
  }
  try {
    const res = await sendSmsCode(phone.value.trim());
    if (res?.success === false && res.message) {
      uni.showToast({ title: res.message, icon: "none" });
      return;
    }
    // 模拟短信：提示 mockCode。MP-R2-PAGES-LOGIN-INDEX-005：文案走 i18n（原硬编码中文
    // 绕过 vue-i18n，en-US 用户收到中文）；且 mockCode 仅 dev/mock 构建展示，
    // 真实后端返回 mockCode 时不再向用户暴露「模拟」字样。
    const showMockCode = Boolean(res?.mockCode) && (isDev || isMockMode());
    const hint = showMockCode
      ? t("login.smsSentMock", { code: res?.mockCode })
      : t("login.smsSent");
    uni.showToast({ title: hint, icon: "none" });
    smsCountdown.value = 60;
    if (smsCountdownTimer) clearInterval(smsCountdownTimer);
    smsCountdownTimer = setInterval(() => {
      smsCountdown.value -= 1;
      if (smsCountdown.value <= 0 && smsCountdownTimer) {
        clearInterval(smsCountdownTimer);
        smsCountdownTimer = null;
      }
    }, 1000);
  } catch (error) {
    const msg = error instanceof Error ? error.message : t("apiErrors.operationFailed");
    uni.showToast({ title: msg, icon: "none" });
  }
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
  // B6：后台关闭登录功能（login_open=false）→ 拒绝登录并提示
  if (!isLoginOpen.value) {
    uni.showToast({ title: t("login.closedTitle"), icon: "none" });
    return;
  }
  // 记录关键按钮点击面包屑，便于在登录失败时定位用户操作节点
  addBreadcrumb("ui", "button_click", { id: "login.wechat" });
  // MP-R1-LOGIN-002：请求在途期间压制 watch(isLoggedIn) 的补偿跳转，
  // 登录成功后的唯一导航由 loginSuccessNavigate() 负责
  loginFlowActive.value = true;
  try {
    // services/auth.ts 封装 wx.login + POST /v1/auth/wechat，无 Mock fallback
    // 失败时抛出 WechatLoginError（含明确业务错误码）
    await sessionStore.loginWithWechat();
    // 2026-08-09：统一跳转（消费 LockScreen 未登录引导写入的 pending 跳转）
    // MP-R1-LOGIN-002：立即导航且先置一次性标记，避免与 watch 双 switchTab 竞争
    loginSuccessNavigate(0);
  } catch (error) {
    // 登录失败：上报到 Sentry，source 标记为 login.wechat 便于后台按登录方式筛选
    captureException(error, { source: "login.wechat" });
    // 显示具体错误消息（WechatLoginError.message 已包含用户友好提示）
    const message = error instanceof Error ? error.message : t("login.loginFailed");
    uni.showToast({ title: message, icon: "none" });
  } finally {
    loginFlowActive.value = false;
  }
}

/**
 * 按钮防抖包装：避免用户在微信登录回调期间快速重复点击，
 * 防止 uni.login 被并发触发导致 state 校验失败或重复跳转。
 * 防抖窗口 1500ms 覆盖微信登录拉起 + 网络请求的典型耗时。
 */
const onWechatLoginGuarded = createButtonGuard(onWechatLogin, 1500);

/**
 * 微信手机号快捷登录（getPhoneNumber 回调）。
 *
 * <p>流程：</p>
 * <ol>
 *   <li>用户点击「手机号快捷登录」按钮，微信弹出手机号授权弹窗</li>
 *   <li>用户同意后，回调携带 code（临时凭证）</li>
 *   <li>将 code 发送到后端 POST /v1/auth/phone/bind，后端调用微信接口换取手机号并绑定</li>
 *   <li>绑定成功后刷新会话，跳转到首页</li>
 * </ol>
 *
 * <p>Mock 模式处理：后端 @Profile("real") 限制，mock 模式下端点返回 404，
 * 此时提示"开发模式请使用验证码登录"并展开手机号登录表单作为 fallback。</p>
 *
 * <p>用户拒绝授权时静默处理（不弹错误），仅记录日志。</p>
 */
async function handleGetPhoneNumber(e: { detail?: { errMsg?: string; code?: string } }) {
  // 用户拒绝授权或系统错误
  if (e.detail?.errMsg !== 'getPhoneNumber:ok') {
    // 2026-09-04 QA 修复：R11 后表单唯一入口是"快捷登录 404 自动展开"，但真实后端 +
    // 开发者工具场景 errMsg 为环境类失败（非 404），表单永远打不开成死路。
    // 2026-09-12 全站验收 Round-1 修复（MP-R1-LOGIN-001）：用户拒绝授权也展开表单。
    // 此前"取消静默"导致拒绝后页面既无注册入口也无验证码/密码登录入口
    // （「去注册」链接在展开后的表单内），新用户无路可走。用户点了登录按钮
    // 即为登录意图，展开表单不算打扰；breadcrumb 保留 cancelled 供漏斗分析。
    const cancelled = /cancel|deny|reject|auth_denied/i.test(e.detail?.errMsg || '');
    addBreadcrumb("ui", "phone_auth_cancelled", { errMsg: e.detail?.errMsg, cancelled });
    showPhoneLogin.value = true;
    return;
  }
  if (!agreed.value) {
    uni.showToast({ title: t("login.agreeFirst"), icon: "none" });
    return;
  }
  if (!isLoginOpen.value) {
    uni.showToast({ title: t("login.closedTitle"), icon: "none" });
    return;
  }
  const code = e.detail?.code;
  if (!code) {
    uni.showToast({ title: t("login.phoneAuthFailed"), icon: "none" });
    return;
  }
  addBreadcrumb("ui", "button_click", { id: "login.phoneQuick" });
  // MP-R1-LOGIN-002：请求在途期间压制 watch(isLoggedIn) 的补偿跳转
  loginFlowActive.value = true;
  try {
    await bindPhoneViaWechat(code);
    uni.showToast({ title: t("login.phoneBoundSuccess"), icon: "success" });
    // 刷新会话以同步手机号绑定状态
    sessionStore.refreshSession().catch((err: unknown) => {
      if (isDev) {
        console.warn("[Login] 手机号绑定后会话同步失败:", err);
      }
    });
    // MP-R1-LOGIN-002：统一经 loginSuccessNavigate 跳转（先置一次性标记防双导航）
    loginSuccessNavigate(1500);
  } catch (error) {
    // Mock 模式：后端无此端点返回 404，提示使用验证码登录
    const status = error !== null && typeof error === "object" && "status" in error
      ? (error as { status: number }).status
      : 0;
    if (status === 404) {
      uni.showToast({ title: t("login.useSmsInDevMode"), icon: "none" });
      // 自动展开手机号登录表单
      showPhoneLogin.value = true;
      return;
    }
    // MP-R1-LOGIN-003：未登录新用户在登录页点「手机号快捷登录」，bindPhoneViaWechat
    // 以无 token 身份请求受保护端点必得 401——这是预期态（尚未登录），与 404 同策略：
    // 不上报 Sentry（预期噪音）、提示改用验证码登录并展开表单兜底，
    // 避免走 http 层通用 401 分支在登录页自身 reLaunch 重载 + 「登录已过期」误导文案。
    if (status === 401) {
      uni.showToast({ title: t("login.useSmsToLogin"), icon: "none" });
      showPhoneLogin.value = true;
      return;
    }
    captureException(error, { source: "login.phoneQuick" });
    const message = error instanceof Error ? error.message : t("login.phoneAuthFailed");
    uni.showToast({ title: message, icon: "none" });
  } finally {
    loginFlowActive.value = false;
  }
}

/**
 * 按钮防抖包装：手机号快捷登录防抖窗口 2000ms，覆盖微信授权弹窗 + 网络请求。
 */
const handleGetPhoneNumberGuarded = createButtonGuard(handleGetPhoneNumber, 2000);

async function onPhoneLogin() {
  if (!agreed.value) {
    uni.showToast({ title: t("login.agreeFirst"), icon: "none" });
    return;
  }
  // B6：登录/注册功能被后台关闭时拒绝提交（对应入口按钮已隐藏/禁用，此处兜底）
  if (!isLoginOpen.value) {
    uni.showToast({ title: t("login.closedTitle"), icon: "none" });
    return;
  }
  if (phoneRegisterMode.value && !isRegisterOpen.value) {
    uni.showToast({ title: t("login.closedTitle"), icon: "none" });
    return;
  }
  const canSubmit = phoneRegisterMode.value ? canPhoneRegister.value : canPhoneLogin.value;
  if (!canSubmit) {
    uni.showToast({ title: t("login.phoneAndCodeInvalid"), icon: "none" });
    return;
  }
  // infra R2 联调改进:真实调用后端(参考 eladmin 账号体系)。
  // 登录 POST /v1/auth/phone-login;注册 POST /v1/auth/register,成功即签发 JWT。
  // MP-R1-LOGIN-002：请求在途期间压制 watch(isLoggedIn) 的补偿跳转
  loginFlowActive.value = true;
  try {
    if (phoneRegisterMode.value) {
      await registerUser(phone.value.trim(), password.value, nickname.value.trim(), birthDate.value, smsCode.value.trim());
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
      // R4-batch4：诊断日志仅开发环境输出
      if (isDev) {
        console.warn("[Login] 登录后会话同步失败（守卫将自愈）:", err);
      }
    });
    // MP-R1-LOGIN-002：统一经 loginSuccessNavigate 跳转（先置一次性标记防双导航）
    loginSuccessNavigate(1500);
  } catch (error) {
    // MP-R2-PAGES-LOGIN-INDEX-010：预期业务拒绝（4xx，如 400 凭据错误/已注册、
    // 403 MINOR_NOT_ALLOWED）不进异常告警——仅非 AppApiError（网络/未知）或 5xx 补报，
    // 避免每次重试产生上报噪音（auth 层已设 reportError:false，此处是唯一通道）
    const isExpectedBusiness =
      error instanceof AppApiError && (error as AppApiError).status < 500;
    if (!isExpectedBusiness) {
      captureException(error, { source: phoneRegisterMode.value ? "login.register" : "login.phone" });
    }
    // 3-N 未成年人保护：后端 403 MINOR_NOT_ALLOWED → 明确提示未满 18 岁
    const isMinor = error instanceof AppApiError && error.error === "MINOR_NOT_ALLOWED";
    const message = isMinor
      ? t("login.minorNotAllowed")
      : error instanceof Error
        ? error.message
        : t("login.loginFailed");
    uni.showToast({ title: message, icon: "none" });
  } finally {
    loginFlowActive.value = false;
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
  // B6：后台关闭登录功能（login_open=false）→ 拒绝体验入口
  if (!isLoginOpen.value) {
    uni.showToast({ title: t("login.closedTitle"), icon: "none" });
    return;
  }
  // 记录关键按钮点击面包屑，便于在登录失败时定位用户操作节点
  addBreadcrumb("ui", "button_click", { id: "login.guest" });
  // MP-R1-LOGIN-002：请求在途期间压制 watch(isLoggedIn) 的补偿跳转
  loginFlowActive.value = true;
  try {
    await loginAsGuest();
    // 2026-08-31：游客进入语义与「登录成功」不符（录屏反馈），改为体验模式文案
    uni.showToast({ title: t("login.guestEnterToast"), icon: "none" });
    // P0-32 修复（2026-08-08）：手机号/注册登录只 setToken 不更新 userSession，
    // 登录后首个受保护页面会走守卫 refreshSession 产生空会话窗口；此处主动同步，
    // 消除"登录成功但页面仍认为未登录"的间隙（失败不影响登录，仅记录）
    sessionStore.refreshSession().catch((err: unknown) => {
      // R4-batch4：诊断日志仅开发环境输出
      if (isDev) {
        console.warn("[Login] 登录后会话同步失败（守卫将自愈）:", err);
      }
    });
    // MP-R1-LOGIN-002：统一经 loginSuccessNavigate 跳转（先置一次性标记防双导航）
    loginSuccessNavigate(1500);
  } catch (error) {
    // 修复（2026-08-09）：入口被配置关闭（后端 403「体验账号入口已关闭」）是预期业务状态，
    // 仅 toast 展示后端文案，不上报 Sentry（http.ts 已通过 reportError=false 静默，此处同步）
    const isEntryClosed =
      error instanceof AppApiError && error.status === 403;
    if (!isEntryClosed) {
      captureException(error, { source: "login.guest" });
    }
    const message = error instanceof Error ? error.message : t("login.guestLoginFailed");
    uni.showToast({ title: message, icon: "none" });
  } finally {
    loginFlowActive.value = false;
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
    // MP-R1-LOGIN-002 同模式：先置一次性标记，避免 loginAsGuest 赋值会话触发的
    // watch 补偿 switchTab 与本 reLaunch 竞争
    autoForwardedToMain = true;
    // R4-00226：路径走 ROUTES 常量
    uni.reLaunch({ url: ROUTES.SHOWCASE });
  } catch (error) {
    captureException(error, { source: "login.showcase" });
    const message = error instanceof Error ? error.message : t("login.guestLoginFailed");
    uni.showToast({ title: message, icon: "none" });
  }
}

/**
 * dev-user=1 演示模式进入（第五轮 QA 验收入口，仅 dev/mock 构建显示）。
 *
 * 与「?dev-user=1」URL 入口等价：直接以 mock 用户身份（user-1001）注入会话后
 * reLaunch 首页（寻觅）。不依赖导航 query 传递（switchTab/reLaunch 对 tab 页
 * 不保留 query），保证微信开发者工具 / 自动化脚本一键进入登录态；页面内其它
 * 导航携带 dev-user=1 时由 utils/dev-user.ts 拦截器自动注入。
 *
 * 本入口为内部 QA/开发辅助，不要求勾选协议（不发起任何真实登录/注册请求），
 * 视觉克制：仅一行小号 DEV 徽标 + 文字，不干扰主登录流程。
 */
function onDevUserEntry() {
  addBreadcrumb("ui", "button_click", { id: "login.devUser" });
  try {
    // MP-R1-LOGIN-002：与微信路径同模式——enterDevUserDemo 赋值 userSession 会触发
    // watch(isLoggedIn) 的补偿 switchTab，与本函数的 reLaunch 形成双导航竞争；
    // 先置一次性标记让 watch 让位，全程仅本 reLaunch 一次导航。
    autoForwardedToMain = true;
    sessionStore.enterDevUserDemo();
    uni.reLaunch({ url: ROUTES.TAB.DISCOVER });
  } catch (error) {
    // dev-user 注入异常不影响登录页主流程，仅提示
    uni.showToast({ title: t("login.loginFailed"), icon: "none" });
  }
}

function onAgreeTap() {
  agreed.value = !agreed.value;
}

/**
 * 出生日期 picker 选择回调（3-N）。
 * @param event picker change 事件（detail.value 为 yyyy-MM-dd 日期串）
 */
function onBirthDateChange(event: { detail: { value: string } }) {
  birthDate.value = event.detail.value;
}

/**
 * 跳转到协议/隐私法律页面（微信小程序提审合规必备）。
 * MP-R2-PAGES-LOGIN-INDEX-004：两处重复实现收敛为单一参数化函数，
 * 统一走 openAppPath（自带页面栈满 redirectTo 兜底与失败透出），不再手写空 fail/catch。
 *
 * @param url 法律页面路径（legal 分包 agreement / privacy）
 */
function openLegalPage(url: string) {
  lightHaptic();
  openAppPath(url);
}

/** 跳转到用户协议页面 */
function openUserAgreement() {
  openLegalPage("/subpackages/legal/agreement/index");
}

/** 跳转到隐私政策页面 */
function openPrivacyPolicy() {
  openLegalPage("/subpackages/legal/privacy/index");
}

/* ============================================================
 * 功能2：第三方账号登录（微信 / Apple）
 * ============================================================
 * - 微信登录已有 onWechatLogin 处理，这里复用按钮即可
 * - Apple 登录仅 H5 / iOS 环境可用，通过条件编译控制显示
 * - 账号绑定入口跳转到设置页（已登录用户可管理第三方绑定）
 * - 2026-08-30 第五轮：登录页移除第三方登录区与账号绑定入口后，
 *   onAppleLogin / openAccountBinding 已无模板引用，按死代码删除
 *   （Apple 登录与绑定管理能力保留在安全中心页，未删除功能本身）
 * ============================================================ */
</script>

<template>
  <view class="login-page" :style="menuStyleVars">
    <!-- 品牌区（理想图《登录页面》：品牌名+小苗+副标，深色文字于浅色背景） -->
    <view class="login-page__brand">
      <view class="hero-title-row">
        <text class="logo-title">{{ heroTitle }}</text>
        <!-- 2026-08-25 P0：主标题后绿色小苗图标（规格书 1.2 / 2.3） -->
        <image class="logo-title-sprout" :src="IMAGE_PATHS.ICONS_V2.SPROUT" mode="aspectFit" alt="" />
      </view>
      <text class="logo-subtitle">{{ heroSubtitle }}</text>
    </view>

    <!-- 中部实景插画区（纯插画，不叠加文字） -->
    <view class="login-page__hero">
      <image
        class="hero-image"
        :src="IMAGE_PATHS.POSTERS.LOGIN_ILLUSTRATION"
        mode="aspectFill"
        aria-hidden="true" alt=""
      />
    </view>

    <!-- 图下 slogan 区（理想图：深色主句 + 绿色副句 + 灰色说明） -->
    <view class="login-page__tagline">
      <text class="hero-desc">{{ heroDesc }}</text>
      <text class="hero-desc hero-desc--sub">{{ heroDescSub }}</text>
      <!-- 2026-08-25 P0：底部说明（规格书 2.8） -->
      <text class="hero-desc-discover">{{ t('login.discoverSubDesc') }}</text>
    </view>

    <!-- 底部按钮区（占 30% 高度） -->
    <view class="login-page__bottom">
      <!-- B6：后台关闭登录功能（login_open=false）→ 关闭横幅 + 禁用登录按钮 -->
      <view v-if="!isLoginOpen" class="login-closed-banner" role="alert">
        <text class="login-closed-banner__title">{{ t('login.closedTitle') }}</text>
        <text class="login-closed-banner__desc">{{ t('login.closedDesc') }}</text>
      </view>
      <view class="login-card card-base" :class="{ 'login-blocked': !isLoginOpen }">
        <view v-if="!showPhoneLogin" class="login-quick">
          <!-- 2026-08-10 a11y 修复：登录按钮补 role="button" + aria-label（屏幕阅读器可识别，e2e @a11y 断言） -->
          <view
            class="btn-primary press-feedback"
            :class="{ 'btn--loading': loginFlowActive }"
            hover-class="press-feedback--active"
            hover-stay-time="40"
            role="button"
            :aria-label="t('login.wechatLogin')"
            @tap="onWechatLoginGuarded"
          >
            <view class="btn-icon-wrap">
              <!-- 2026-08-25 P0：真实微信绿色气泡 SVG（自绘，规格书 2.9） -->
              <image class="btn-icon-wechat" :src="IMAGE_PATHS.ICONS_V2.WECHAT_GREEN_SVG" mode="aspectFit" alt="" />
            </view>
            <text class="btn-primary-text">{{ t('login.wechatLogin') }}</text>
          </view>

          <!-- 微信手机号快捷登录（getPhoneNumber）：dev 模式 404 时自动展开验证码表单（L283-287 fallback） -->
          <!-- #ifdef MP-WEIXIN -->
          <button
            open-type="getPhoneNumber"
            @getphonenumber="handleGetPhoneNumberGuarded"
            class="btn-phone-quick press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="40"
            role="button"
            :aria-label="t('login.phoneQuickLogin')"
          >
            <text class="btn-phone-quick-text">{{ t('login.phoneQuickLogin') }}</text>
          </button>
          <!-- MP-R1-PAGES-LOGIN-INDEX-201：微信端补低调「手机号登录」文字兜底入口——
               DevTools/自动化下 open-type=getPhoneNumber 回调不触发（测试环境死点），
               且快捷授权被拒/失败才自动展开表单；文字入口保证表单链路任何环境可达。 -->
          <view
            class="login-sms-fallback press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="40"
            role="button"
            :aria-label="t('login.phoneLogin')"
            @tap="togglePhoneLogin"
          >
            <text class="login-sms-fallback-text">{{ t('login.phoneLogin') }}</text>
          </view>
          <!-- #endif -->

          <!-- 2026-09-02 R11 用户要求：手机登录有两个入口，删除下方冗余的「手机号登录」按钮
               （快捷登录失败会自动展开表单，不再需要手动入口）。
               MP-R2-PAGES-LOGIN-INDEX-002：该自动展开依赖 getPhoneNumber（仅微信端存在），
               H5 构建下手机号登录/注册入口不可达成死路——非微信端恢复手动入口按钮。 -->
          <!-- #ifndef MP-WEIXIN -->
          <view
            class="btn-phone-quick press-feedback"
            :class="{ 'btn--loading': loginFlowActive }"
            hover-class="press-feedback--active"
            hover-stay-time="40"
            role="button"
            :aria-label="t('login.phoneQuickLogin')"
            @tap="togglePhoneLogin"
          >
            <text class="btn-phone-quick-text">{{ t('login.phoneQuickLogin') }}</text>
          </view>
          <!-- #endif -->

          <view
            class="btn-guest press-feedback"
            :class="{ 'btn--loading': loginFlowActive }"
            hover-class="press-feedback--active"
            hover-stay-time="40"
            role="button"
            :aria-label="t('login.guestLogin')"
            @tap="onGuestLoginGuarded"
          >
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
  cursor-spacing="20"
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
  cursor-spacing="20"
                id="login-password"
                class="input-field"
                type="text"
                :password="true"
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
  cursor-spacing="20"
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

            <!-- 3-N 未成年人保护：注册必填出生日期（picker mode="date"，end 为今天） -->
            <view v-if="phoneRegisterMode" class="input-divider" />

            <view v-if="phoneRegisterMode" class="input-item">
              <view class="input-icon" aria-hidden="true">
                <image class="input-icon-text" :src="IMAGE_PATHS.ICONS_EMOJI.CAKE" mode="aspectFit" alt="" />
              </view>
              <label class="sr-only" for="login-birth-date">{{ t('login.birthDatePlaceholder') }}</label>
              <picker
                mode="date"
                :end="birthDateMax"
                :value="birthDate"
                @change="onBirthDateChange"
              >
                <view class="picker-field" :class="{ 'picker-field--placeholder': !birthDate }">
                  <text>{{ birthDate || t('login.birthDatePlaceholder') }}</text>
                </view>
              </picker>
            </view>

            <!-- 短信验证码（注册模式必填；模拟短信：获取后输入返回的 mockCode 即视为已收到） -->
            <view v-if="phoneRegisterMode" class="input-divider" />
            <view v-if="phoneRegisterMode" class="input-item">
              <view class="input-icon" aria-hidden="true">
                <image class="input-icon-text" :src="loginIcons.mobile" mode="aspectFit" alt="" />
              </view>
              <label class="sr-only" for="login-sms-code">{{ t('login.smsCodePlaceholder') }}</label>
              <input
  cursor-spacing="20"
                id="login-sms-code"
                class="input-field"
                type="number"
                maxlength="6"
                :placeholder="t('login.smsCodePlaceholder')"
                placeholder-class="input-placeholder"
                v-model="smsCode"
                :aria-label="t('login.smsCodePlaceholder')"
                aria-required="true"
                inputmode="numeric"
              />
              <view
                class="sms-send-btn"
                :class="{ 'sms-send-btn--disabled': smsCountdown > 0 }"
                hover-class="press-feedback--active"
                hover-stay-time="40"
                role="button"
                :aria-label="t('login.getSmsCode')"
                @tap="onSendSmsCode"
              >
                <text class="sms-send-btn-text">{{ smsCountdown > 0 ? `${smsCountdown}s` : t('login.getSmsCode') }}</text>
              </view>
            </view>
          </view>

          <view class="form-btns">
            <view class="btn-primary press-feedback" :class="{ 'btn--loading': loginFlowActive }" hover-class="press-feedback--active" hover-stay-time="40" @tap="onPhoneLoginGuarded">
              <text class="btn-primary-text">{{ phoneRegisterMode ? t('login.registerButton') : t('login.loginButton') }}</text>
            </view>

            <!-- B6：注册功能被后台关闭（register_open=false）→ 隐藏注册模式切换入口。
                 2026-09-12：入口改跳独立注册页；内联注册模式残留时仍可返回登录 -->
            <view
              v-if="isRegisterOpen && !phoneRegisterMode"
              class="btn-text press-feedback"
              hover-class="press-feedback--active"
              hover-stay-time="40"
              @tap="goRegisterPage"
            >
              <text class="btn-text-link">{{ t('login.goRegister') }}</text>
            </view>
            <view
              v-if="isRegisterOpen && phoneRegisterMode"
              class="btn-text press-feedback"
              hover-class="press-feedback--active"
              hover-stay-time="40"
              @tap="toggleRegisterMode"
            >
              <text class="btn-text-link">{{ t('login.backToLogin') }}</text>
            </view>

            <view class="btn-text press-feedback" hover-class="press-feedback--active" hover-stay-time="40" @tap="togglePhoneLogin">
              <text class="btn-text-link">{{ t('login.backToWechat') }}</text>
            </view>
          </view>
        </view>
      <view class="terms-wrap">
        <view
          class="checkbox press-feedback"
          :class="{ 'checkbox--checked': agreed }"
          hover-class="press-feedback--active"
          hover-stay-time="40"
          @tap="onAgreeTap"
          role="checkbox"
          :aria-checked="agreed ? 'true' : 'false'"
          :aria-label="t('login.agreedPrefix')"
        >
          <image v-if="agreed" class="checkbox-check" :src="IMAGE_PATHS.ICONS_COMMON.CHECK_WHITE_SVG" mode="aspectFit" alt="" />
        </view>
        <view class="terms-text-wrap">
          <text class="terms-text">{{ t('login.agreedPrefix') }}</text>
          <text class="terms-link" @tap="openUserAgreement" role="link" :aria-label="t('login.userAgreementLink')">{{ t('login.userAgreementLink') }}</text>
          <text class="terms-text">{{ t('login.and') }}</text>
          <text class="terms-link" @tap="openPrivacyPolicy" role="link" :aria-label="t('login.privacyPolicyLink')">{{ t('login.privacyPolicyLink') }}</text>
        </view>
      </view>

      </view>

      <!-- 展示模式（全功能展示版）：以演示者身份进入全功能展示页 -->
      <view
        v-if="isShowcaseMode"
        class="showcase-entry press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="40"
        @tap="enterShowcase"
      >
        <view class="showcase-entry__badge">
          <text class="showcase-entry__badge-text">SHOW</text>
        </view>
        <view class="showcase-entry__body">
          <text class="showcase-entry__title">{{ t('login.showcaseEntryTitle') }}</text>
          <text class="showcase-entry__desc">{{ t('login.showcaseEntryDesc') }}</text>
        </view>
        <text class="showcase-entry__arrow">›</text>
      </view>

      <!-- 第五轮 QA 验收入口：dev-user=1 演示模式进入（仅 dev/mock 构建显示，视觉克制） -->
      <view
        v-if="showDevUserEntry"
        class="dev-user-entry press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="40"
        role="button"
        :aria-label="t('login.devUserEntryTitle')"
        @tap="onDevUserEntry"
      >
        <text class="dev-user-entry__badge">DEV</text>
        <text class="dev-user-entry__text">{{ t('login.devUserEntryTitle') }}</text>
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
  display: flex;
  flex-direction: column;
  background: var(--c-bg-page);
}

/* 中部实景插画区 —— 理想图：品牌区之下、slogan 之上的纯插画 */
.login-page__hero {
  position: relative;
  width: 100%;
  /* 2026-09-03 修复插画不显示：容器只有 min-height 无确定高度时，
     内部 height:100% 的 image 解析为 0（空屏）。改为确定高度。 */
  height: 520rpx;
  overflow: hidden;
}

/* 2026-09-03 背景不同调修复：插画上下缘做软过渡（渐隐到页面浅绿底色），
   消除插画硬边与页面底色的色差缝（用户反馈"背景不同调/断层"） */
.login-page__hero::before,
.login-page__hero::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  height: 100rpx;
  z-index: 1;
  pointer-events: none;
}

.login-page__hero::before {
  top: 0;
  background: linear-gradient(180deg, var(--c-bg-page) 0%, rgba(238, 247, 242, 0) 100%);
}

.login-page__hero::after {
  bottom: 0;
  background: linear-gradient(180deg, rgba(238, 247, 242, 0) 0%, var(--c-bg-page) 100%);
}

.hero-image {
  width: 100%;
  /* 2026-09-03：mp-weixin 原生 image 的 height:100% 在该上下文解析为 0，
     必须给显式高度（与容器 520rpx 一致）；display:block 消除 inline 基线空隙 */
  height: 520rpx;
  display: block;
  /* 理想图：插画全幅无边（不留两侧白边） */
}

/* 品牌区 —— 理想图《登录页面》：品牌名+小苗+副标，深色文字，左对齐 */
.login-page__brand {
  /* R10-P1-003：统一走 var(--statusbar, …) 兜底链，uni-app 平台变量作内层兜底 */
  padding: calc(var(--statusbar, var(--status-bar-height, 0px)) + 88rpx) var(--sp-8) 0;
  background: var(--c-bg-page);
}

.hero-title-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12rpx;
}

.logo-title {
  font-size: 56rpx;
  font-weight: 800;
  color: var(--c-text-primary);
  letter-spacing: 4rpx;
  line-height: 1.2;
  text-align: left;
}

.logo-title-sprout {
  width: 44rpx;
  height: 44rpx;
  flex-shrink: 0;
  margin-top: -6rpx;
}

.logo-subtitle {
  display: block;
  margin-top: 6rpx;
  font-size: 28rpx;
  font-weight: 500;
  color: var(--c-text-tertiary);
  text-align: left;
  line-height: 1.6;
  letter-spacing: 2rpx;
}

/* 图下 slogan 区 —— 理想图：居中（深色主句 + 绿色副句 + 灰色说明） */
.login-page__tagline {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx var(--sp-8) 0;
  background: var(--c-bg-page);
}

.hero-desc {
  margin-top: 0;
  font-size: 40rpx;
  /* R4-batch4 像素级对齐：参考图标版更突出（800 → 800 保持） */
  font-weight: 800;
  color: var(--c-text-primary);
  text-align: center;
  line-height: 1.5;
  letter-spacing: 2rpx;
}

.hero-desc--sub {
  margin-top: 10rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: var(--c-brand);
}

.hero-desc-discover {
  display: block;
  margin-top: 12rpx;
  font-size: var(--fs-sm);
  font-weight: 400;
  color: var(--c-text-primary);
  opacity: 0.55;
  text-align: center;
  letter-spacing: 1rpx;
}


/* 底部按钮区 —— 自然高度，不再用 flex:1 占满剩余空间 */
.login-page__bottom {
  flex: 0 0 auto;
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

/* B6：登录功能被后台关闭 → 卡片整体置灰并禁止交互（配合关闭横幅展示） */
.login-blocked {
  opacity: 0.55;
  pointer-events: none;
}

/* B6：登录关闭横幅（login_open=false 时展示） */
.login-closed-banner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-4) var(--sp-5);
  margin-bottom: var(--sp-5);
  border-radius: var(--r-lg);
  background: var(--c-warning-bg-tint, rgba(245, 158, 11, 0.1));
  border: 2rpx solid var(--c-warning-border-tint, rgba(245, 158, 11, 0.35));
  text-align: center;
}

.login-closed-banner__title {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--c-warning, #d97706);
}

.login-closed-banner__desc {
  font-size: var(--fs-sm);
  line-height: 1.6;
  color: var(--c-text-secondary);
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
  width: 32rpx;
  height: 32rpx;
}

.btn-primary-text {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--c-text-inverse);
  letter-spacing: 2rpx;
}

/* 手机号快捷登录按钮（getPhoneNumber）：与次按钮同风格 */
.btn-phone-quick {
  width: 100%;
  height: var(--btn-height-md);
  border-radius: var(--r-xl);
  background: var(--c-bg-container);
  border: 2rpx solid var(--c-border-default);
  display: flex;
  align-items: center;
  justify-content: center;
  /* 重置微信 button 默认样式 */
  margin: 0;
  padding: 0;
  line-height: var(--btn-height-md);
  font-size: var(--fs-lg);
  box-sizing: border-box;
}

/* #ifdef H5 */
.btn-phone-quick:active {
  transform: scale(0.96);
  background: var(--c-neutral-50);
}
/* #endif */

.btn-phone-quick-text {
  font-size: var(--fs-lg);
  font-weight: 500;
  color: var(--c-text-primary);
  letter-spacing: 2rpx;
}

/* MP-R1-PAGES-LOGIN-INDEX-201：微信端「手机号登录」低调文字兜底入口 */
.login-sms-fallback {
  margin-top: var(--sp-3, 24rpx);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-2, 16rpx) 0;
  min-height: 64rpx;
}

.login-sms-fallback-text {
  font-size: var(--fs-sm, 26rpx);
  color: var(--c-text-tertiary, #9AA39F);
}

/* MP-R2-PAGES-LOGIN-INDEX-008：.btn-secondary* 死样式已删（模板零引用） */

/* 稍后再看按钮：浅灰描边，弱于主/次按钮 */
.btn-guest {
  width: 100%;
  height: var(--btn-height-md);
  border-radius: var(--r-xl);
  background: var(--c-bg-container);
  border: 2rpx solid var(--c-neutral-200, #E8ECEA);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 var(--sp-4);
}

/* #ifdef H5 */
.btn-guest:active {
  transform: scale(0.96);
  background: var(--c-neutral-100);
}
/* #endif */

.btn-guest-text {
  font-size: var(--fs-lg);
  font-weight: 500;
  color: var(--c-text-tertiary, #9AA39F);
  letter-spacing: 2rpx;
}

.btn-guest-desc {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
  display: none;
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

/* 短信验证码发送按钮（注册模式） */
.sms-send-btn {
  flex-shrink: 0;
  margin-left: var(--sp-2);
  padding: 14rpx 24rpx;
  border-radius: var(--r-full);
  background: var(--c-brand, #36C99A);
}
.sms-send-btn--disabled {
  background: var(--c-neutral-200, #E8ECEA);
}
.sms-send-btn-text {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--c-text-inverse, #ffffff);
}
.sms-send-btn--disabled .sms-send-btn-text {
  color: var(--c-text-tertiary, #999999);
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

/* 3-N 注册出生日期 picker 字段（与 input 高度对齐） */
.picker-field {
  flex: 1;
  height: 100rpx;
  display: flex;
  align-items: center;
  font-size: var(--fs-lg);
  color: var(--c-text-primary);
}

.picker-field--placeholder {
  color: var(--c-text-quaternary);
  font-size: var(--fs-md);
}

.input-divider {
  height: 2rpx;
  background: var(--c-neutral-200);
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
  align-items: center;
  justify-content: center;
  gap: var(--sp-3);
  /* 2026-08-14：登录协议行同时服务微信快捷登录与手机号登录，置底与按钮区拉开间距 */
  margin-top: var(--sp-5, 20rpx);
  padding: 0 var(--sp-8);
  width: 100%;
}

/* ---------- 展示模式入口（全功能展示版） ---------- */
.showcase-entry {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  margin: var(--sp-4) var(--sp-8) 0;
  padding: var(--sp-4) var(--sp-5);
  border-radius: var(--r-xl, 24rpx);
  background: linear-gradient(135deg, var(--c-tint-blue-50) 0%, var(--c-tint-blue-soft) 100%);
  border: 2rpx solid var(--c-secondary-blue-border-tint-strong, rgba(91, 127, 255, 0.18));
  transition: all var(--d-fast, 120ms) ease;
}

.showcase-entry__badge {
  width: 64rpx;
  height: 64rpx;
  border-radius: var(--r-lg, 18rpx);
  /* R4-batch4：品牌蓝紫渐变 #3B9DE5→#7C6CF0 无对应 design token（近似 --c-info / --c-romance），保留原值 */
  background: linear-gradient(135deg, #3B9DE5, #7C6CF0);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.showcase-entry__badge-text {
  font-size: var(--fs-xs, 20rpx);
  font-weight: 700;
  color: var(--c-text-inverse);
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
  color: var(--c-info-500, #3B82F6);
  font-weight: 600;
}

/* ---------- dev-user=1 演示模式入口（第五轮 QA 验收入口，仅 dev/mock 构建显示） ---------- */
.dev-user-entry {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  margin-top: var(--sp-3);
  padding: var(--sp-2);
}

.dev-user-entry__badge {
  font-size: var(--fs-xs, 20rpx);
  font-weight: 700;
  color: var(--c-text-inverse);
  background: var(--c-text-quaternary);
  border-radius: var(--r-sm, 8rpx);
  padding: 2rpx 8rpx;
  letter-spacing: 1rpx;
}

.dev-user-entry__text {
  font-size: var(--fs-sm, 22rpx);
  color: var(--c-text-quaternary);
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
  width: 26rpx;
  height: 26rpx;
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

/* MP-R2-PAGES-LOGIN-INDEX-008：.third-party-* 死样式已删（对应模板已于 2026-08-25 移除） */

</style>
