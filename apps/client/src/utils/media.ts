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
 *   <li>静态资源（{@code /static/...}）→ 由 {@code apps/client/config/cdn-buckets.json} 分桶：
 *       <b>real 档</b>命中 {@code cdnPrefixes} 的目录（generated/、assets/images/{covers,posters,
 *       avatars,people,posts}/）不随主包发布，运行时解析成后端公开端点
 *       {@code ${apiRoot}/api/v1/media/app-assets/{去掉 static/ 前缀的 rel}}；命中 {@code localPrefixes}
 *       （assets/icons/、assets/svg-spec/）与未登记的目录留包内、原样返回。
 *       <b>mock / dev / showcase / H5 档</b>一律留包内（这些档由 {@code prepare-static --dev/--h5}
 *       还原完整 static 树，本地路径本来就是通的，且设计上不依赖后端）</li>
 *   <li>绝对 URL（{@code http://} / {@code https://}）→ 原样返回；例外：{@code http} 形态的
 *       app-assets URL 在非 real 档、以及 real 档的 {@code localPrefixes} rel，仍落回
 *       {@code /static/{rel}}（包内那份才是这些档的唯一来源）</li>
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
 *   <li>凭据不再由本文件读取：P0-2 起媒体 URL 用 {@code POST /api/v1/media/sign}
 *       签发的能力型签名（见 {@link ./media-sign-cache}），本文件不接触任何令牌，
 *       也就不会重建 http &lt;-&gt; media 那条循环依赖</li>
 * </ul>
 * </p>
 */

// 修复（R4-00205）：环境配置统一入口
import { clientEnv } from "../config/env";
import { mediaSignVersion, signedMediaUrl } from "./media-sign-cache";
// infra R2-00131: 统一图片选择封装复用隐私授权守卫（chooseImages）
import { ensurePrivacyAuthorized } from "./privacy";
// 2026-08-16：pexels 外链本地化兜底（mp 端无法加载外链图，见 image-local.ts），
// 与 SafeImage 的 toLocalImage(resolveMediaUrl(raw)) 语义一致
import { toLocalImage, toLocalMockMedia } from "./image-local";
// R6/L01（2026-10-19）：资产分桶单一真源。运行时（本文件与 config/images.ts）与构建期
// （scripts/prepare-static.mjs、scripts/prune-unreferenced-static.mjs）读同一份 JSON，
// 避免「运行时指后端、构建期把文件剪出包」这类两侧判据不重叠导致的空白图。
import cdnBuckets from "../../config/cdn-buckets.json";

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
 * 客户端拼接完整 URL 时使用 {@code clientEnv.apiBaseUrl + MEDIA_PROXY_PREFIX + userId/...}。</p>
 */
const MEDIA_PROXY_PREFIX = "/api/v1/media/";

/**
 * 2026-08-10 包体积优化：应用资产公开端点前缀。
 *
 * <p>对应后端 {@code MediaAccessController} 的 {@code GET /api/v1/media/app-assets/{relpath}}
 * （免登录、免 token，静态装饰图经种子脚本入库，后台可审核下线）。</p>
 */
const APP_ASSET_PREFIX = "/api/v1/media/app-assets/";

/* ========== R6/L01：资产分桶单一真源（config/cdn-buckets.json） ========== */

/** 包内路径前缀（运行时形态，带前导斜杠） */
const PKG_PATH_PREFIX = "/static/";
/** 桶键前缀（清单形态，无前导斜杠：`static/assets/icons/`） */
const PKG_KEY_PREFIX = "static/";

/**
 * 取清单里的某一桶前缀列表。
 *
 * 清单是外部 JSON（L02 车道的构建期也读它），字段缺失/类型漂移时退回空数组，
 * 空数组 = 什么都不改写 = 全部留包内（保守方向，绝不会把图指到 404）。
 *
 * 结果按 kind 缓存：resolveMediaUrl 是每张图每次渲染都会走的热路径
 * （PostCard 九宫格 N×M 次），清单本身是构建期常量，没必要每次重新过滤数组。
 */
const bucketCache = new Map<string, string[]>();
function bucketPrefixes(kind: "cdnPrefixes" | "localPrefixes"): string[] {
  const cached = bucketCache.get(kind);
  if (cached) {
    return cached;
  }
  const raw = (cdnBuckets as unknown as Record<string, unknown>)[kind];
  const list = Array.isArray(raw)
    ? raw.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];
  bucketCache.set(kind, list);
  return list;
}

/** 任意包内形态（`/static/x` 或 `static/x`）归一化为清单使用的 `static/x` 键 */
function toBucketKey(pkgPath: string): string {
  return pkgPath.startsWith("/") ? pkgPath.slice(1) : pkgPath;
}

