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
 * 打开应用内页面（push 语义）。
 *
 * - TabBar 页面：调用 `uni.switchTab`（不能携带 query string）
 * - 非 TabBar 页面：调用 `uni.navigateTo`，保留当前页在页面栈中
 *
 * @param url - 目标页面 URL，可携带 query string（仅非 TabBar 页面有效）
 */
export function openAppPath(url: string) {
  const normalizedUrl = normalizeUrl(url);

  if (isTabPath(normalizedUrl)) {
    uni.switchTab({ url: normalizedUrl });
    return;
  }

  uni.navigateTo({ url: normalizedUrl });
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
