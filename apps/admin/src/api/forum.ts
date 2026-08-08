/**
 * Admin v2 - 论坛分页管理 API 封装。
 *
 * 对应后端控制器：
 * - AdminVillagePostController（村落动态：/api/v1/admin/forum/village-posts）
 * - AdminCircleController（兴趣圈：/api/v1/admin/forum/circles）
 * - AdminCampusTopicController（校园圈话题：/api/v1/admin/forum/campus-topics）
 * - AdminCommentController（统一评论：/api/v1/admin/comments）
 *
 * 响应形态：所有列表端点返回 AdminPageView<T>（{ items, total, page, pageSize, totalPages }）；
 * 写操作端点返回直出 JSON（{ id, success, ... }）。
 */

import { AdminPageView, del, get, post, put } from "./http";

// ============================================================
// 通用类型
// ============================================================

/**
 * 审核请求体（对应后端 AdminPostAuditRequest）。
 * 村落动态与校园圈话题的审核端点共用此结构。
 */
export interface AuditRequest {
  /** 审核决定：approved 通过 / rejected 拒绝 */
  decision: "approved" | "rejected";
  /** 审核备注（拒绝原因等，可选） */
  remark?: string;
}

/**
 * 评论视图（对应后端 AdminCommentSummaryView）。
 * 村落动态帖子评论（GET /village-posts/{id}/comments）与统一评论
 * （GET /api/v1/admin/comments）共用此结构。
 */
export interface PostCommentView {
  /** 评论 ID */
  id: number;
  /** 关联帖子 ID（村落动态详情查询时恒非空；统一评论列表可为 null） */
  postId: number | null;
  /** 评论作者用户 ID */
  authorId: number;
  /** 作者昵称（作者不存在时为 null） */
  authorNickname: string | null;
  /** 评论内容 */
  content: string;
  /** 评论时间 */
  createdAt: string;
}

/** 通用删除响应体（{ id, success } 形态） */
export interface IdSuccessResponse {
  id: number;
  success: boolean;
}

// ============================================================
// 村落动态（/api/v1/admin/forum/village-posts）
// ============================================================

/**
 * 村落动态列表项视图（对应后端 AdminVillagePostSummaryView）。
 */
export interface VillagePostSummary {
  /** 帖子 ID */
  id: number;
  /** 作者用户 ID */
  authorId: number;
  /** 作者昵称（作者不存在时为 null） */
  authorNickname: string | null;
  /** 作者头像 URL（作者不存在时为 null） */
  authorAvatar: string | null;
  /** 内容预览（前 80 字符） */
  contentPreview: string;
  /** 分类：interest/sincere/hometown/anonymous/latest/campus/all */
  category: string | null;
  /** 帖子状态：active 正常 / deleted 已删除 / hidden 已隐藏 */
  status: "active" | "deleted" | "hidden" | null;
  /** 审核状态：pending 待审核 / approved 已通过 / rejected 已拒绝 */
  auditStatus: "pending" | "approved" | "rejected" | null;
  /** 是否置顶 */
  isPinned: boolean;
  /** 点赞数 */
  likesCount: number;
  /** 评论数 */
  commentsCount: number;
  /** 转发数 */
  shareCount: number;
  /** 浏览量（2026-08-08 论坛互动真实化新增） */
  viewCount: number;
  /** 收藏数（2026-08-08 论坛互动真实化新增） */
  favoriteCount: number;
  /** 创建时间 */
  createdAt: string;
  /** 审核时间（未审核为 null） */
  auditedAt: string | null;
}

/**
 * 村落动态详情视图（对应后端 AdminVillagePostDetailView）。
 */
export interface VillagePostDetail {
  /** 帖子 ID */
  id: number;
  /** 作者用户 ID */
  authorId: number;
  /** 作者昵称 */
  authorNickname: string | null;
  /** 作者头像 URL */
  authorAvatar: string | null;
  /** 帖子完整内容 */
  content: string;
  /** 图片 URL 数组（JSON 字符串） */
  images: string | null;
  /** 话题标签数组（JSON 字符串） */
  tags: string | null;
  /** 分类 */
  category: string | null;
  /** 帖子状态 */
  status: "active" | "deleted" | "hidden" | null;
  /** 审核状态 */
  auditStatus: "pending" | "approved" | "rejected" | null;
  /** 审核备注（拒绝原因等） */
  auditRemark: string | null;
  /** 审核人用户 ID */
  auditorId: number | null;
  /** 审核时间 */
  auditedAt: string | null;
  /** 是否置顶 */
  isPinned: boolean;
  /** 点赞数 */
  likesCount: number;
  /** 评论数 */
  commentsCount: number;
  /** 转发数 */
  shareCount: number;
  /** 浏览量（2026-08-08 论坛互动真实化新增） */
  viewCount: number;
  /** 收藏数（2026-08-08 论坛互动真实化新增） */
  favoriteCount: number;
  /** 创建时间 */
  createdAt: string;
  /** 最近更新时间 */
  updatedAt: string;
}