/** 桶键（`static/...`）是否命中给定前缀集合 */
function matchesBucket(key: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => key.startsWith(prefix));
}

/**
 * 该包内路径是否属于「real 档不随主包发布、改走后端 app-assets」的桶。
 *
 * localPrefixes 先判：与 cdnPrefixes 正常不重叠，但万一清单被写出重叠项，
 * 包内一定有的那份（icons / svg-spec）优先本地，避免无谓依赖后端。
 */
function isCdnPackageKey(key: string): boolean {
  if (matchesBucket(key, bucketPrefixes("localPrefixes"))) {
    return false;
  }
  return matchesBucket(key, bucketPrefixes("cdnPrefixes"));
}

/** 是否 real 档（惰性读 clientEnv：部分单测只 mock 了 config/env 的部分导出） */
function isRealApiMode(): boolean {
  return clientEnv?.apiMode === "real";
}

/**
 * 后端公开端点基址（含结尾斜杠），取法与 config/images.ts 的 real 基址一致：
 * `apiBaseUrl` 去掉可能的 `/api` 尾 + `/api/v1/media/app-assets/`。
 * 取不到基址时返回空串，调用方退回包内路径。
 */
function appAssetsBaseUrl(): string {
  const apiBaseUrl = clientEnv?.apiBaseUrl || "";
  if (!apiBaseUrl) {
    return "";
  }
  return `${apiBaseUrl.replace(/\/api\/?$/, "")}${APP_ASSET_PREFIX}`;
}

/**
 * real 档 + 命中 cdn 桶 → 后端 app-assets 绝对 URL；其余情况原样返回。
 *
 * 幂等：入参不是 `/static/` 形态、非 real 档、未命中桶、取不到 apiRoot 时均为 no-op，
 * 因此 resolveMediaUrl 的输出可以再喂给自身而不改变结果。
 */
function cdnize(pkgPath: string): string {
  if (!pkgPath.startsWith(PKG_PATH_PREFIX)) {
    return pkgPath;
  }
  if (!isRealApiMode() || !isCdnPackageKey(toBucketKey(pkgPath))) {
    return pkgPath;
  }
  const base = appAssetsBaseUrl();
  if (!base) {
    return pkgPath;
  }
  return `${base}${toBucketKey(pkgPath).slice(PKG_KEY_PREFIX.length)}`;
}

/** 从任意含 app-assets 前缀的字符串里取 rel（去掉查询串）；取不到返回空串 */
function extractAppAssetRel(value: string): string {
  const idx = value.indexOf(APP_ASSET_PREFIX);
  if (idx < 0) {
    return "";
  }
  const rel = value.substring(idx + APP_ASSET_PREFIX.length).split("?")[0] ?? "";
  // 反斜杠与多余前导斜杠容错：库里/历史常量偶见 `assets\images\...` 或 `/assets/...`
  return rel.replace(/\\/g, "/").replace(/^\/+/, "");
}

/** rel → 包内路径（`/static/{rel}`） */
function relToPackagePath(rel: string): string {
  return `/${PKG_KEY_PREFIX}${rel}`;
}

/** rel（不带 static/ 前缀）是否属于 cdn 桶 */
function isCdnRel(rel: string): boolean {
  return rel.length > 0 && isCdnPackageKey(`${PKG_KEY_PREFIX}${rel}`);
}

/**
 * 判断路径是否为「已上传到服务器」的远程媒体 URL。
 *
 * <p>MP-R7-REALNAME-001（2026-09-15）：本地临时路径在 DevTools 模拟器中形如
 * {@code http://tmp/xxx}（真机为 {@code wxfile://tmp/xxx}、iOS 模拟器 {@code http://usr/xxx}），
 * 同样以 {@code http://} 开头。此前各上传点用 {@code /^https?:\/\//} 区分「服务器 URL vs 本地临时路径」，
 * 会把模拟器临时路径误判为已上传而跳过 {@code /media/upload}，导致后端落库
 * {@code http://tmp/*}、管理后台无法查看图片、且临时路径随时失效。</p>
 *
 * <p>规则：以 http(s) 开头，且不属于 wxfile:// / file:// / http://tmp/ / http://usr/ 本地协议。</p>
 *
 * @param path 待判定路径
 * @returns true 表示已是服务器可访问 URL，无需再上传
 */
export function isUploadedMediaUrl(path: string | null | undefined): boolean {
  if (!path) {
    return false;
  }
  const p = path.trim();
  if (p.length === 0) {
    return false;
  }
  if (p.startsWith("wxfile://") || p.startsWith("file://")) {
    return false;
  }
  if (/^http:\/\/(tmp|usr)\//.test(p)) {
    return false;
  }
  return /^https?:\/\//.test(p);
}

