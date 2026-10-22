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
// MP-R2-PAGES-LOGIN-INDEX-015：内联注册模式已删（注册唯一入口 = 独立注册页 pages/register/index），
// 故本页不再调用 registerUser / sendSmsCode
import { loginWithPhone, loginAsGuest, bindPhoneViaWechat } from "../../services/auth";
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
// MP-R2-PAGES-LOGIN-INDEX-015：内联注册模式所需 nickname / birthDate / smsCode /
// 短信倒计时 / phoneRegisterMode 已全部删除（注册唯一入口 = 独立注册页）
const phone = ref("");
const password = ref("");
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

/**
 * R7-L01-D01：微信端「验证码或密码登录」文字兜底入口的可见性。
 * 它服务的是 DevTools/自动化下 open-type=getPhoneNumber 回调不触发的死点（MP-R1-PAGES-LOGIN-INDEX-201），
 * 素材/理想效果图/登录页面.png 按钮区只有「微信一键登录 / 手机号登录 / 稍后再看」三档 + 协议行，
 * 第四档位置为空 ⇒ 真实档（isDev=false 且 apiMode≠mock）取景帧上这一整行必须缺席，
 * 否则既多出设计稿外的文字（D01），又用它的 margin-top/padding/min-height 撑坏按钮列节奏（D02）。
 * 判据与 showDevUserEntry 同口径：dev / mock 档保留（表单链路仍可达），real 档不出图。
 */
const showPhoneLoginFallback = computed(() => isDev || isMockMode());

/** 登录成功跳转定时器引用，用于卸载时清理 */
let loginNavTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * onShow 钩子：统一处理页面进入/回到前台逻辑。
 * - 记录面包屑（便于异常回溯）
 */
