/**
 * 管理后台 - 帖子管理 API 封装。
 *
 * 对应后端：com.campuslove.api.admin.AdminPostController (/api/v1/admin/posts)
 *
 * 评论契约统一在 api/comments.ts（Comments.vue 消费），本文件不再重复定义，
 * 避免两套契约并存（FIN-0032 / findings #32）。
 */

import { AdminPageView, del, get, post } from "./http";

// ---------- 帖子 ----------

/** 帖子列表项视图（对应后端 AdminPostSummaryView） */
export interface AdminPostSummary {
  id: number;
  authorId: number;
  authorNickname: string | null;
  contentPreview: string;
  category: string;
  status: "active" | "deleted" | "hidden";
  auditStatus: "pending" | "approved" | "rejected";
  likesCount: number;
  commentsCount: number;
  shareCount: number;
  createdAt: string;
  auditedAt: string | null;
}

/** 帖子审核请求体（对应后端 AdminPostAuditRequest） */
export interface AdminPostAuditRequest {
  decision: "approved" | "rejected";
  remark?: string;
}

/** 帖子审核响应 */
export interface AdminPostAuditResponse {
  id: number;
  auditStatus: "pending" | "approved" | "rejected";
  auditRemark: string | null;
  auditorId: number;
  auditedAt: string;
  success: boolean;
}

/** 帖子删除响应 */
export interface AdminPostDeleteResponse {
  id: number;
  status: "active" | "deleted" | "hidden";
  success: boolean;
}

/** 帖子列表查询参数 */
export interface AdminPostListQuery {
  auditStatus?: "pending" | "approved" | "rejected";
  status?: "active" | "deleted" | "hidden";
  category?: string;
  authorId?: number;
  page?: number;
  pageSize?: number;
}

/**
 * 分页查询帖子列表。
 * GET /api/v1/admin/posts
 */
export function listPosts(
  query: AdminPostListQuery = {}
): Promise<AdminPageView<AdminPostSummary>> {
  return get<AdminPageView<AdminPostSummary>>("/v1/admin/posts", query as Record<string, unknown>);
}

/**
 * 审核帖子（通过/拒绝）。
 * POST /api/v1/admin/posts/{id}/audit
 */
export function auditPost(
  id: number,
  req: AdminPostAuditRequest
): Promise<AdminPostAuditResponse> {
  return post<AdminPostAuditResponse>(`/v1/admin/posts/${id}/audit`, req);
}

/**
 * 删除帖子（软删除）。
 * DELETE /api/v1/admin/posts/{id}
 */
export function deletePost(id: number): Promise<AdminPostDeleteResponse> {
  return del<AdminPostDeleteResponse>(`/v1/admin/posts/${id}`);
}