/**
 * 解析媒体 URL：将上传路径重写为鉴权代理 URL，附加能力型签名（P0-2 起不再拼会话 JWT）。
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

  // 2026-08-16：pexels 外链在 mp 端无法加载（渲染层网络错误），统一本地化兜底；
  // 命中时直接返回本地包内路径（与 SafeImage 语义一致），不再走后续鉴权/静态重写。
  // 非 pexels URL 原样返回，行为不变。
  // R6/L01：兜底落点同样过 cdnize —— real 档下它可能落在 cdn 桶里（如 posts/、avatars/），
  // 那就不该指回包内路径（文件不随 real 主包发布）。
  const localized = toLocalImage(path);
  if (localized !== path) {
    return cdnize(localized);
  }

  // 2026-08-23：mock 演示媒体（/uploads/mock/*）在 mp 端因 HTTP 无法加载，
  // 统一本地化到包内 static 资源，避免 HTTP 拦截导致图片不渲染/布局撑大。
  const mockLocal = toLocalMockMedia(path);
  if (mockLocal !== path) {
    return cdnize(mockLocal);
  }

  // 绝对 URL / data URI / blob URL → 原样返回（无需鉴权）
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("data:") ||
    path.startsWith("blob:") ||
    path.startsWith("wxfile://")
  ) {
    // 历史包袱说明（勿再看成规则）：2026-09-03 那版注释断言「基础库 3.16.2 拒绝 http 图片」，
    // 于是把 http 形态的 app-assets URL 一律反写成 `/static/{rel}`。该断言已被 2026-09-22 的
    // wx.getImageInfo 探针（libVersion 3.17.1）证伪，而这条反写恰恰是主包瘦不下去的根因：
    // 只要它存在，cdn 桶里的图就被强制随包（实测 real 产物 static 12.19MB / 上限 2.00MB）。
    // 现口径：real 档 + rel 命中 cdn 桶 ⇒ 保持后端 URL 不反写；其余情况（非 real 档、
    // 以及 real 档的 localPrefixes/未登记 rel）仍落回 `/static/{rel}` 用包内那份。
    if (path.startsWith("http://") && path.includes(APP_ASSET_PREFIX)) {
      const rel = extractAppAssetRel(path);
      if (rel.length > 0) {
        if (isRealApiMode() && isCdnRel(rel)) {
          return path;
        }
        return relToPackagePath(rel);
      }
    }
    return path;
  }

  // 相对形态的鉴权代理/公开资产路径（`/api/v1/media/app-assets/...`）
  // 必须在 MEDIA_PROXY_PREFIX 之前判：app-assets 也含 `/api/v1/media/`，
  // 落到下面会被当成用户媒体去拼 token。
  if (path.includes(APP_ASSET_PREFIX)) {
    const rel = extractAppAssetRel(path);
    if (rel.length === 0) {
      // rel 为空（仅前缀无内容）→ 返回原路径（避免空本地路径）
      return path;
    }
    // real 档 + cdn 桶：补全 apiRoot 成绝对后端 URL。
    // 不补全会被 mp 当成包内文件（实测 getImageInfo: file not found）。
    if (isRealApiMode() && isCdnRel(rel)) {
      const base = appAssetsBaseUrl();
      if (base) {
        return `${base}${rel}`;
      }
    }
    // 其余档（mock/dev/showcase/H5）保持原行为：本地化为包内路径
    return relToPackagePath(rel);
  }

  // MP-R5-MEDIAAUTH（2026-09-13）：用户上传媒体（头像/照片墙）现为
  // /api/v1/media/{userId}/... 鉴权代理 URL。`<image>` 标签无法携带
  // Authorization 头 → 必须拼 ?token=；且相对路径会被 mp 当作包内文件
  // （实测 getImageInfo: file not found）→ 需拼 apiRoot 为绝对 URL。
  // 与旧 /uploads/ 前缀同待遇。app-assets 分支已在上方先行处理。
  if (path.startsWith(MEDIA_PROXY_PREFIX)) {
    const apiRoot = clientEnv.apiBaseUrl.replace(/\/api\/?$/, "");
    return appendTokenIfMissing(`${apiRoot}${path}`);
  }

  // 上传文件路径 /uploads/{userId}/{yyyyMM}/{uuid}.{ext} → 重写为鉴权代理 URL
  if (path.startsWith(UPLOADS_PREFIX)) {
    // 提取 {userId}/{yyyyMM}/{uuid}.{ext} 部分
    const suffix = path.substring(UPLOADS_PREFIX.length);
    if (suffix.length === 0) {
      return "";
    }
    // ⚠️ apiBaseUrl 可能自带 /api 后缀（如 http://127.0.0.1:8080/api），
    // 拼接前先去尾，避免拼出 /api/api/v1/media/... 双重前缀 404（2026-08-08 走查 P0-1 根因之一）
    const apiRoot = clientEnv.apiBaseUrl.replace(/\/api\/?$/, "");
    const proxyUrl = `${apiRoot}${MEDIA_PROXY_PREFIX}${suffix}`;
    return appendTokenIfMissing(proxyUrl);
  }

  // R13（2026-09-22）+ 2026-10-19 posts 分支 + 2026-08-10 体积优化：
  // 原先三处「哪个目录走后端」的判据都硬编码在本文件里（avatars/people 无条件改写、
  // posts 仅 real 改写、其余一律本地），与构建期裁剪脚本的目录清单互不相认，
  // 于是同一张图可以「运行时指后端、构建期判它包内自带」或反过来 —— 图标空白的病灶之一。
  // R6/L01（2026-10-19）：判据收敛到 apps/client/config/cdn-buckets.json 一份清单，
  // 运行时（本文件 + config/images.ts）与构建期（prepare-static / prune-unreferenced-static）
  // 读同一份。语义：real 档命中 cdnPrefixes 的包内路径改指后端公开端点，
  // 其余档（mock / dev / showcase / H5）与 localPrefixes（icons / svg-spec）留包内。
  if (path.startsWith(PKG_PATH_PREFIX)) {
    return cdnize(path);
  }

  // 其他相对路径（如 assets/icons/...、audio/... 这类无前导斜杠的形态）→ 原样返回，
  // 由 uni-app 解析为本地资源
  return path;
}

/**
 * 主动失效媒体凭据缓存（登录/登出/401 时调用）。
 * 2026-08-25：token 缓存失效标记迁至 utils/media-token-cache.ts（打破 http <-> media 循环依赖），
 * 此处保留 re-export 以兼容旧引用。
 */
