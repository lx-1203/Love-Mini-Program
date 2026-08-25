/**
 * dev-user=1 全局演示入口（第五轮 QA 验收入口）。
 *
 * 目标：任意页面携带 `?dev-user=1` 时，session store 自动以 mock 用户身份
 * （mockUserSession，user-1001）登录，跳过登录锁与资料二级锁；不携带时
 * 行为完全不变（正常登录流程、登录页首屏不受影响）。
 *
 * 触发链路（三层覆盖，保证「任意页面」均可生效）：
 * 1. 冷启动：App.vue onLaunch 调用 {@link applyDevUserFromLaunch}，读取
 *    uni.getLaunchOptionsSync().query；bootstrap 感知 devUserRequested 后
 *    不再用真实空会话覆盖（stores/session.ts bootstrap 分支）。
 * 2. 页面内导航：{@link registerDevUserEntry} 注册 uni.addInterceptor，
 *    拦截 navigateTo / redirectTo / reLaunch / switchTab，URL 含 dev-user=1
 *    时在跳转前注入会话（对 openAppPath / replaceAppPath / 直接 uni.* 调用均生效）。
 * 3. 页面级兜底：chat-session / messages 等关键页 onLoad 顶部调用
 *    {@link applyDevUserFromQuery}，覆盖自动化脚本直开页面（wx.* 直调绕过
 *    uni 拦截器）场景。
 *
 * 说明：mockUserSession 的 displayName 为「林晓」（user-1001，与全项目 mock
 * 家族一致：services/mocks/fixtures.ts、likes/village/campus mock-data 的
 * MOCK_CURRENT_USER_ID 均为 user-1001）；「星野」是 match-success / matching
 * 页 dev-preview 的对方（partner）人设，非本入口的用户人设。
 */

import {
  hasDevUserFlag,
  hasDevUserFromLaunch,
  useSessionStore,
} from "../stores/session";

/** dev-user 演示入口 query key（与 stores/session.ts 中常量保持一致） */
const DEV_USER_QUERY_KEY = "dev-user";
/** dev-user 演示入口触发值 */
const DEV_USER_QUERY_VALUE = "1";

/**
 * 判断 URL query string 是否携带 dev-user=1。
 *
 * 手写解析（不依赖 mp-weixin 可能缺失的 URLSearchParams），
 * 与 utils/navigation.ts openAppPath 的 query 解析方式保持一致。
 *
 * @param url 目标页面 URL（可携带 query string）
 * @returns true 表示 URL 携带 dev-user=1
 */
function urlHasDevUser(url: string): boolean {
  const queryIndex = url.indexOf("?");
  if (queryIndex < 0) return false;
  const queryStr = url.slice(queryIndex + 1);
  return queryStr.split("&").some((pair) => {
    const eqIdx = pair.indexOf("=");
    if (eqIdx <= 0) return false;
    const key = pair.slice(0, eqIdx);
    let value = pair.slice(eqIdx + 1);
    try {
      value = decodeURIComponent(value);
    } catch (_e) {
      // 非法转义时按原始串比较，不阻断解析
    }
    return key === DEV_USER_QUERY_KEY && value === DEV_USER_QUERY_VALUE;
  });
}

/**
 * 注入 dev 会话（幂等：已登录时跳过）。
 *
 * pinia 未就绪 / store 异常时静默（dev-user 是增强能力，不阻塞主流程）。
 */
function applyDevUserIfNeeded(): void {
  try {
    const sessionStore = useSessionStore();
    if (!sessionStore.isLoggedIn) {
      sessionStore.enterDevUserDemo();
    }
  } catch (_e) {
    // 忽略：不影响正常流程
  }
}

/**
 * 冷启动路径：启动参数携带 dev-user=1 时注入 mock 会话。
 *
 * 由 App.vue onLaunch 在 sessionStore.bootstrap() 之前调用；
 * bootstrap 内部感知 devUserRequested 后不会再覆盖已注入的会话。
 */
export function applyDevUserFromLaunch(): void {
  if (hasDevUserFromLaunch()) {
    applyDevUserIfNeeded();
  }
}

/**
 * 页面级兜底：页面 onLoad query 携带 dev-user=1 时注入 mock 会话。
 *
 * 由关键验收页（chat-session / messages 等）在 onLoad 顶部调用，
 * 覆盖自动化脚本通过 wx.* 直调绕过 uni 导航拦截器的场景。
 *
 * @param query 页面 onLoad options（可为 undefined / null）
 */
export function applyDevUserFromQuery(query?: Record<string, unknown> | null): void {
  if (hasDevUserFlag(query)) {
    applyDevUserIfNeeded();
  }
}

/** 需要拦截的导航 API（uni.addInterceptor 支持） */
type NavigateApiName = "navigateTo" | "redirectTo" | "reLaunch" | "switchTab";

/** 全局拦截器是否已注册（幂等，避免 HMR / 多次调用重复注册） */
let interceptorRegistered = false;

/**
 * 注册全局导航拦截器：任何页面通过 uni 导航 API 跳转到携带 dev-user=1 的
 * URL 时，在跳转前注入 mock 会话。
 *
 * 由 App.vue onLaunch 调用一次（应用生命周期内仅注册一次）。
 */
export function registerDevUserEntry(): void {
  if (interceptorRegistered) return;
  interceptorRegistered = true;

  const apiNames: NavigateApiName[] = ["navigateTo", "redirectTo", "reLaunch", "switchTab"];
  apiNames.forEach((apiName) => {
    try {
      uni.addInterceptor(apiName, {
        invoke(args: { url?: string }) {
          if (args && typeof args.url === "string" && urlHasDevUser(args.url)) {
            applyDevUserIfNeeded();
          }
        },
      });
    } catch (_e) {
      // 单个拦截器注册失败不影响其他入口（冷启动 dev-user 由 bootstrap 覆盖）
    }
  });
}