/**
 * 帖子浏览者视图（对应后端 AdminPostViewerView，2026-08-08 新增）。
 */
export interface PostViewer {
  /** 浏览者用户 ID */
  userId: number;
  /** 浏览者昵称 */
  nickname: string | null;
  /** 浏览者头像 URL */
  avatarUrl: string | null;
  /** 最近浏览时间 */
  viewedAt: string;
}

/**
 * 分页查询帖子的浏览记录（后台可见）。
 * GET /api/v1/admin/forum/village-posts/{id}/views
 */
export function listPostViewers(
  id: number,
  query: { page?: number; pageSize?: number } = {}
): Promise<AdminPageView<PostViewer>> {
  return get<AdminPageView<PostViewer>>(
    `/v1/admin/forum/village-posts/${id}/views`,
    query as Record<string, unknown>
  );
}

/** 村落动态列表查询参数 */
export interface VillagePostListQuery {
  /** 审核状态筛选：pending / approved / rejected */
  auditStatus?: "pending" | "approved" | "rejected";
  /** 帖子状态筛选：active / deleted / hidden */
  status?: "active" | "deleted" | "hidden";
  /** 内容模糊关键字（村落动态无标题字段，仅匹配内容） */
  keyword?: string;
  /** 校区筛选（按作者所属校区过滤；校区管理员忽略本参数） */
  campusName?: string;
  /** 页码，1-based */
  page?: number;
  /** 每页条数 */
  pageSize?: number;
}

/**
 * 分页查询村落动态列表。
 * GET /api/v1/admin/forum/village-posts
 */
export function listVillagePosts(
  query: VillagePostListQuery = {}
): Promise<AdminPageView<VillagePostSummary>> {
  return get<AdminPageView<VillagePostSummary>>(
    "/v1/admin/forum/village-posts",
    query as Record<string, unknown>
  );
}

/**
 * 查询村落动态详情。
 * GET /api/v1/admin/forum/village-posts/{id}
 */
export function getVillagePost(id: number): Promise<VillagePostDetail> {
  return get<VillagePostDetail>(`/v1/admin/forum/village-posts/${id}`);
}

/**
 * 审核村落动态（通过/拒绝）。
 * POST /api/v1/admin/forum/village-posts/{id}/audit
 */
export function auditVillagePost(id: number, req: AuditRequest): Promise<IdSuccessResponse & { auditStatus: string }> {
  return post<IdSuccessResponse & { auditStatus: string }>(
    `/v1/admin/forum/village-posts/${id}/audit`,
    req
  );
}

/**
 * 置顶村落动态。
 * POST /api/v1/admin/forum/village-posts/{id}/pin
 */
export function pinVillagePost(id: number): Promise<IdSuccessResponse & { isPinned: boolean }> {
  return post<IdSuccessResponse & { isPinned: boolean }>(`/v1/admin/forum/village-posts/${id}/pin`);
}

/**
 * 取消村落动态置顶。
 * POST /api/v1/admin/forum/village-posts/{id}/unpin
 */
export function unpinVillagePost(id: number): Promise<IdSuccessResponse & { isPinned: boolean }> {
  return post<IdSuccessResponse & { isPinned: boolean }>(`/v1/admin/forum/village-posts/${id}/unpin`);
}

/**
 * 删除村落动态（软删除，status 置为 deleted）。
 * DELETE /api/v1/admin/forum/village-posts/{id}
 */
export function deleteVillagePost(id: number): Promise<IdSuccessResponse & { status: string }> {
  return del<IdSuccessResponse & { status: string }>(`/v1/admin/forum/village-posts/${id}`);
}

/**
 * 分页查询指定帖子的评论列表。
 * GET /api/v1/admin/forum/village-posts/{id}/comments
 */
export function listPostComments(
  id: number,
  query: { page?: number; pageSize?: number } = {}
): Promise<AdminPageView<PostCommentView>> {
  return get<AdminPageView<PostCommentView>>(
    `/v1/admin/forum/village-posts/${id}/comments`,
    query as Record<string, unknown>
  );
}

// ============================================================
// 兴趣圈（/api/v1/admin/forum/circles）
// ============================================================