onShow(() => {
  // 记录页面进入面包屑，便于在异常发生时回溯用户跳转路径
  addBreadcrumb("navigation", "page_enter", { url: "/pages/login/index" });
  // B6：原「register_open=false 时强制退出内联注册模式」的复位已随 MP-R2-PAGES-LOGIN-INDEX-015
  // 删除内联注册模式一并消失；register_open 现在只用于隐藏「去注册」入口（模板）。
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
// MP-R2-PAGES-LOGIN-INDEX-015：canPhoneRegister（注册模式额外要求昵称/出生日期/短信验证码）
// 已随内联注册模式删除

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
  // MP-R2-PAGES-LOGIN-INDEX-015：短信倒计时定时器（MP-R2-PAGES-LOGIN-INDEX-006 的清理载体）
  // 随内联注册模式一并删除——本页已无 setInterval
  stopSessionForwardWatch?.();
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

/**
 * 2026-09-12 注册页落地：「去注册」入口改跳独立注册页（pages/register/index，
 * 设计包 deliverables/注册页）。
 * MP-R2-PAGES-LOGIN-INDEX-015：内联注册模式（toggleRegisterMode / phoneRegisterMode /
 * onSendSmsCode 短信链路）已整删——本页注册唯一入口即本函数。
 */
function goRegisterPage() {
  uni.navigateTo({ url: ROUTES.REGISTER });
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
  // B6：登录功能被后台关闭时拒绝提交（对应入口按钮已隐藏/禁用，此处兜底）
  // MP-R2-PAGES-LOGIN-INDEX-015：原「注册模式 + register_open=false」兜底分支随内联注册模式删除
  if (!isLoginOpen.value) {
    uni.showToast({ title: t("login.closedTitle"), icon: "none" });
    return;
  }
  if (!canPhoneLogin.value) {
    uni.showToast({ title: t("login.phoneAndCodeInvalid"), icon: "none" });
    return;
  }
  // infra R2 联调改进:真实调用后端(参考 eladmin 账号体系)。
  // 登录 POST /v1/auth/phone-login（注册已迁 pages/register/index → POST /v1/auth/register）
  // MP-R1-LOGIN-002：请求在途期间压制 watch(isLoggedIn) 的补偿跳转
  loginFlowActive.value = true;
  try {
    await loginWithPhone(phone.value.trim(), password.value);
    addBreadcrumb("ui", "button_click", { id: "login.phone" });
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
      captureException(error, { source: "login.phone" });
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

// MP-R2-PAGES-LOGIN-INDEX-015：onBirthDateChange（内联注册模式的出生日期 picker 回调）已删

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
            v-if="showPhoneLoginFallback"
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
          <!-- MP-R2VIS-PAGES-LOGIN-INDEX-007：非微信端本按钮是「展开验证码/密码表单」的手动入口，
               不是微信 getPhoneNumber 快捷授权，故取 login.phoneLogin（表单入口键），
               把 login.phoneQuickLogin 独占给上方微信端快捷按钮。
               aria-label 与可见文本仍同键（保持 MP-R2-PAGES-LOGIN-INDEX-016 的 WCAG 2.5.3 口径）。
               样式同步弱化：.login-phone-entry 取代 .btn-phone-quick（快捷授权按钮专用样式），
               与本分支的兜底定位一致，不再与快捷登录按钮同权。 -->
          <view
            class="login-phone-entry press-feedback"
            :class="{ 'btn--loading': loginFlowActive }"
            hover-class="press-feedback--active"
            hover-stay-time="40"
            role="button"
            :aria-label="t('login.phoneLogin')"
            @tap="togglePhoneLogin"
          >
            <text class="login-phone-entry-text">{{ t('login.phoneLogin') }}</text>
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
          <!-- MP-R7-GUEST-LANDING-REGENTRY-001：游客是被 HTTP 401 兜底弹到本页的（services/http.ts:493-494），
               而「去注册」原先只在下面 v-else 的手机号表单分支里（本文件 login-form 段的 form-btns）⇒
               没有账号的新用户落地后在默认态看不见任何注册路径，与裁定「未登录须引导到注册」不符。
               这里复用同一 goRegisterPage、同一 isRegisterOpen 开关、同一文案键（zh/en 早已配对），
               并直接挂现有 .btn-text 样式（不新增 CSS、不新增文案）。 -->
          <view
            v-if="isRegisterOpen"
            class="btn-text login-register-entry press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="40"
            role="button"
            :aria-label="t('login.goRegister')"
            @tap="goRegisterPage"
          >
            <text class="btn-text-link">{{ t('login.goRegister') }}</text>
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

            <!-- MP-R2-PAGES-LOGIN-INDEX-015：内联注册模式的昵称 / 出生日期 / 短信验证码
                 三组输入（原 v-if="phoneRegisterMode" 节点）已整删，
                 注册唯一入口 = 下方「去注册」→ pages/register/index -->
          </view>

          <view class="form-btns">
            <view class="btn-primary press-feedback" :class="{ 'btn--loading': loginFlowActive }" hover-class="press-feedback--active" hover-stay-time="40" @tap="onPhoneLoginGuarded">
              <text class="btn-primary-text">{{ t('login.loginButton') }}</text>
            </view>

            <!-- B6：注册功能被后台关闭（register_open=false）→ 隐藏「去注册」入口。
                 2026-09-12：入口改跳独立注册页；MP-R2-PAGES-LOGIN-INDEX-015 删内联注册模式后
                 原「返回登录」切换按钮（仅在注册模式下出现）一并删除 -->
            <view
              v-if="isRegisterOpen"
              class="btn-text press-feedback"
              hover-class="press-feedback--active"
              hover-stay-time="40"
              @tap="goRegisterPage"
            >
              <text class="btn-text-link">{{ t('login.goRegister') }}</text>
            </view>

            <view class="btn-text press-feedback" hover-class="press-feedback--active" hover-stay-time="40" @tap="togglePhoneLogin">
              <text class="btn-text-link">{{ t('login.backToWechat') }}</text>
            </view>
          </view>
        </view>
      <!-- R7-L01-D03：勾选热区从 34rpx 圆点提到整行。未勾选时所有登录入口都被 agreeFirst
           守卫拦截（:229 等 5 处），原先全行唯一可点区只有那枚圆点，远低于微信
           《小程序体验设计规范》/ WCAG 2.5.5 的 88rpx 最小热区口径 ⇒ 卡住主流程。
           整行补 @tap（圆点自身 .stop 防双触发，两个协议链接补 .stop 防误勾选）；
           checkbox 语义（role/aria-checked/aria-label）仍留在圆点上，行只作热区，
           避免同一控件出现两个 checkbox 节点。 -->
      <view class="terms-wrap" @tap="onAgreeTap">
        <view
          class="checkbox press-feedback"
          :class="{ 'checkbox--checked': agreed }"
          hover-class="press-feedback--active"
          hover-stay-time="40"
          @tap.stop="onAgreeTap"
          role="checkbox"
          :aria-checked="agreed ? 'true' : 'false'"
          :aria-label="t('login.agreedPrefix')"
        >
          <image v-if="agreed" class="checkbox-check" :src="IMAGE_PATHS.ICONS_COMMON.CHECK_WHITE_SVG" mode="aspectFit" alt="" />
        </view>
        <view class="terms-text-wrap">
          <text class="terms-text">{{ t('login.agreedPrefix') }}</text>
          <text class="terms-link" @tap.stop="openUserAgreement" role="link" :aria-label="t('login.userAgreementLink')">{{ t('login.userAgreementLink') }}</text>
          <text class="terms-text">{{ t('login.and') }}</text>
          <text class="terms-link" @tap.stop="openPrivacyPolicy" role="link" :aria-label="t('login.privacyPolicyLink')">{{ t('login.privacyPolicyLink') }}</text>
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
  /* R11-L01-D01（尺寸比例 P2）：素材真身不是方图——apps/client/src/static/assets/images/posters/
     login-illustration.jpg 的 SOF 帧实测 750w×1000h（卡上"正方形构图"的前提不成立）。
     旧 520rpx 槽走居中 aspectFill ⇒ 只取源 y 240..760；两人坐在 y≈844 的草坪线上，
     画面就在这里断在腿根，整条前景草坪带一条都进不来（帧上读成"半身头像条"）。
     卡给的 750rpx 整槽不用：本页纵向没有那么多余量——实测 520rpx 时协议行已在 y≈737、
     系统 home 条在 y≈800（帧内逐行扫描），余量 55px 左右；+230rpx(115px) 会把
     :702 的唯一注册入口「去注册」和协议行一起推出首屏。
     改为「窗口抬到 600rpx + 图像下移取景」：窗口 600rpx（+80rpx，协议行落到 y≈777 仍在首屏内），
     图像按原生比例 750×1000rpx 定位到 top:-360rpx ⇒ 可见源 y 360..960：
     两人自头顶(y≈507)到坐地(y≈844)全身入画，草坪带 y 844..960 一并进画，
     被砍掉的只是顶部 y 0..360 那段信息量最低的空天空/飘叶。
     （取景窗口按像素裁片实测确认，见交付说明；容器高度不跟图像高走，overflow:hidden 负责裁。） */
  height: 600rpx;
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
  /* R11-L01-D01（同条第二半）：下沿渐隐原与上沿同为 100rpx。取景框下移后，
     窗口最底 100rpx 压的是源 y 860..960 的草坪（见 .hero-image），不是旧画面里的天空，
     100rpx 会把刚抢回来的草坪带整段糊掉 ⇒ 下沿收到 48rpx（只糊最外一圈、消除硬缝）。
     上沿 100rpx 不动：它压在源 y 360..460 的天际线上，是承接页底、软化切口的过渡带。 */
  height: 48rpx;
  background: linear-gradient(180deg, rgba(238, 247, 242, 0) 0%, var(--c-bg-page) 100%);
}

.hero-image {
  /* 2026-09-03：mp-weixin 原生 image 的 height:100% 在该上下文解析为 0，
     必须给显式高度；display:block 消除 inline 基线空隙。
     R11-L01-D01：高度不再是"与容器等高"的 600rpx，而是素材原生 1000rpx，靠 top:-360rpx
     把取景框下移（等价于"窗口下移"而非"图放大"：750rpx 宽 = 素材原生 750px 宽，1:1 不重采样，
     人物像素尺寸与旧帧完全一致，只换取景范围）。宿主 .login-page__hero 已是 position:relative，
     多出的 400rpx（-360..640）由宿主 overflow:hidden 裁掉。
     取景终点 = 360+600 = 源 y 960，仍在草坪带内（草坪 844..1000），下沿渐隐压在草地上、无硬缝。 */
  position: absolute;
  left: 0;
  top: -360rpx;
  width: 100%;
  height: 1000rpx;
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
  /* R10-L01-D01（P1 颜色token）：副句原取 --c-brand(#36C99A) 压页面底 #EEF7F2 实算 1.93:1，
     强光/低视力下「慢慢成为特别的人」整行消失。换 --c-brand-800(#156B51，压 #EEF7F2 实算 5.92:1，
     真值取 design-variables.scss:18)，brand-500 仅留作装饰色块。30rpx/700 非大字号，需 ≥4.5。 */
  color: var(--c-brand-800, #156b51);
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
  border-radius: var(--r-full);
  /* R10-L01-D02（P1 颜色token）：主 CTA 底原取 --c-brand(#36C99A)，第 1093 行白字（--c-text-inverse）
     实算 2.10:1，「微信一键登录」六字与绿底同明度档、只剩一颗无字绿胶囊。底改 --c-brand-800(#156B51，
     白字 6.45:1)，与 BottomActionBar 主 CTA(R9 已落档) 一致。本页唯一主操作。 */
  background: var(--c-brand-800, #156b51);
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
  /* R11-L01-D02（颜色token P2）：判点成立——#07C160 的微信标压在 .btn-icon-wrap
     （rgba(255,255,255,.25) 覆在本块 :1074 的 --c-brand-800 #156B51 上，合成 #4A907C）上，
     按 design-variables.scss 真值实算 1.58:1（卡按 #4F5D54 底算得 2.88:1，两档都 <3:1，
     品牌标识别度确实丢失）。但卡给的第二条"把底提到 --c-overlay-bg-solid（90% 白）"是反向的：
     #07C160 压 90% 白合成底只有 2.05:1、压纯白上限 2.39:1 ⇒ 这枚绿标在任何浅色底上
     都不可能到 3:1，照它改等于把缺陷改得更糟（任务书 §2「对比度要算，不要看着改」）。
     改走仓内已落地的同族口径：components/discover/NotLoggedWaiting.vue:454 对同一枚
     WECHAT_GREEN_SVG 就地反白（R2b-L02-D15，同一判点、已上屏）。反白后白形压 #4A907C = 3.77:1 ≥3:1，
     与同按钮 --c-text-inverse 白字同档。不新增素材、不换常量、不改底。
     （mp-weixin 侧 filter 会编进 wxss：dist 里 AvatarFrame/MatchSuccess 等同族规则并存。） */
  filter: brightness(0) invert(1);
}

.btn-primary-text {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--c-text-inverse);
  letter-spacing: 2rpx;
}

/* 手机号快捷登录按钮（getPhoneNumber）：微信端专用，主按钮之下的描边次按钮 */
.btn-phone-quick {
  width: 100%;
  height: var(--btn-height-md);
  border-radius: var(--r-full);
  background: var(--c-bg-container);
  border: 2rpx solid var(--c-border-default);
  box-shadow: var(--card-shadow);
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

/* MP-R1-PAGES-LOGIN-INDEX-201：微信端「手机号登录」低调文字兜底入口
   R7-L01-D02：原 margin-top:var(--sp-3) + padding:var(--sp-2)0 + min-height:64rpx 三股
   垂直盒叠加，实测在「手机号快捷登录」与「稍后再看」之间撑出 89rpx（同列 --sp-4 节奏的 5 倍），
   把「稍后再看」整档压沉。本行只作文字入口，纵向间距一律交给 .login-quick 的 gap:var(--sp-4)
   单点决定，自身不再贡献任何垂直外边距/内边距/最小高。 */
.login-sms-fallback {
  margin-top: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  min-height: 0;
}

.login-sms-fallback-text {
  font-size: var(--fs-sm, 26rpx);
  color: var(--c-text-tertiary, #9AA39F);
}

/* MP-R2VIS-PAGES-LOGIN-INDEX-007：非微信端「验证码或密码登录」表单入口同为兜底路径，
   弱化样式（浅描边 / 无阴影 / 次级字色 / 矮于主按钮），与微信端 .login-sms-fallback 同级，
   不再复用 .btn-phone-quick（快捷授权按钮）的同权外观 */
.login-phone-entry {
  width: 100%;
  min-height: var(--btn-height-sm);
  border-radius: var(--r-lg);
  background: transparent;
  border: 1rpx solid var(--c-border-default, #DDE3E0);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0 var(--sp-4);
  box-sizing: border-box;
}

/* #ifdef H5 */
.login-phone-entry:active {
  transform: scale(0.96);
  background: var(--c-neutral-50);
}
/* #endif */

.login-phone-entry-text {
  font-size: var(--fs-md);
  font-weight: 500;
  color: var(--c-text-secondary);
  letter-spacing: 2rpx;
}

/* MP-R2-PAGES-LOGIN-INDEX-008：.btn-secondary* 死样式已删（模板零引用） */

/* 稍后再看按钮：浅灰填充无描边，弱于主/次按钮 */
.btn-guest {
  width: 100%;
  height: var(--btn-height-md);
  border-radius: var(--r-full);
  background: var(--c-bg-surface);
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

/* MP-R2-PAGES-LOGIN-INDEX-015：.sms-send-btn* 死样式已删（模板零引用，注册模式整删） */

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

/* MP-R2-PAGES-LOGIN-INDEX-015：.picker-field* （3-N 注册出生日期 picker）死样式已删 */

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
  /* R11-L01-D03（可达性 P1）：本类是「没有账号？去注册」的实体热区（:702-712 的默认态唯一
     注册入口，按 :697-701 的在册说明内联注册模式已删），原高 80rpx < 88rpx 最小可点件口径。
     抬到 88rpx（卡给的第一条口径；字号/字色不动，另由 D04 单独收口字色）。
     本类同时服务 :774 的「去注册」与 :782 的「返回微信登录」文字钮，三条同属文字按钮，
     一并抬到同一口径，不留第二处 80rpx 死区。 */
  height: 88rpx;
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
  /* R11-L01-D04（可达性 P1）：字色原取 --c-text-quaternary（$text-quaternary #9AA39F）
     压页底 --c-bg-page（#EEF7F2）实算 2.37:1，链接比同页 .terms-link 还暗两档。
     收 --c-brand-800（#156B51，压 #EEF7F2 5.91:1），与本文件 .terms-link
     在 R10-L01-D03 已收口的档位对齐。 */
  color: var(--c-brand-800, #156b51);
}

.terms-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-3);
  /* 2026-08-14：登录协议行同时服务微信快捷登录与手机号登录，置底与按钮区拉开间距 */
  margin-top: var(--sp-5, 20rpx);
  padding: 0 var(--sp-8);
  /* R7-L01-D03：本行现为勾选热区，纵向净高抬到 88rpx 最小可点件口径
     （原行高仅约 34rpx 圆点高，整行可点区不足口径一半）。视觉件尺寸未变。 */
  min-height: 88rpx;
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
  /* R10-L01-D03（P2 颜色token）：法务必读行原取 --c-text-quaternary(#9AA39F) 压 #EEF7F2 仅 2.37:1。
     卡上建议 text-tertiary(#6B7571)=4.36:1，但按任务书 §2「对比度要算」这档对 20rpx 小字仍 <4.5 AA，
     属 §2 点名的「建议改法本身不达标」，故取 --c-text-secondary(#4A524E，压 #EEF7F2 实算 7.38:1) 而非卡上的 tertiary。 */
  color: var(--c-text-secondary, #4a524e);
  line-height: 1.7;
}

.terms-link {
  font-size: var(--fs-xs);
  /* R10-L01-D03 另一半：两个协议链接原 --c-brand(#36C99A) 仅 1.93:1 → --c-brand-800(5.92:1)。
     勾选框视觉尺寸(34rpx)不动，本块只改前景字色。 */
  color: var(--c-brand-800, #156b51);
  line-height: 1.7;
}

/* MP-R2-PAGES-LOGIN-INDEX-008：.third-party-* 死样式已删（对应模板已于 2026-08-25 移除） */

</style>
