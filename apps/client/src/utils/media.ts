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
// infra R2-00131: 统一图片选择封装复用隐私授权守卫（chooseImages）
import { ensurePrivacyAuthorized } from "./privacy";

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
  // ⚠️ 安全警告（已知风险）：把 JWT 拼入图片 URL 的 query 参数，token 会暴露在：
  // 1. 浏览器 Referer 头（图片请求会携带 Referer 给图片服务器/CDN）；
  // 2. 代理/CDN 访问日志与浏览器历史记录；
  // 3. 小程序网络面板（开发者工具可查）。
  // 因此生产环境不应依赖此方案长期运行。替代方案（推荐）：
  // - 使用 Authorization 头无法覆盖 <image> 标签请求，故可改为
  //   后端签发短期有效（如 5 分钟）的一次性签名 URL（如 OSS 签名）；
  // - 或由后端在登录后返回已带签名的图片 URL，前端不做拼接。
  // 此处保留拼接能力仅为满足现有鉴权代理端点（/media/proxy/*）的契约。
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

/* ========== 统一图片选择封装（infra R2-00131） ========== */

/**
 * 图片选择参数。
 */
export interface ChooseImagesOptions {
  /** 可选图片数量上限（默认 9，与发帖九宫格上限一致） */
  count?: number;
  /** 单张图片大小上限（MB），超限图片自动剔除（默认 10MB） */
  maxSizeMB?: number;
  /** 是否先检查微信隐私协议（默认 true，仅 mp-weixin 生效） */
  checkPrivacy?: boolean;
}

/**
 * 统一图片选择封装。
 *
 * infra R2-00131: 此前 pages/profile/album.vue、pages/campus/certification.vue 等
 * 各自内联 chooseImage + 隐私授权样板，行为不一致且难维护。本函数统一处理：
 * 1. 隐私协议预检查（ensurePrivacyAuthorized，未同意时 reject）
 * 2. 数量上限（count）
 * 3. 单张大小校验（maxSizeMB，超限图片剔除）
 *
 * @param options 选择参数
 * @returns 选中图片的本地临时路径列表；用户主动取消时返回空数组
 */
export async function chooseImages(
  options: ChooseImagesOptions = {}
): Promise<string[]> {
  const { count = 9, maxSizeMB = 10, checkPrivacy = true } = options;

  if (checkPrivacy) {
    await ensurePrivacyAuthorized();
  }

  const paths = await new Promise<string[]>((resolve, reject) => {
    uni.chooseImage({
      count,
      success: (res) => {
        // infra R2-00131: uni 类型定义中 tempFilePaths 为 string | string[]，
        // 统一规整为数组后返回
        const raw = res.tempFilePaths;
        const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
        resolve(list);
      },
      fail: (err) => {
        // 用户主动取消：视为空选择而非错误，避免调用方误报失败
        if (typeof err?.errMsg === "string" && err.errMsg.includes("cancel")) {
          resolve([]);
        } else {
          reject(err);
        }
      },
    });
  });

  // 大小校验：剔除超过 maxSizeMB 的图片（uni.getFileInfo 失败时保守保留）
  if (maxSizeMB <= 0 || paths.length === 0) {
    return paths;
  }
  const maxBytes = maxSizeMB * 1024 * 1024;
  const kept: string[] = [];
  for (const p of paths) {
    const size = await getFileSizeBytes(p);
    if (size === null || size <= maxBytes) {
      kept.push(p);
    }
  }
  return kept;
}

/**
 * 获取本地临时文件大小（字节）。
 *
 * @param path 本地临时文件路径
 * @returns 文件大小（字节）；获取失败返回 null（调用方保守处理）
 */
async function getFileSizeBytes(path: string): Promise<number | null> {
  try {
    const info = await new Promise<{ size?: number }>((resolve, reject) => {
      uni.getFileInfo({
        filePath: path,
        success: resolve,
        fail: reject,
      });
    });
    return typeof info?.size === "number" ? info.size : null;
  } catch (_e) {
    return null;
  }
}
