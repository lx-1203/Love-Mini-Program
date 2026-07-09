/**
 * 管理后台 - 内容管理 API 封装（帖子 + 评论 + 举报）。
 *
 * 对应后端：
 *   - com.campuslove.api.admin.AdminPostController  (/api/admin/posts)
 *   - com.campuslove.api.admin.AdminCommentController (/api/admin/comments)
 *   - com.campuslove.api.admin.AdminReportController  (/api/admin/reports)
 *
 * 注：举报接口当前为占位实现，后端举报表后续落地后接口契约不变。
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
 * GET /api/admin/posts
 */
export function listPosts(
  query: AdminPostListQuery = {}
): Promise<AdminPageView<AdminPostSummary>> {
  return get<AdminPageView<AdminPostSummary>>("/admin/posts", query as Record<string, unknown>);
}

/**
 * 审核帖子（通过/拒绝）。
 * POST /api/admin/posts/{id}/audit
 */
export function auditPost(
  id: number,
  req: AdminPostAuditRequest
): Promise<AdminPostAuditResponse> {
  return post<AdminPostAuditResponse>(`/admin/posts/${id}/audit`, req);
}

/**
 * 删除帖子（软删除）。
 * DELETE /api/admin/posts/{id}
 */
export function deletePost(id: number): Promise<AdminPostDeleteResponse> {
  return del<AdminPostDeleteResponse>(`/admin/posts/${id}`);
}

// ---------- 评论 ----------

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
 * GET /api/admin/comments
 */
export function listComments(
  query: AdminCommentListQuery = {}
): Promise<AdminPageView<AdminCommentSummary>> {
  return get<AdminPageView<AdminCommentSummary>>("/admin/comments", query as Record<string, unknown>);
}

/**
 * 删除评论。
 * DELETE /api/admin/comments/{id}
 */
export function deleteComment(id: number): Promise<AdminCommentDeleteResponse> {
  return del<AdminCommentDeleteResponse>(`/admin/comments/${id}`);
}

// ---------- 举报（占位） ----------

/** 举报列表项视图（对应后端 AdminReportView，当前为占位） */
export interface AdminReportSummary {
  id: number;
  targetType: "post" | "comment" | "user";
  targetId: number;
  reporterId: number;
  reporterNickname: string | null;
  reason: string | null;
  description: string | null;
  status: "pending" | "handling" | "resolved" | "dismissed";
  handlerId: number | null;
  handleRemark: string | null;
  createdAt: string;
  handledAt: string | null;
}

/** 举报处理请求体（对应后端 AdminReportHandleRequest） */
export interface AdminReportHandleRequest {
  result: "resolved" | "dismissed";
  remark?: string;
}

/** 举报处理响应 */
export interface AdminReportHandleResponse {
  id: number;
  result: "resolved" | "dismissed";
  remark: string | null;
  handlerId: number;
  success: boolean;
  message?: string;
}

/** 举报列表查询参数 */
export interface AdminReportListQuery {
  status?: "pending" | "handling" | "resolved" | "dismissed";
  targetType?: "post" | "comment" | "user";
  page?: number;
  pageSize?: number;
}

/**
 * 分页查询举报列表（当前为占位实现，返回空列表）。
 * GET /api/admin/reports
 */
export function listReports(
  query: AdminReportListQuery = {}
): Promise<AdminPageView<AdminReportSummary>> {
  return get<AdminPageView<AdminReportSummary>>("/admin/reports", query as Record<string, unknown>);
}

/**
 * 处理举报（当前为占位实现，仅校验参数后返回成功）。
 * POST /api/admin/reports/{id}/handle
 */
export function handleReport(
  id: number,
  req: AdminReportHandleRequest
): Promise<AdminReportHandleResponse> {
  return post<AdminReportHandleResponse>(`/admin/reports/${id}/handle`, req);
}