/**
 * 兴趣圈列表项视图（对应后端 AdminCircleSummaryView）。
 */
export interface CircleView {
  /** 兴趣圈 ID */
  id: number;
  /** 圈名 */
  name: string;
  /** emoji 图标 */
  icon: string;
  /** 圈子描述 */
  description: string | null;
  /** 成员数 */
  memberCount: number;
  /** 排序权重（升序） */
  sortOrder: number;
  /** 创建时间 */
  createdAt: string;
}

/**
 * 兴趣圈新增/编辑请求体（对应后端 AdminCircleRequest）。
 * 新增（POST）时 name 必填；编辑（PUT）时仅非 null 字段生效（部分更新）。
 */
export interface CircleForm {
  /** 圈名（新增必填，1-64 字；编辑可选） */
  name?: string;
  /** emoji 图标（可选，≤16 字符；新增缺省 📋） */
  icon?: string;
  /** 圈子描述（可选，≤256 字） */
  description?: string;
  /** 排序权重（可选，升序；新增缺省 0） */
  sortOrder?: number;
}

/** 兴趣圈列表查询参数 */
export interface CircleListQuery {
  /** 圈名/描述模糊关键字 */
  keyword?: string;
  /** 页码，1-based */
  page?: number;
  /** 每页条数 */
  pageSize?: number;
}

/**
 * 分页查询兴趣圈列表。
 * GET /api/v1/admin/forum/circles
 */
export function listCircles(query: CircleListQuery = {}): Promise<AdminPageView<CircleView>> {
  return get<AdminPageView<CircleView>>(
    "/v1/admin/forum/circles",
    query as Record<string, unknown>
  );
}

/**
 * 新增兴趣圈。
 * POST /api/v1/admin/forum/circles
 */
export function createCircle(req: CircleForm): Promise<CircleView> {
  return post<CircleView>("/v1/admin/forum/circles", req);
}

/**
 * 编辑兴趣圈（部分更新）。
 * PUT /api/v1/admin/forum/circles/{id}
 */
export function updateCircle(id: number, req: CircleForm): Promise<CircleView> {
  return put<CircleView>(`/v1/admin/forum/circles/${id}`, req);
}

/**
 * 删除兴趣圈。
 * 圈子下存在话题时后端返回 409（body 含 error 字段说明话题数）。
 * DELETE /api/v1/admin/forum/circles/{id}
 */
export function deleteCircle(id: number): Promise<IdSuccessResponse> {
  return del<IdSuccessResponse>(`/v1/admin/forum/circles/${id}`);
}

/**
 * 圈内话题列表项视图（对应后端 AdminCircleTopicSummaryView）。
 */
export interface TopicSummary {
  /** 话题 ID */
  id: number;
  /** 所属圈子 ID */
  circleId: number;
  /** 所属圈子名 */
  circleName: string;
  /** 作者用户 ID */
  authorId: number;
  /** 作者昵称（作者不存在时为 null） */
  authorNickname: string | null;
  /** 话题标题 */
  title: string;
  /** 话题内容预览（前 80 字符） */
  contentPreview: string;
  /** 回复数 */
  replyCount: number;
  /** 是否置顶 */
  isPinned: boolean;
  /** 创建时间 */
  createdAt: string;
}

/** 圈内话题列表查询参数 */
export interface CircleTopicListQuery {
  /** 作者用户 ID 筛选 */
  authorId?: number;
  /** 标题/内容模糊关键字 */
  keyword?: string;
  /** 页码，1-based */
  page?: number;
  /** 每页条数 */
  pageSize?: number;
}

/**
 * 分页查询指定兴趣圈的话题列表（置顶优先）。
 * GET /api/v1/admin/forum/circles/{id}/topics
 */
export function listCircleTopics(
  circleId: number,
  query: CircleTopicListQuery = {}
): Promise<AdminPageView<TopicSummary>> {
  return get<AdminPageView<TopicSummary>>(
    `/v1/admin/forum/circles/${circleId}/topics`,
    query as Record<string, unknown>
  );
}

/**
 * 置顶兴趣圈话题。
 * POST /api/v1/admin/forum/circles/topics/{id}/pin
 */
export function pinTopic(id: number): Promise<IdSuccessResponse & { isPinned: boolean }> {
  return post<IdSuccessResponse & { isPinned: boolean }>(`/v1/admin/forum/circles/topics/${id}/pin`);
}

/**
 * 取消兴趣圈话题置顶。
 * POST /api/v1/admin/forum/circles/topics/{id}/unpin
 */
