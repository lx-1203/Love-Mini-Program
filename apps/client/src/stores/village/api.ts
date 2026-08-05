/**
 * Village Store API 调用函数
 *
 * 集中封装村口社区相关的所有后端 API 调用。
 * 每个 API 函数均为纯调用，不依赖 store 状态，返回值由 store action 处理。
 *
 * 端点说明：
 * - GET  /api/posts                       - 获取帖子列表
 * - POST /api/posts                        - 创建帖子
 * - GET  /api/posts/{postId}               - 获取帖子详情
 * - POST /api/posts/{postId}/like          - 点赞/取消点赞
 * - POST /api/posts/{postId}/share         - 转发帖子
 * - GET  /api/posts/{postId}/comments      - 获取帖子评论
 * - POST /api/posts/{postId}/comments      - 创建评论
 * - POST /api/posts/comments/{commentId}/like - 点赞评论
 * - POST /api/users/{userId}/follow        - 关注/取消关注用户
 * - GET  /api/campus/feed                  - 获取同校动态流
 * - GET  /api/posts/{postId}/similar-authors - 获取相似作者推荐
 */

import { request } from "../../services/http";
import { PAGE_SIZE } from "./constants";
import { toBackendCategory } from "./utils";
import type {
  CommentItemView,
  CommentListResponse,
  PostDetailView,
  PostLikeResponse,
  PostListResponse,
  ShareView,
  SimilarAuthor,
  // 修复 no-duplicate-imports：合并 ./types 的重复 import
  PostFilters,
} from "./types";
import type { CampusFeedView } from "../../services/generated/api-types-supplement";

/**
 * 构建帖子列表请求参数对象。
 *
 * 将前端 PostFilters 转换为后端 query string 参数：
 * - categoryId（去掉 cat- 前缀） -> category
 * - keyword -> tag
 * - sortBy -> sortBy
 * - userId（仅校园分类时附带） -> userId
 * - page / pageSize -> page / pageSize
 *
 * @param filters - 前端筛选条件
 * @param currentPage - 当前页码（从 1 开始）
 * @returns 后端 query 参数对象（key -> value 字符串）
 */
export function buildPostListParams(
  filters: PostFilters | undefined,
  currentPage: number
): Record<string, string> {
  const params: Record<string, string> = {};

  if (filters?.categoryId && filters.categoryId !== "cat-all") {
    params.category = toBackendCategory(filters.categoryId);
  }
  if (filters?.keyword) {
    params.tag = filters.keyword;
  }
  // Phase Feedback4：同城 Tab 城市参数
  if (filters?.city) {
    params.city = filters.city;
  }
  // Phase Feedback4：发现 Tab 二级子标签参数
  if (filters?.discoverSub && filters.discoverSub !== "all") {
    params.discoverSub = filters.discoverSub;
  }
  if (filters?.sortBy) {
    params.sortBy = filters.sortBy;
  }
  // 校园分类需要传 userId
  if (filters?.userId && filters.categoryId === "cat-campus") {
    params.userId = filters.userId;
  }
  params.page = String(currentPage);
  params.pageSize = String(PAGE_SIZE);

  return params;
}

/**
 * 获取帖子列表
 *
 * @param filters - 筛选条件
 * @param currentPage - 当前页码
 * @param signal - 可选的 AbortSignal，用于取消请求
 * @returns 后端 PostListResponse
 */
export async function fetchPostsApi(
  filters: PostFilters | undefined,
  currentPage: number,
  signal?: AbortSignal
): Promise<PostListResponse> {
  const params = buildPostListParams(filters, currentPage);
  return request<PostListResponse>({
    url: `/posts?${new URLSearchParams(params).toString()}`,
    method: "GET",
    signal,
  });
}

/**
 * 创建新帖子
 *
 * @param data - 帖子数据（categoryId 已转换为后端 category）
 * @returns 后端 PostDetailView
 */
