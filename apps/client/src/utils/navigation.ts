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
 * - TabBar 页面：调用 `uni.switchTab`（不能携带 query string）
 * - 非 TabBar 页面：调用 `uni.navigateTo`，保留当前页在页面栈中
 *
 * infra R2-00132: 增加可选 fail 回调，调用方可感知跳转失败（页面不存在/被拦截等），
 * 统一由本封装处理 tab/普通页判断，避免调用点散落 switchTab/navigateTo 分支。
 *
 * @param url - 目标页面 URL，可携带 query string（仅非 TabBar 页面有效）
 * @param options - 跳转选项（fail 回调等）
 */
export function openAppPath(url: string, options: OpenPathOptions = {}) {
  const normalizedUrl = normalizeUrl(url);

  if (isTabPath(normalizedUrl)) {
    uni.switchTab({ url: normalizedUrl, fail: options.fail });
    return;
  }

  uni.navigateTo({ url: normalizedUrl, fail: options.fail });
}

/** TabBar 页面 query 暂存 key（switchTab 不支持 query，用本地存储桥接） */
// infra R2-00132: 导出供页面（village/index 等）统一引用，
// 避免 storage 桥接键字符串在多个文件间散落（原审计项：桥接键无常量）。
export const TAB_QUERY_KEY = "campus-love:tab-query";

/**
 * 切换 TabBar 页面并携带 query（收尾轮修复：switchTab 不支持 query string，
 * 原 `openAppPath('/pages/village/index?tab=hot')` 的 query 会被静默丢弃）。
 *
 * 用法：源页面调用 `switchTabWithQuery('/pages/village/index', { tab: 'hot' })`；
 * 目标页面在 onLoad/onShow 中调用 `consumeTabQuery()` 读取并消费。
 */
export function switchTabWithQuery(url: string, query: Record<string, string>): void {
  const normalizedUrl = normalizeUrl(url);
  try {
    uni.setStorageSync(TAB_QUERY_KEY, query);
  } catch (_e) {
    // 存储失败时静默（query 丢失但不影响页面切换）
  }
  uni.switchTab({
    url: normalizedUrl,
    fail: () => {
      // 收尾轮 review 修复：切换失败时清理桥接 query，避免残留被下次误消费
      try {
        uni.removeStorageSync(TAB_QUERY_KEY);
      } catch (_e) {
        // 清理失败静默
      }
    },
  });
}

/** 读取并消费 TabBar query（目标页面调用一次） */
export function consumeTabQuery(): Record<string, string> {
  try {
    const raw = uni.getStorageSync(TAB_QUERY_KEY) as Record<string, string> | undefined;
    // security review：typeof 校验需排除数组（typeof [] === "object"）
    if (raw && !Array.isArray(raw) && typeof raw === "object") {
      uni.removeStorageSync(TAB_QUERY_KEY);
      return raw;
    }
  } catch (_e) {
    // 读取失败视为无 query
  }
  return {};
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