export { invalidateMediaTokenCache } from "./media-token-cache";

/**
 * 为鉴权代理 URL 附加 token 查询参数。
 *
 * <p>如果 URL 已包含 {@code ?token=} 参数，则不重复附加；
 * 否则在 URL 末尾追加 {@code ?token=xxx} 或 {@code &token=xxx}。</p>
 *
 * <p>P0-2 收口最后一寸：这里**不再拼任何会话凭据**。历史上它把完整 24 小时 JWT
 * 塞进 {@code ?token=}，于是会话凭据常驻浏览器历史与上游代理/CDN 日志
 * （自家 Tomcat 访问日志已在 R4-00407 改为不记 query，但管不到上游）。</p>
 *
 * <p>现在改用后端 {@code POST /api/v1/media/sign} 签发的能力型 URL：
 * 逐路径绑定、15 分钟过期、签发时穿过与 GET 同一套归属/档位判定，
 * 泄露后既读不到别的文件也换不到任何业务权限。签名由
 * {@link ./media-sign-cache} 批量获取并缓存；本函数读它的版本号 ref，
 * 因此签名到达时调用方的 computed 会重算并补上图片。</p>
 *
 * <p>尚未签出时返回原 URL：由后端 401 触发 SafeImage fallback（与历史
 * 「无 token 时返回原 URL」同一约定），不返回空串，避免音频/视频播放等
 * 非图片消费者拿到空 URL 时报错点跑偏。</p>
 *
 * @param url 已构造的鉴权代理 URL（可能含其他查询参数）
 * @returns 带签名的 URL；未签出或已关闭拼接时返回原 URL
 */
function appendTokenIfMissing(url: string): string {
  // 逃生开关（R4-00244 沿用至今）：置 false 时 URL 上不带任何凭据，
  // 由后端自身的权限策略决定可否访问。
  if (!clientEnv.mediaTokenQuery) {
    return url;
  }
  // 只有 real 档才走后端签名；mock/dev/showcase 的媒体由包内资源或 mock 服务承接
  if (!isRealApiMode()) {
    return url;
  }
  // 读版本号以建立响应式依赖：签名异步回来后，模板里的 computed 会重算
  mediaSignVersion();
  const signed = signedMediaUrl(mediaPathOf(url));
  if (signed) {
    return withApiRoot(signed);
  }
  // 已排队等待签发；这一帧先按无凭据 URL 渲染（401 → SafeImage fallback）
  return url;
}