export async function createPostApi(data: {
  category: string;
  title: string;
  content: string;
  images: string[];
  tags: string[];
}): Promise<PostDetailView> {
  return request<PostDetailView, {
    title: string;
    content: string;
    category: string;
    tags: string[];
    images: string[];
  }>({
    url: "/posts",
    method: "POST",
    data: {
      title: data.title || "",
      content: data.content,
      category: data.category,
      tags: data.tags,
      images: data.images,
    },
  });
}

/**
 * 获取帖子详情
 *
 * @param postId - 帖子 ID
 * @returns 后端 PostDetailView
 */
export async function fetchPostDetailApi(
  postId: string
): Promise<PostDetailView> {
  return request<PostDetailView>({
    url: `/posts/${postId}`,
    method: "GET",
  });
}

/**
 * 点赞/取消点赞帖子
 *
 * @param postId - 帖子 ID
 * @returns 后端 PostLikeResponse（包含权威 liked 与 likeCount）
 */
export async function likePostApi(
  postId: string
): Promise<PostLikeResponse> {
  return request<PostLikeResponse>({
    url: `/posts/${postId}/like`,
    method: "POST",
  });
}

/**
 * 转发帖子
 *
 * @param postId - 帖子 ID
 * @param comment - 附加评论（可选，无则传空字符串）
 * @returns 后端 ShareView
 */
export async function sharePostApi(
  postId: string,
  comment?: string
): Promise<ShareView> {
  return request<ShareView>({
    url: `/posts/${postId}/share`,
    method: "POST",
    data: comment ? { comment } : { comment: "" },
  });
}

/**
 * 获取帖子评论列表
 *
 * @param postId - 帖子 ID
 * @returns 后端 CommentListResponse
 */
export async function fetchCommentsApi(
  postId: string
): Promise<CommentListResponse> {
  return request<CommentListResponse>({
    url: `/posts/${postId}/comments`,
    method: "GET",
  });
}

/**
 * 创建评论
 *
 * @param postId - 帖子 ID
 * @param content - 评论内容
 * @returns 后端 CommentItemView
 */
export async function createCommentApi(
  postId: string,
  content: string
): Promise<CommentItemView> {
  return request<CommentItemView, { content: string }>({
    url: `/posts/${postId}/comments`,
    method: "POST",
    data: { content },
  });
}

/**
 * 点赞评论（toggle 行为，由后端控制状态）
 *
 * @param commentId - 评论 ID
 */
export async function likeCommentApi(
  commentId: string
): Promise<void> {
  await request<void>({
    url: `/posts/comments/${commentId}/like`,
    method: "POST",
  });
}

/**
 * 关注/取消关注用户
 *
 * 根据 isFollow 决定调用 POST 还是 DELETE。
 *
 * @param targetUserId - 被关注用户 ID
 * @param currentUserId - 当前操作用户 ID（作为 query 参数）
 * @param isFollow - true 表示关注，false 表示取消关注
 */
export async function followUserApi(
  targetUserId: string,
  currentUserId: string,
  isFollow: boolean
): Promise<void> {
  await request<void>({
    url: `/users/${targetUserId}/follow?userId=${currentUserId}`,
    method: isFollow ? "POST" : "DELETE",
  });
}

/**
 * 获取同校动态流
 *
 * 泛型 T 约束为 CampusFeedView 的子类型，调用方必须传入与后端 CampusFeedView
 * 结构兼容的类型，避免传入任意不相关类型导致类型不安全。
 *
 * @param userId - 当前用户 ID
 * @returns 后端 CampusFeedView
 */
export async function fetchCampusFeedApi<T extends CampusFeedView>(
  userId: string
): Promise<T> {
  return request<T>({
    url: `/campus/feed?userId=${userId}`,
    method: "GET",
  });
}

/**
 * 获取相似作者推荐
 *
 * @param postId - 帖子 ID
 * @param userId - 当前用户 ID
 * @returns 包含 authors 字段的对象
 */
export async function fetchSimilarAuthorsApi(
  postId: string,
  userId: string
): Promise<{ authors: SimilarAuthor[] }> {
  return request<{ authors: SimilarAuthor[] }>({
    url: `/posts/${postId}/similar-authors?userId=${userId}`,
    method: "GET",
  });
}
