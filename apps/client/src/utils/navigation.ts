import { appTabs } from "../config/navigation";

/**
 * 规范化 URL：确保以 `/` 开头。
 *
 * uni-app 的 switchTab / navigateTo / redirectTo 要求 url 以 `/` 开头，
 * 此函数统一补齐前导斜杠，避免调用方手动处理。
 *
 * @param url - 原始 URL（可能带或不带前导 `/`）
 * @returns 以 `/` 开头的规范化 URL
 */
function normalizeUrl(url: string) {
  return url.startsWith("/") ? url : `/${url}`;
}

/**
 * 判断给定 URL 是否为 TabBar 页面路径。
 *
 * 与 `src/config/navigation.ts` 中的 appTabs 配置对齐，
 * 用于决定跳转时使用 switchTab 还是 navigateTo / redirectTo。
 *
 * @param url - 待检测的 URL
 * @returns true 表示该路径为 TabBar 页面
 */
export function isTabPath(url: string) {
  const normalizedUrl = normalizeUrl(url);
  return appTabs.some((tab) => tab.path === normalizedUrl);
}

/**
 * 页面跳转选项（infra R2-00132）。
 */
export interface OpenPathOptions {
  /** 跳转失败回调（如目标页面不存在 / 被路由拦截时触发） */
  fail?: (err?: unknown) => void;
}

/**
 * 打开应用内页面（push 语义）。
 *
 * - TabBar 页面：调用 `uni.switchTab`（不能携带 query string）。
 *   若 URL 带 query，P1-04 修复：将 query 写入 pending-tab-query storage 桥接
 *   （JSON 存 {path, query}）后再 switchTab，目标 Tab 页在 onShow 中经
 *   consumePendingTabQuery 读取消费，避免 query 被静默丢弃。
 * - 非 TabBar 页面：调用 `uni.navigateTo`，保留当前页在页面栈中
 *
 * infra R2-00132: 增加可选 fail 回调，调用方可感知跳转失败（页面不存在/被拦截等），
 * 统一由本封装处理 tab/普通页判断，避免调用点散落 switchTab/navigateTo 分支。
 *
 * @param url - 目标页面 URL，可携带 query string（TabBar 页面的 query 走 storage 桥接）
 * @param options - 跳转选项（fail 回调等）
 */
export function openAppPath(url: string, options: OpenPathOptions = {}) {
  const normalizedUrl = normalizeUrl(url);

  if (isTabPath(normalizedUrl)) {
    // P1-04：tab 页带 query 时先写入 storage 桥接，再 switchTab
    // （uni.switchTab 不支持 query，直接调用会报 "can not navigateTo a tabbar page" 或静默丢弃）
    const queryIndex = normalizedUrl.indexOf("?");
    if (queryIndex >= 0) {
      const path = normalizedUrl.slice(0, queryIndex);
      const queryStr = normalizedUrl.slice(queryIndex + 1);
      const query: Record<string, string> = {};
      // 手动解析 query string（避免依赖 mp-weixin 可能缺失的 URLSearchParams）
      try {
        if (queryStr) {
          queryStr.split("&").forEach((pair) => {
            const eqIdx = pair.indexOf("=");
            if (eqIdx > 0) {
              const key = pair.slice(0, eqIdx);
              const value = pair.slice(eqIdx + 1);
              if (key) {
                query[key] = decodeURIComponent(value);
              }
            }
          });
        }
      } catch (_e) {
        // query 解析失败（如非法转义）时视为无 query，按普通 tab 切换处理
      }
      storePendingTabQuery(path, query);
      uni.switchTab({ url: path, fail: options.fail });
      return;
    }
    uni.switchTab({ url: normalizedUrl, fail: options.fail });
    return;
  }

  uni.navigateTo({ url: normalizedUrl, fail: options.fail });
}

/**
 * TabBar 页面带参跳转的 storage 桥接 key（P1-04）。
 *
 * 存 JSON {path, query}：path 用于目标页面匹配自身路径，避免跨 Tab 误消费；
 * query 为解析后的参数对象。
 * R4-00231：openAppPath 与 switchTabWithQuery 统一走本桥接（原 TAB_QUERY_KEY
 * 无 path 匹配，消费方可能读错键），TAB_QUERY_KEY 保留为兼容导出指向同一键。
 */
export const PENDING_TAB_QUERY_KEY = "campus-love:pending-tab-query";

