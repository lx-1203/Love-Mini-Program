/**
 * Admin v2 - 媒体图片审核 API 封装（2026-08-09）。
 *
 * 对应后端控制器：AdminMediaAssetController（/api/v1/admin/media-assets）
 * 列表端点返回 AdminPageView<T>（{ items, total, page, pageSize, totalPages }）。
 */

import { AdminPageView, get, post } from "./http";
import { mediaSignVersion, signedMediaUrl } from "./media-sign-cache";
import type { AuditRequest } from "./forum";

// ============================================================
// 类型定义
// ============================================================

/** 媒体图片审核列表视图（对应后端 AdminMediaAssetSummaryView） */
export interface MediaAssetSummary {
  /** 资产 ID */
  id: number;
  /** 上传者用户 ID */
  userId: number;
  /** 上传者昵称 */
  userNickname: string | null;
  /** 上传者头像 URL */
  userAvatar: string | null;
  /** 媒体类型（avatar/image） */
  type: string;
  /** 媒体 URL */
  url: string;
  /** 原始文件名 */
  originalName: string | null;
  /** MIME 类型 */
  mime: string | null;
  /** 文件大小（字节） */
  size: number | null;
  /** 图片宽度（像素） */
  width: number | null;
  /** 图片高度（像素） */
  height: number | null;
  /** 资产状态（pending/ready/failed） */
  status: string;
  /** 审核状态（pending/approved/rejected） */
  auditStatus: string;
  /** 审核备注（拒绝原因） */
  auditRemark: string | null;
  /** 审核人用户 ID */
  auditorId: number | null;
  /** 审核时间 */
  auditedAt: string | null;
  /** 上传时间 */
  createdAt: string;
  /** 上传者所属校区 */
  campusName: string | null;
}

/** 媒体图片审核详情视图（对应后端 AdminMediaAssetDetailView） */
export interface MediaAssetDetail extends MediaAssetSummary {
  /** 视频时长（毫秒，图片为 null） */
  durationMs: number | null;
}

/** 列表查询参数 */
export interface MediaAssetListQuery {
  /** 审核状态：pending / approved / rejected，默认 pending */
  auditStatus?: string;
  /** 媒体类型：avatar / image / video / background / app_asset（应用装饰资产），默认全部 */
  type?: string;
  /** 上传者用户 ID */
  userId?: number;
  /** 校区名（校区管理员强制忽略） */
  campusName?: string;
  /** 页码，1-based */
  page?: number;
  /** 每页大小 */
  pageSize?: number;
}

/** 审核响应体 */
export interface AuditResponse {
  id: number;
  auditStatus: string;
  auditRemark: string | null;
}

// ============================================================
// API
// ============================================================

/**
 * 为用户上传媒体 URL 附加访问凭据（供 `<img src>` 直连）。
 *
 * 演进史：
 * - MP-R5-ADMINTHUMB（2026-09-13）：`<img>` 无法携带 Authorization 头，旧方案把
 *   完整管理员会话 JWT 拼进 `?token=`（当时后端接受）。
 * - 2026-10-26（goal-2026-10-26 缺陷1修复）：后端 P0-2 收口后
 *   `app.security.media-query-token-strict` 默认 true，查询参数只接受
 *   scope=media 短期令牌，完整会话 JWT 一律 401 —— 媒体资产页实测 20/20 裂图
 *   （admin-sync/01-admin-browser-verify.log；同路径 header-token 200）。
 *   改走与小程序端同源的能力型签名 URL：`POST /api/v1/media/sign` 批量签发
 *   `?exp=&sig=`（逐路径绑定、15 分钟过期、签发时穿过后端归属/档位判定），
 *   会话凭据不再进入图片地址。签名缓存见 {@link ./media-sign-cache}。
 *
 * 响应式约定：本函数在渲染上下文（模板/computed）中调用时会读签名版本号，
 * 签名异步到达后自动重渲染补图；尚未签出时按无凭据 URL 渲染（401 触发
 * `@error` 占位），与客户端 appendTokenIfMissing 的「先渲染后补签」同款。
 *
 * @param url 媒体 URL（相对路径或完整 URL）
 * @returns 带能力型签名的 URL；非用户媒体（app-assets/公开资产）原样返回
 */
