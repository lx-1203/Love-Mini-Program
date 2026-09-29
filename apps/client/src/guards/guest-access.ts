/**
 * 游客落点守卫（round-7 裁定：游客一律必须被引导到登录/注册，setup 引导流程不豁免）
 *
 * 为什么需要这一层（在册机制事实，逐条核过源码）：
 * - 此前游客被弹到登录页基本只出自 HTTP 401 兜底（`services/http.ts:493` 的
 *   `uni.reLaunch({ url: ROUTES.LOGIN })`，前置 `:494` 的 `LOGIN_REDIRECT_DELAY_MS`
 *   = `constants/app.ts:40` 的 500ms；唯一的路由侧例外是 fe3338d2 给 matching.vue goBack
 *   加的 !getToken() 分支，但那是失败分支的事后补救），也就是「页面先渲染、请求先打出去、
 *   后端先说 401」之后才有的补救动作。页面拿得到数据（mock 带 fixture）或压根不发请求
 *   （无 userId 就跳过 GET）时，401 永远不来，游客就一直停在内容页上 ——
 *   分诊台点名的 5 组落地对（landingMissing=5）就是这么产生的。
 * - 路由守卫 `composables/usePageAccess.ts:79` 对「无 token 的游客」是**故意放行**的
 *   （注释在 :75-78：未登录由页面自身 LockScreen 承担引导），因此它既不是这批落点的来源，
 *   也不能反向拿来拦这批人：它是 onShow 时序，而 campus/index 这类页在 onLoad 就已经
 *   `redirectTo` 把游客送走了；把 :79 的早退改成弹登录页还会连带改掉
 *   guest-landing-booked.json 那 26 组已入账落点的语义（改的是机制口径，不是这一层）。
 *
 * 所以本模块只做一件事：在**页面自己的 onLoad 入口**（早于任何数据请求与页内重定向）
 * 判定游客，并按 401 兜底同一套物件引导 —— 同一文案键 `apiErrors.loginRequired`、
 * 同一延迟常量 `LOGIN_REDIRECT_DELAY_MS`、同一目标 `ROUTES.LOGIN`，不新造跳转体系。
 *
 * 与 401 兜底的分工（不许打坏既有正确行为）：
 * - 游客（真实带、本地无 token）：本守卫在 onLoad 就拦，页面不再发受保护请求；
 * - 持 token 但会话失效/过期：本守卫放行（`getToken()` 为真），继续由 401 兜底处理，
 *   「登录已过期」语义不变（见 http.ts:473-482 的 hadSession 分支）；
 * - mock 演示带：放行 —— mock 的「登录」是本地注入会话、storage 里从来没有 token
 *   （在册口径 pages/nearby/index.vue:60-68），把它当游客会让全部演示链路进不了页；
 *   真实构建里 mock 分支被 scripts/strip-mock-for-mp.mjs 剔除，不构成逃逸通道。
 *
 * 展示模式（VITE_SHOWCASE_MODE 全功能展示包）沿用 `usePageAccess.ts:58` 的旁路口径，
 * 正式包该旗标恒为 false，不构成放行通道。
 */
import { LOGIN_REDIRECT_DELAY_MS } from "../constants/app";
import { ROUTES } from "../constants/routes";
import { isShowcaseMode } from "../config/showcase";
// 与 HTTP 401 兜底同一 token 真相源（services/http.ts 导出）
import { getToken } from "../services/http";
// mock 带的登录是本地模拟会话（getToken 恒空），放行口径沿用 pages/nearby/index.vue:60-68
import { useMock } from "../stores/helpers/use-mock";
// 与 HTTP 401 兜底游客分支同一文案键（http.ts:479 用的是 apiErrors.loginRequired）
import { t } from "@/i18n";

/**
 * 当前是否处于「游客态」：本地无 token。
 *
 * 判定口径与 `usePageAccess.ts:79`、`http.ts` 的 `hadSession` 完全一致 ——
 * 只看本地 token，不看 userSession（会话可能还在 bootstrap，token 是同步可得的）。
 *
 * mock 构建不算游客：mock 的「登录」是 stores/session.ts:619 注入的本地模拟会话，
 * storage 里根本没有 token（在册口径见 `pages/nearby/index.vue:60-68` 的
 * canFetchProtected：「mock 模式登录为本地模拟会话（getToken 恒空），需放行」）。
 * 真实构建（VITE_API_MODE≠mock，mock 分支被 strip-mock-for-mp.mjs 整段剔除）没有这条通道，
 * 所以「一律」在生产形态上不成立任何豁免。
 *
 * @returns true 表示游客（无 token 且非 mock 演示带）
 */
export function isGuest(): boolean {
  if (useMock()) return false;
  return !getToken();
}

/**
 * 游客引导：无 token 时把用户送到登录页（默认态即露出「去注册」入口，
 * 见 `pages/login/index.vue:692-698` 的 `.login-register-entry`，受 register_open 开关控制）。
 *
 * 调用约定：页面在 `onLoad` **最前面**调用，返回 true 时必须立即 `return`，
 * 不再发请求、不再执行页内重定向（页面自身的 onShow/onMounted 也要按返回的旗标早退，
 * 避免给一个已经要走的人打一次受保护请求）。
 *
 * @returns true = 已按游客拦下并安排跳转（调用方应中止本页初始化）；false = 放行
 */
export function guideGuestToLogin(): boolean {
  // 展示包旁路（与 usePageAccess.ts:58 同口径）
  if (isShowcaseMode) return false;
  // 持 token（含失效 token）一律放行，交给 HTTP 401 兜底那套既有行为
  if (!isGuest()) return false;

  // 与 http.ts:475-494 同序：先提示再跳，延迟取同一常量，避免 Toast 被 reLaunch 掐掉
  uni.showToast({ title: t("apiErrors.loginRequired"), icon: "none" });
  setTimeout(() => {
    // reLaunch（与 http.ts:493 同一动作）：清空页面栈，游客不会返回到刚才那张内容页
    uni.reLaunch({ url: ROUTES.LOGIN });
  }, LOGIN_REDIRECT_DELAY_MS);
  return true;
}
