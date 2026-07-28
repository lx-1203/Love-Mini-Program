import { appTabs } from "../config/navigation";

/**
 * TabBar 页面导航参数缓存。
 *
 * uni.switchTab 不能携带 query 参数，在跳转 tabbar 页面需要传参时，
 * 先将参数存入此缓存，目标页面在 onShow/onLoad 中消费并清空。
 *
 * 键为 TabBar 页面路径（如 "/pages/profile/index"），值为解析后的参数字典。
 */
const tabQueryCache: Record<string, Record<string, string>> = {};

/**
 * 获取并消费 TabBar 页面导航参数缓存。
 *
 * 目标页面应在 onShow/onLoad 中调用此函数，获取跳转时传递的参数。
 * 消费后缓存即被删除，避免污染后续的普通 switchTab 切换。
 *
 * @param pagePath - TabBar 页面路径（如 "/pages/profile/index"）
 * @returns 参数字典，无参数时返回空对象
 */
export function consumeTabQueryCache(pagePath: string): Record<string, string> {
  const cached = tabQueryCache[pagePath] ?? {};
  delete tabQueryCache[pagePath];
  return cached;
}

/**
 * 解析 URL query string 为键值对。
 *
 * @param url - 完整 URL（如 "/pages/profile/index?userId=123&foo=bar"）
 * @returns 参数字典
 */
function parseQueryParams(url: string): Record<string, string> {
  const idx = url.indexOf("?");
  if (idx === -1) return {};
  const search = url.slice(idx + 1);
  const params: Record<string, string> = {};
  for (const part of search.split("&")) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) {
      params[decodeURIComponent(part)] = "";
    } else {
      const key = decodeURIComponent(part.slice(0, eqIdx));
      const val = decodeURIComponent(part.slice(eqIdx + 1));
      params[key] = val;
    }
  }
  return params;
}

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
 * 提取 URL 的路径部分（去掉 query string）。
 *
 * @param url - 完整 URL（如 "/pages/profile/index?userId=123"）
 * @returns 纯路径（如 "/pages/profile/index"）
 */
function getPath(url: string): string {
  const idx = url.indexOf("?");
  return idx === -1 ? url : url.slice(0, idx);
}

/**
 * 判断给定 URL 是否为 TabBar 页面路径。
 *
 * 与 `src/config/navigation.ts` 中的 appTabs 配置对齐，
 * 用于决定跳转时使用 switchTab 还是 navigateTo / redirectTo。
 *
 * @param url - 待检测的 URL（可含 query string）
 * @returns true 表示该路径为 TabBar 页面
 */
export function isTabPath(url: string) {
  const normalizedUrl = normalizeUrl(url);
  const path = getPath(normalizedUrl);
  return appTabs.some((tab) => tab.path === path);
}

/**
 * 打开应用内页面（push 语义）。
 *
 * - TabBar 页面：调用 `uni.switchTab`（无法携带 query string，参数通过 tabQueryCache 传递）
 * - 非 TabBar 页面：调用 `uni.navigateTo`，保留当前页在页面栈中
 *
 * @param url - 目标页面 URL，可携带 query string
 */
export function openAppPath(url: string) {
  const normalizedUrl = normalizeUrl(url);
  const path = getPath(normalizedUrl);

  if (isTabPath(path)) {
    // TabBar 页面：如有 query 参数则缓存，再用 switchTab 导航
    const params = parseQueryParams(normalizedUrl);
    if (Object.keys(params).length > 0) {
      tabQueryCache[path] = params;
    }
    uni.switchTab({ url: path });
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
  const path = getPath(normalizedUrl);

  if (isTabPath(path)) {
    const params = parseQueryParams(normalizedUrl);
    if (Object.keys(params).length > 0) {
      tabQueryCache[path] = params;
    }
    uni.switchTab({ url: path });
    return;
  }

  uni.redirectTo({ url: normalizedUrl });
}
