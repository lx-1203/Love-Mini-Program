/**
 * 管理后台 - 内容管理 API 封装（帖子 + 评论）。
 *
 * 对应后端：
 *   - com.campuslove.api.admin.AdminPostController  (/api/v1/admin/posts)
 *   - com.campuslove.api.admin.AdminCommentController (/api/v1/admin/comments)
 *
 * 举报接口已迁移至 api/reports.ts（与后端 AdminReportController 契约对齐），
 * 本文件不再重复定义，避免两套契约并存（FIN-0032 / findings #32）。
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

// ---------- 评论 ----------
// infra R2-00468：listComments/deleteComment 已封装但暂无页面消费（评论管理页缺失，
// 属 HIGH 功能缺失项，由主代理处理）。此处保留封装避免重复实现，
// 待评论管理页落地后直接消费；新增页面时请同步注册 Layout 菜单与路由。

/** 评论列表项视图（对应后端 AdminCommentSummaryView） */
export interface AdminCommentSummary {
  id: number;
  postId: number | null;
  authorId: number;
  authorNickname: string | null;
  content: string;
  createdAt: string;
}

/** 评论删除响应 */
export interface AdminCommentDeleteResponse {
  id: number;
  success: boolean;
}

/** 评论列表查询参数 */
export interface AdminCommentListQuery {
  authorId?: number;
  postId?: number;
  page?: number;
  pageSize?: number;
}

/**
 * 分页查询评论列表。
 * GET /api/v1/admin/comments
 */
export function listComments(
  query: AdminCommentListQuery = {}
): Promise<AdminPageView<AdminCommentSummary>> {
  return get<AdminPageView<AdminCommentSummary>>("/v1/admin/comments", query as Record<string, unknown>);
}

/**
 * 删除评论。
 * DELETE /api/v1/admin/comments/{id}
 */
export function deleteComment(id: number): Promise<AdminCommentDeleteResponse> {
  return del<AdminCommentDeleteResponse>(`/v1/admin/comments/${id}`);
}
