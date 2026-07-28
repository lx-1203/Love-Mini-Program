/**
 * Task 0.3.4：媒体鉴权代理 URL 解析工具。
 *
 * <p>背景：上传目录鉴权改造后，所有上传文件的访问路径不再走 {@code /uploads/**}
 * 静态资源映射（已被 SecurityConfig denyAll）。改为通过
 * {@link ../services/http} 中配置的 API 基地址 + 鉴权代理端点
 * {@code /api/v1/media/{userId}/{yyyyMM}/{uuid}.{ext}} 访问。</p>
 *
 * <p>由于微信小程序 {@code <image src>} 标签无法携带 HTTP Header，
 * 鉴权代理端点支持 {@code ?token=xxx} 查询参数模式（详见后端
 * {@code MediaAccessController} 与 {@code JwtAuthenticationFilter}）。</p>
 *
 * <p>{@code resolveMediaUrl(rawPath)} 是客户端所有图片 URL 的统一出口：
 * <ul>
 *   <li>用户上传的媒体路径（{@code /uploads/...}）→ 重写为鉴权代理 URL，附加 token</li>
 *   <li>静态资源（{@code /static/...}）→ 原样返回（无需鉴权）</li>
 *   <li>绝对 URL（{@code http://} / {@code https://}）→ 原样返回</li>
 *   <li>data URI（{@code data:...}）→ 原样返回</li>
 *   <li>空值 → 返回空字符串</li>
 * </ul>
 * </p>
 *
 * <p>使用方式：
 * <pre>{@code
 *   <image :src="resolveMediaUrl(user.avatarUrl)" />
 *   <SafeImage :src="resolveMediaUrl(post.images[0])" />
 * }</pre>
 *
 * <p>mp-weixin 兼容性：
 * <ul>
 *   <li>不使用 {@code import.meta.env.DEV}（mp-weixin 不支持，详见 project_memory）</li>
 *   <li>不使用 {@code URL} 全局对象（部分 mp-weixin 版本不支持），手动拼接查询参数</li>
 *   <li>token 通过 {@link ../services/http} 的 {@code getToken()} 读取，避免循环依赖
 *       （http.ts 已封装 STORAGE_KEYS.AUTH_TOKEN 的读写）</li>
 * </ul>
 * </p>
 */

import { appEnv } from "../services/env";
import { getToken } from "../services/http";

/**
 * 上传文件存储路径前缀。
 *
 * <p>与后端 {@code LocalMediaStorageService.URL_PREFIX} 保持一致，
 * 用于识别需要重写为鉴权代理 URL 的路径。</p>
 */
const UPLOADS_PREFIX = "/uploads/";

/**
 * 鉴权代理端点路径前缀。
 *
 * <p>对应后端 {@code MediaAccessController} 的 {@code @RequestMapping("/api/v1/media")}。
 * 客户端拼接完整 URL 时使用 {@code appEnv.apiBaseUrl + MEDIA_PROXY_PREFIX + userId/...}。</p>
 */
const MEDIA_PROXY_PREFIX = "/api/v1/media/";

/**
 * 查询参数 token 的参数名。
 *
 * <p>与后端 {@code JwtAuthenticationFilter.TOKEN_QUERY_PARAM} 保持一致。
 * 用于在 {@code <image src>} 直接请求鉴权代理端点时携带 JWT。</p>
 */
const TOKEN_QUERY_PARAM = "token";

/**
 * 解析媒体 URL：将上传路径重写为鉴权代理 URL，附加当前 JWT。
 *
 * <p>处理规则：
 * <ol>
 *   <li>{@code rawPath} 为空/null/非字符串 → 返回空字符串</li>
 *   <li>已经是鉴权代理 URL（含 {@code /api/v1/media/}）→ 仅补全 token（避免重复重写）</li>
 *   <li>以 {@code /uploads/} 开头 → 重写为 {@code {apiBaseUrl}/api/v1/media/{userId}/{path}?token=xxx}</li>
 *   <li>以 {@code http://} / {@code https://} / {@code data:} / {@code blob:} 开头 → 原样返回</li>
 *   <li>以 {@code /static/} / {@code /} 开头但不含 {@code /uploads/} → 原样返回（静态资源）</li>
 * </ol>
 * </p>
 *
 * @param rawPath 原始路径（可能是 {@code /uploads/100/202607/uuid.jpg}、绝对 URL、静态资源路径等）
 * @returns 解析后的图片 URL，可直接用于 {@code <image src>}
 */
