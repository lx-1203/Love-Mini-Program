/**
 * Admin v2 - 媒体图片审核 API 封装（2026-08-09）。
 *
 * 对应后端控制器：AdminMediaAssetController（/api/v1/admin/media-assets）
 * 列表端点返回 AdminPageView<T>（{ items, total, page, pageSize, totalPages }）。
 */

import { AdminPageView, get, post } from "./http";
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