/** 从已构造的 URL 里取出后端可识别的媒体路径（去掉站点前缀与既有 query）。 */
function mediaPathOf(url: string): string {
  const withoutQuery = url.split("?")[0] ?? "";
  const apiRoot = (clientEnv.apiBaseUrl || "").replace(/\/api\/?$/, "");
  const path = withoutQuery.startsWith(apiRoot)
    ? withoutQuery.slice(apiRoot.length)
    : withoutQuery;
  return path.startsWith("/") ? path : `/${path}`;
}

/** 把签名后的 path 重新贴回站点前缀。 */
function withApiRoot(signedPath: string): string {
  const apiRoot = (clientEnv.apiBaseUrl || "").replace(/\/api\/?$/, "");
  return `${apiRoot}${signedPath}`;
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

/* ========== 上传扩展名白名单（客户端唯一真源） ========== */

/**
 * 客户端上传的媒体类型（与后端 LocalMediaStorageService 的校验分支一致）。
 * 注：当前产品无视频上传入口（pages/profile/index.vue:182 注释），
 * video 档仍按后端白名单登记，供后续接入直接复用。
 */
export type UploadMediaKind = "image" | "video" | "audio";

/**
 * 上传扩展名白名单——客户端唯一真源（single source of truth）。
 *
 * 镜像后端 apps/api `.../media/LocalMediaStorageService.java:79-87`：
 *   image → jpg/jpeg/png/webp；video → mp4/mov；audio → aac/mp3/m4a/wav。
 * 消费点（发起上传**之前**拦截，服务端仍会二次校验）：
 *   - services/api.ts uploadFileViaUni（头像/背景/照片墙/半身照/帖子图/语音状态/反馈图）
 *   - services/voice-upload.ts uploadVoiceFile（私信与临时会话的语音消息）
 *
 * ⚠️ subpackages/support/feedback/index.vue:63 另有一份页面自用副本 ALLOWED_EXTS
 * （与它自己的 5MB / 最多 3 张限制绑定，本次不动）；修改本表时请同步该处。
 * ⚠️ constants/limits.ts:88-91 的 MEDIA_LIMITS.IMAGE_MIME_TYPES / VIDEO_MIME_TYPES
 * 是一份**全仓 0 消费方**的历史清单（含后端拒收的 gif/webm，见台账
 * MP-R7CLIENT-LIMITS-GIF-001），本次未接线、也未改动它——扩展名判定一律走本表。
 */
export const ALLOWED_MEDIA_EXTS: Record<UploadMediaKind, readonly string[]> = {
  image: ["jpg", "jpeg", "png", "webp"],
  video: ["mp4", "mov"],
  audio: ["aac", "mp3", "m4a", "wav"],
};

/**
 * 取文件路径/文件名的扩展名（小写、不含点号）。
 *
 * 先去查询串与 hash（模拟器临时路径可能形如 `http://tmp/a.jpeg?x=1`），
 * 再取最后一段路径的后缀；无扩展名（如 H5 的 `blob:` URL）返回空串。
 *
 * @param pathOrName 本地临时路径或文件名
 * @returns 小写扩展名（不含点），取不到时为空串
 */
export function getMediaFileExt(pathOrName: string | null | undefined): string {
  if (!pathOrName) return "";
  const clean = pathOrName.split(/[?#]/)[0] ?? "";
  const tail = clean.split(/[/\\]/).pop() ?? "";
  const dot = tail.lastIndexOf(".");
  if (dot < 0 || dot === tail.length - 1) return "";
  return tail.slice(dot + 1).toLowerCase();
}

/**
 * 上传扩展名白名单校验（保守放行）。
 *
 * 判定口径：能取到扩展名且不在对应媒体类型白名单内 → 拒绝；
 * 取不到扩展名（H5 `blob:` 上传、无后缀临时路径）→ 放行交由服务端判定，
 * 避免把合法上传误杀成「格式不支持」。
 *
 * @param pathOrName 本地临时路径或文件名
 * @param kind 媒体类型
 * @returns true 表示允许上传
 */
export function isAllowedMediaExt(pathOrName: string | null | undefined, kind: UploadMediaKind): boolean {
  const ext = getMediaFileExt(pathOrName);
  if (ext.length === 0) return true;
  return ALLOWED_MEDIA_EXTS[kind].some((allowed) => allowed === ext);
}

/**
 * 白名单的可读列表（用于用户可见错误文案，如 "jpg / jpeg / png / webp"）。
 *
 * @param kind 媒体类型
 */
export function describeAllowedMediaExts(kind: UploadMediaKind): string {
  return ALLOWED_MEDIA_EXTS[kind].join(" / ");
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