export function withMediaToken(url: string | null | undefined): string {
  if (!url) return "";
  // R13（2026-09-22）：种子数据里的装饰资产是小程序包内路径 `/static/{rel}`。
  // 管理端没有包内 static，且 Vite 只代理 `/api`，故改写到后端公开 app-assets 端点；
  // 小程序端仍走本地化路径，不受影响（见 apps/client/src/utils/media.ts 的同名映射）。
  if (url.startsWith("/static/")) return `/api/v1/media/app-assets/${url.slice("/static/".length)}`;
  // 应用资产为公开端点，无需签名；历史遗留的 ?token= 形态保持原样（幂等）
  if (url.includes("app-assets/") || url.includes("token=")) return url;
  const mediaPath = signableMediaPath(url);
  if (!mediaPath) return url;
  // 读版本号建立响应式依赖：签名到达后模板重渲染
  mediaSignVersion();
  const signedUrl = signedMediaUrl(mediaPath);
  if (signedUrl) return withOriginOf(url, signedUrl);
  // 尚未签出：返回 1x1 透明占位，**不要**返回裸 URL。
  // 2026-10-26 浏览器门实测：裸 URL 会先发一次 401（list|401 /api/v1/media/...），
  // 虽然签名到达后会重渲染补图，但那条 401 是真实的失败请求；占位符等签名即可零报错。
  return "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
}

/** 用户媒体路径形态：`/api/v1/media/{userId}/{子路径}`（与后端 SIGNABLE_PATH_PATTERN 同源）。 */
const SIGNABLE_MEDIA_PATH = /^\/api\/v1\/media\/\d+\/.+$/;

/**
 * 从任意形态（相对 / 绝对 / 带 query）的 URL 里取后端可签名的媒体路径。
 *
 * @returns 形如 `/api/v1/media/{userId}/{yyyyMM}/{uuid}.{ext}` 的路径；不匹配返回 null
 */
function signableMediaPath(url: string): string | null {
  const withoutQuery = url.split("?")[0] ?? "";
  // 绝对 URL 先剥 origin（后端签名按路径逐字绑定，必须与 requestURI 一致）
  const absoluteMatch = withoutQuery.match(/^https?:\/\/[^/]+(\/.+)$/);
  const pathOnly = absoluteMatch?.[1] ?? withoutQuery;
  if (!SIGNABLE_MEDIA_PATH.test(pathOnly)) {
    return null;
  }
  return pathOnly;
}

/** 把签名后的路径贴回入参 URL 的 origin（入参是相对路径时原样返回，走同源代理）。 */
function withOriginOf(originalUrl: string, signedPath: string): string {
  const originMatch = originalUrl.match(/^https?:\/\/[^/]+/);
  const origin = originMatch?.[0] ?? "";
  if (origin) {
    return origin + signedPath;
  }
  return signedPath;
}

/**
 * 分页查询媒体图片（默认按 pending 筛选）。
 * GET /api/v1/admin/media-assets
 */
export function listMediaAssets(
  query: MediaAssetListQuery = {}
): Promise<AdminPageView<MediaAssetSummary>> {
  return get<AdminPageView<MediaAssetSummary>>(
    "/v1/admin/media-assets",
    query as Record<string, unknown>
  );
}

/**
 * 查询媒体图片详情。
 * GET /api/v1/admin/media-assets/{id}
 */
export function getMediaAsset(id: number): Promise<MediaAssetDetail> {
  return get<MediaAssetDetail>(`/v1/admin/media-assets/${id}`);
}

/**
 * 审核媒体图片（通过/拒绝）。
 * POST /api/v1/admin/media-assets/{id}/audit
 */
export function auditMediaAsset(id: number, req: AuditRequest): Promise<AuditResponse> {
  return post<AuditResponse>(`/v1/admin/media-assets/${id}/audit`, req);
}
