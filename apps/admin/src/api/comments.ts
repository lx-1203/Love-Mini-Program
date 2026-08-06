/**
 * 管理后台 - 评论管理 API。
 * 对应后端 com.campuslove.api.admin.AdminCommentController
 * （GET /api/v1/admin/comments、DELETE /api/v1/admin/comments/{id}）。
 */
import { AdminPageView, del, get } from "./http";

/** 评论列表项视图（对应后端 AdminCommentSummaryView） */
export interface AdminCommentSummary {
  id: number;
  postId: number | null;
  authorId: number;
  authorNickname: string | null;
  content: string;
  createdAt: string;
}

/** 评论列表查询参数 */
export interface AdminCommentListQuery {
  /** 作者用户 ID 筛选（可选） */
  authorId?: number;
  /** 关联帖子 ID 筛选（可选） */
  postId?: number;
  page?: number;
  pageSize?: number;
}

/** 删除评论响应体 */
export interface DeleteCommentResponse {
  id: number;
  success: boolean;
}

/**
 * 分页查询评论列表。
 * GET /api/v1/admin/comments
 */
export function listComments(
  query: AdminCommentListQuery = {}
): Promise<AdminPageView<AdminCommentSummary>> {
  return get<AdminPageView<AdminCommentSummary>>(
    "/v1/admin/comments",
    query as Record<string, unknown>
  );
}

/**
 * 删除评论（硬删除，不可恢复）。
 * DELETE /api/v1/admin/comments/{id}
 */
export function deleteComment(id: number): Promise<DeleteCommentResponse> {
  return del<DeleteCommentResponse>(`/v1/admin/comments/${id}`);
}