export function resolveMediaUrl(rawPath: string | null | undefined): string {
  // 空值守卫：null / undefined / 空字符串 / 纯空白 → 返回空字符串
  if (rawPath === null || rawPath === undefined) {
    return "";
  }
  if (typeof rawPath !== "string") {
    return "";
  }
  const path = rawPath.trim();
  if (path.length === 0) {
    return "";
  }

  // 绝对 URL / data URI / blob URL → 原样返回（无需鉴权）
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("data:") ||
    path.startsWith("blob:") ||
    path.startsWith("wxfile://")
  ) {
    return path;
  }

  // 已经是鉴权代理 URL → 仅补全 token（防止父组件重复 resolve 时双重重写）
  if (path.includes("/api/v1/media/")) {
    return appendTokenIfMissing(path);
  }

  // 上传文件路径 /uploads/{userId}/{yyyyMM}/{uuid}.{ext} → 重写为鉴权代理 URL
  if (path.startsWith(UPLOADS_PREFIX)) {
    // 提取 {userId}/{yyyyMM}/{uuid}.{ext} 部分
    const suffix = path.substring(UPLOADS_PREFIX.length);
    if (suffix.length === 0) {
      return "";
    }
    const proxyUrl = `${appEnv.apiBaseUrl}${MEDIA_PROXY_PREFIX}${suffix}`;
    return appendTokenIfMissing(proxyUrl);
  }

  // 其他相对路径（如 /static/assets/...）→ 原样返回，由 uni-app 解析为本地资源
  return path;
}

/**
 * 为鉴权代理 URL 附加 token 查询参数。
 *
 * <p>如果 URL 已包含 {@code ?token=} 参数，则不重复附加；
 * 否则在 URL 末尾追加 {@code ?token=xxx} 或 {@code &token=xxx}。</p>
 *
 * <p>token 来源：{@link ../services/http.getToken}，与 {@code Authorization} 头使用同一
 * JWT。token 不存在时返回原 URL（鉴权代理端点会返回 403，由 SafeImage 触发 fallback）。</p>
 *
 * @param url 已构造的鉴权代理 URL（可能含其他查询参数）
 * @returns 附加 token 后的 URL；token 缺失时返回原 URL
 */
function appendTokenIfMissing(url: string): string {
  // 已含 token 参数，不重复附加（避免双查询参数）
  if (url.includes(`?${TOKEN_QUERY_PARAM}=`) || url.includes(`&${TOKEN_QUERY_PARAM}=`)) {
    return url;
  }
  const token = getToken();
  if (!token) {
    // 未登录或 token 已过期：返回原 URL，由后端 401/403 触发 SafeImage fallback
    return url;
  }
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${TOKEN_QUERY_PARAM}=${encodeURIComponent(token)}`;
}

/**
 * 批量解析媒体 URL（便利方法）。
 *
 * <p>对数组中每个元素调用 {@link resolveMediaUrl}，过滤掉空结果。
 * 用于帖子图片列表、相册等场景。</p>
 *
 * @param paths 原始路径数组
 * @returns 解析后的 URL 数组（不含空值）
 */
export function resolveMediaUrls(paths: Array<string | null | undefined> | null | undefined): string[] {
  if (!paths || !Array.isArray(paths)) {
    return [];
  }
  const result: string[] = [];
  for (const p of paths) {
    const resolved = resolveMediaUrl(p);
    if (resolved.length > 0) {
      result.push(resolved);
    }
  }
  return result;
}