/** 写入待消费的 Tab 页 query（openAppPath 内部使用） */
export function storePendingTabQuery(path: string, query: Record<string, string>): void {
  try {
    uni.setStorageSync(PENDING_TAB_QUERY_KEY, { path, query });
  } catch (_e) {
    // 存储失败时静默（query 丢失但不影响页面切换）
  }
}

/**
 * 消费匹配指定路径的 Tab 页 query（P1-04）。
 *
 * 目标 Tab 页在 onShow/onLoad 中调用：仅当存储的 path 与当前页面路径一致时
 * 读取并清除 query（即读即清，防止残留被下次冷启动误消费）。
 *
 * @param path - 当前页面路径（如 "/pages/profile/index"）
 * @returns 匹配的 query 对象；不匹配或不存在时返回空对象
 */
export function consumePendingTabQuery(path: string): Record<string, string> {
  try {
    const raw = uni.getStorageSync(PENDING_TAB_QUERY_KEY) as
      | { path?: string; query?: Record<string, string> }
      | undefined;
    if (
      raw &&
      !Array.isArray(raw) &&
      typeof raw === "object" &&
      typeof raw.path === "string" &&
      raw.path === path &&
      raw.query &&
      typeof raw.query === "object" &&
      !Array.isArray(raw.query)
    ) {
      uni.removeStorageSync(PENDING_TAB_QUERY_KEY);
      return raw.query;
    }
  } catch (_e) {
    // 读取失败视为无 query
  }
  return {};
}

/** TabBar 页面 query 暂存 key（switchTab 不支持 query，用本地存储桥接）。
 * R4-00231：与 PENDING_TAB_QUERY_KEY 合并为单一桥接实现，本导出保留兼容
 * （值与 PENDING_TAB_QUERY_KEY 相同），新代码请使用 PENDING_TAB_QUERY_KEY。 */
// infra R2-00132: 导出供页面（village/index 等）统一引用，
// 避免 storage 桥接键字符串在多个文件间散落（原审计项：桥接键无常量）。
export const TAB_QUERY_KEY = PENDING_TAB_QUERY_KEY;

/**
 * 切换 TabBar 页面并携带 query（收尾轮修复：switchTab 不支持 query string，
 * 原 `openAppPath('/pages/village/index?tab=hot')` 的 query 会被静默丢弃）。
 *
 * R4-00231：统一走 PENDING_TAB_QUERY_KEY 桥接（带 path 匹配，防止跨 Tab 误消费）。
 *
 * 用法：源页面调用 `switchTabWithQuery('/pages/village/index', { tab: 'hot' })`；
 * 目标页面在 onLoad/onShow 中调用 `consumeTabQuery()` 读取并消费。
 */
export function switchTabWithQuery(url: string, query: Record<string, string>): void {
  const normalizedUrl = normalizeUrl(url);
  storePendingTabQuery(normalizedUrl, query);
  uni.switchTab({
    url: normalizedUrl,
    fail: () => {
      // 收尾轮 review 修复：切换失败时清理桥接 query（仅当存的是本次目标路径），
      // 避免残留被下次误消费
      try {
        const raw = uni.getStorageSync(PENDING_TAB_QUERY_KEY) as
          | { path?: string }
          | undefined;
        if (raw && typeof raw === "object" && raw.path === normalizedUrl) {
          uni.removeStorageSync(PENDING_TAB_QUERY_KEY);
        }
      } catch (_e) {
        // 清理失败静默
      }
    },
  });
}

/** 读取并消费 TabBar query（目标页面调用一次；R4-00231：按当前页面路径匹配） */
export function consumeTabQuery(): Record<string, string> {
  const pages = getCurrentPages();
  const current = pages[pages.length - 1];
  const route = (current as { route?: string } | undefined)?.route ?? "";
  const path = route.startsWith("/") ? route : `/${route}`;
  return consumePendingTabQuery(path);
}

/**
 * 替换当前页面（replace 语义）。
 *
 * - TabBar 页面：调用 `uni.switchTab`（TabBar 页面不能被替换，只能切换）
 * - 非 TabBar 页面：调用 `uni.redirectTo`，关闭当前页并打开新页面（不增加栈深度）
 *
 * 适用于登录后跳转主页、表单提交成功后跳转详情等不希望用户返回上一页的场景。
 *
 * @param url - 目标页面 URL，可携带 query string（仅非 TabBar 页面有效）
 */
export function replaceAppPath(url: string) {
  const normalizedUrl = normalizeUrl(url);

  if (isTabPath(normalizedUrl)) {
    uni.switchTab({ url: normalizedUrl });
    return;
  }

  uni.redirectTo({ url: normalizedUrl });
}