export function unpinTopic(id: number): Promise<IdSuccessResponse & { isPinned: boolean }> {
  return post<IdSuccessResponse & { isPinned: boolean }>(`/v1/admin/forum/circles/topics/${id}/unpin`);
}

/**
 * 删除兴趣圈话题（硬删除，回复随数据库级联清理）。
 * DELETE /api/v1/admin/forum/circles/topics/{id}
 */
export function deleteTopic(id: number): Promise<IdSuccessResponse> {
  return del<IdSuccessResponse>(`/v1/admin/forum/circles/topics/${id}`);
}

// ============================================================
// 校园圈话题（/api/v1/admin/forum/campus-topics）
// ============================================================

/**
 * 校园圈话题列表项视图（对应后端 AdminCampusTopicSummaryView）。
 */
export interface CampusTopicSummary {
  /** 话题 ID */
  id: number;
  /** 所属学校 ID */
  schoolId: number | null;
  /** 所属学校名（批量预加载填充） */
  schoolName: string | null;
  /** 作者用户 ID */
  authorId: number;
  /** 作者昵称（作者不存在时为 null） */
  authorNickname: string | null;
  /** 话题标题 */
  title: string;
  /** 话题内容预览（前 80 字符） */
  contentPreview: string;
  /** 话题分类：course/club/activity/study/life/alumni */
  category: string | null;
  /** 回复数 */
  replyCount: number;
  /** 浏览数 */
  viewCount: number;
  /** 是否匿名发帖 */
  isAnonymous: boolean;
  /** 话题状态：active 正常 / deleted 已删除 / hidden 已隐藏 */
  status: "active" | "deleted" | "hidden" | null;
  /** 审核状态：pending 待审核 / approved 已通过 / rejected 已拒绝 */
  auditStatus: "pending" | "approved" | "rejected" | null;
  /** 创建时间 */
  createdAt: string;
  /** 审核时间（未审核为 null） */
  auditedAt: string | null;
}

/** 校园圈话题列表查询参数 */
export interface CampusTopicListQuery {
  /** 标题/内容模糊关键字 */
  keyword?: string;
  /** 话题状态筛选：active / deleted / hidden */
  status?: "active" | "deleted" | "hidden";
  /** 校区筛选（按学校名匹配；校区管理员忽略本参数） */
  campusName?: string;
  /** 页码，1-based */
  page?: number;
  /** 每页条数 */
  pageSize?: number;
}

/**
 * 分页查询校园圈话题列表。
 * GET /api/v1/admin/forum/campus-topics
 */
export function listCampusTopics(
  query: CampusTopicListQuery = {}
): Promise<AdminPageView<CampusTopicSummary>> {
  return get<AdminPageView<CampusTopicSummary>>(
    "/v1/admin/forum/campus-topics",
    query as Record<string, unknown>
  );
}

/**
 * 审核校园圈话题（通过/拒绝；拒绝时同步将 status 置为 hidden）。
 * POST /api/v1/admin/forum/campus-topics/{id}/audit
 */
export function auditCampusTopic(
  id: number,
  req: AuditRequest
): Promise<IdSuccessResponse & { auditStatus: string }> {
  return post<IdSuccessResponse & { auditStatus: string }>(
    `/v1/admin/forum/campus-topics/${id}/audit`,
    req
  );
}

/**
 * 删除校园圈话题（软删除，status 置为 deleted）。
 * DELETE /api/v1/admin/forum/campus-topics/{id}
 */
export function deleteCampusTopic(id: number): Promise<IdSuccessResponse & { status: string }> {
  return del<IdSuccessResponse & { status: string }>(`/v1/admin/forum/campus-topics/${id}`);
}

// ============================================================
// 统一评论管理（/api/v1/admin/comments）
// ============================================================

/** 统一评论列表查询参数 */
export interface CommentListQuery {
  /** 作者用户 ID 筛选 */
  authorId?: number;
  /** 关联帖子 ID 筛选 */
  postId?: number;
  /** 页码，1-based */
  page?: number;
  /** 每页条数 */
  pageSize?: number;
}

/**
 * 分页查询评论列表（全量评论，可按作者/帖子筛选）。
 * GET /api/v1/admin/comments
 */
export function listComments(query: CommentListQuery = {}): Promise<AdminPageView<PostCommentView>> {
  return get<AdminPageView<PostCommentView>>(
    "/v1/admin/comments",
    query as Record<string, unknown>
  );
}

/**
 * 删除评论（硬删除，不可恢复）。
 * DELETE /api/v1/admin/comments/{id}
 */
export function deleteComment(id: number): Promise<IdSuccessResponse> {
  return del<IdSuccessResponse>(`/v1/admin/comments/${id}`);
}
