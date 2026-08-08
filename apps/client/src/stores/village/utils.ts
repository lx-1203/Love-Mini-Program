/**
 * Village Store 工具函数
 *
 * 集中维护村口社区相关的纯工具函数：
 * - 数据转换：mapToPostItem / mapToCommentItem / mapDetailToPostItem
 * - 安全转换：toNumber
 * - 过滤排序：filterAndSortPosts
 * - 格式化：formatRelativeTime
 * - Mock 数据：mockCategories / mockAuthors / mockPosts / mockComments
 */

import type {
  CommentAuthorView,
  CommentItem,
  CommentItemView,
  PostAuthor,
  PostAuthorView,
  PostDetailView,
  PostItem,
  PostSummaryView,
} from "./types";
import {
  CATEGORY_ALL_ID,
  CATEGORY_CAMPUS_ID,
  CATEGORY_PREFIX,
  DISCOVER_CATEGORY_ID,
  FOLLOWING_CATEGORY_ID,
  MINE_CATEGORY_ID,
  SAME_CITY_CATEGORY_ID,
} from "./constants";
// i18n 翻译函数（SubTask 3.3.3：错误回退消息 i18n 化）
import { t } from "@/i18n";
import { useSessionStore } from "../session";

/** Phase Feedback3 P2.5：搭子圈活动关键词（作者兴趣命中即视为搭子相关内容） */
const BUDDY_ACTIVITY_KEYWORDS = [
  "运动", "健身", "跑步", "读书", "摄影", "游戏", "旅行", "户外",
  "徒步", "音乐", "电影", "美食", "剧本杀", "桌游", "羽毛球", "篮球",
];

/**
 * Phase Feedback3 P2.5：判断帖子是否为搭子圈内容。
 *
 * 命中任一条件即视为搭子内容：
 * - 帖子带 buddyTags
 * - 帖子标签含「搭子」
 * - 作者兴趣标签命中搭子活动关键词（标签聚合，扩大覆盖面）
 */
export function isBuddyPost(post: Pick<PostItem, "buddyTags" | "tags" | "author">): boolean {
  return (
    (post.buddyTags && post.buddyTags.length > 0) ||
    post.tags.some((tag) => tag.includes("搭子")) ||
    (post.author.interests ?? []).some((interest) =>
      BUDDY_ACTIVITY_KEYWORDS.some((k) => interest.includes(k))
    )
  );
}

/**
 * 安全数字转换工具
 *
 * 修复：原代码直接使用 Number() 转换后端返回值，
 * 若返回字符串 "abc" 会得到 NaN，导致 sort/reduce 等行为异常。
 * 此函数在转换失败时回退到 fallback（默认 0）。
 */
export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") {
    return Number.isNaN(value) ? fallback : value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

/**
 * 将后端 PostAuthorView 映射为前端 PostAuthor
 *
 * P1-16：透传 age/city/education 三个可选展示字段（缺失时前端按缺省兜底）。
 */
export function mapAuthorView(author: PostAuthorView): PostAuthor {
  return {
    userId: String(author.userId),
    name: author.nickname,
    avatar: author.avatarUrl || "",
    headline: author.campusName || "",
    campusName: author.campusName,
    age: author.age ?? null,
    city: author.city ?? "",
    education: author.education ?? "",
  };
}

/**
 * 将后端 CommentAuthorView 映射为前端 PostAuthor
 */
export function mapCommentAuthorView(author: CommentAuthorView): PostAuthor {
  return {
    userId: String(author.userId),
    name: author.nickname,
    avatar: author.avatarUrl || "",
    headline: "",
  };
}

/**
 * 将后端 PostSummaryView 映射为前端 PostItem
 */
export function mapToPostItem(raw: PostSummaryView): PostItem {
  return {
    id: String(raw.id),
    author: mapAuthorView(raw.author),
    categoryId: raw.category,
    title: raw.title,
    content: raw.summary,
    images: [],
    tags: raw.tags,
    likes: raw.likeCount,
    comments: raw.commentCount,
    shares: raw.shareCount,
    isLiked: false, // PostSummaryView 无 isLiked 字段
    // Phase Feedback3 P2.5：后端下发 isFollowed 后透传（关注 Tab 打通），缺失回退 false
    isFollowed: raw.isFollowed ?? false,
    isShared: false, // PostSummaryView 无 isShared 字段
    isAlumni: raw.isAlumni ?? false,
    // 2026-08-08 论坛互动真实化：收藏/浏览量透传，缺失兜底
    favorites: raw.favoriteCount ?? 0,
    isFavorite: raw.isFavorite ?? false,
    views: raw.viewCount ?? 0,
    // 2026-08-08 频道化重构：置顶 / 活动关联 / 最新评论预览透传（缺失兜底）
    isPinned: raw.isPinned ?? false,
    activityId: raw.activityId != null ? String(raw.activityId) : undefined,
    activity: raw.activity ?? null,
    recentComments: Array.isArray(raw.recentComments)
      ? raw.recentComments.map((c) => ({
          id: String(c.id),
          postId: "",
          author: mapCommentAuthorView(c.author),
          content: c.content,
          likes: 0,
          isLiked: false,
          createdAt: c.createdAt,
          parentId: null,
          replyTo: null,
          replies: [],
        }))
      : [],
    createdAt: raw.createdAt,
  };
}

/**
 * 将后端 PostDetailView 映射为前端 PostItem
 */
export function mapDetailToPostItem(data: PostDetailView): PostItem {
  return {
    id: String(data.id),
    author: mapAuthorView(data.author),
    categoryId: data.category,
    title: data.title,
    content: data.content,
    images: data.images,
    tags: data.tags,
    likes: data.likeCount,
    comments: data.commentCount,
    shares: data.shareCount,
    isLiked: data.isLiked,
    // Phase Feedback3 P2.5：详情页 isFollowed 透传，缺失回退 false
    isFollowed: data.isFollowed ?? false,
    isShared: false,
    isAlumni: data.isAlumni ?? false,
    // 2026-08-08 论坛互动真实化：收藏/浏览量透传，缺失兜底
    favorites: data.favoriteCount ?? 0,
    isFavorite: data.isFavorite ?? false,
    views: data.viewCount ?? 0,
    // 2026-08-08 频道化重构：活动关联透传（详情页活动卡）
    activityId: data.activityId != null ? String(data.activityId) : undefined,
    activity: data.activity ?? null,
    createdAt: data.createdAt,
  };
}

/**
 * 将后端 CommentItemView 映射为前端 CommentItem
 *
 * P1-02 楼中楼：透传 parentId / replyTo，并递归映射 replies 子列表，
 * 保证模板可直接渲染「根评论 + 缩进子评论」的树形结构。
 */
export function mapToCommentItem(raw: CommentItemView): CommentItem {
  return {
    id: String(raw.id),
    postId: String(raw.postId),
    author: mapCommentAuthorView(raw.author),
    content: raw.content,
    likes: raw.likeCount,
    // 2026-08-08 论坛互动真实化：后端 CommentItemView 新增 isLiked 字段，透传
    isLiked: raw.isLiked ?? false,
    createdAt: raw.createdAt,
    parentId: raw.parentId != null ? String(raw.parentId) : null,
    replyTo: raw.replyTo ?? null,
    replies: Array.isArray(raw.replies) ? raw.replies.map(mapToCommentItem) : [],
  };
}

/**
 * 将后端同校动态流原始记录映射为前端 PostItem
 *
 * 由于后端 CampusFeedView.posts 类型为 Record<string, unknown>[]，
 * 需要逐条手动映射并应用安全转换。
 */
export function mapCampusFeedPost(
  raw: Record<string, unknown>
): PostItem {
  const author = (raw.author ?? {}) as Record<string, unknown>;
  return {
    id: String(raw.id ?? ""),
    author: {
      userId: String(author.userId ?? ""),
      name: String(author.nickname ?? author.name ?? ""),
      avatar: String(author.avatarUrl ?? author.avatar ?? ""),
      headline: String(author.campusName ?? author.headline ?? ""),
      campusName: String(author.campusName ?? ""),
    },
    categoryId: String(raw.category ?? raw.categoryId ?? ""),
    title: String(raw.title ?? ""),
    content: String(raw.summary ?? raw.content ?? ""),
    images: (raw.images ?? []) as string[],
    tags: (raw.tags ?? []) as string[],
    // 修复：原代码直接 Number() 转换，若后端返回字符串 "abc" 会得到 NaN，导致 sort/reduce 异常
    // 现在使用安全转换函数，NaN 时回退到 0
    likes: toNumber(raw.likeCount ?? raw.likes ?? 0),
    comments: toNumber(raw.commentCount ?? raw.comments ?? 0),
    shares: toNumber(raw.shareCount ?? raw.shares ?? 0),
    isLiked: Boolean(raw.isLiked ?? false),
    isFollowed: Boolean(raw.isFollowed ?? false),
    isShared: Boolean(raw.isShared ?? false),
    isAlumni: Boolean(raw.isAlumni ?? false),
    // 2026-08-08 论坛互动真实化：收藏/浏览量透传（同校动态流可能无，兜底 0）
    favorites: toNumber(raw.favoriteCount ?? raw.favorites ?? 0),
    isFavorite: Boolean(raw.isFavorite ?? false),
    views: toNumber(raw.viewCount ?? raw.views ?? 0),
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
  };
}

/**
 * 对帖子列表应用筛选与排序。
 *
 * 提取自 store filteredPosts getter 与 fetchPosts action 的共同逻辑，
 * 用于 mock 模式与 real 模式的列表筛选。
 *
 * 注意：本函数为纯函数，不修改原数组。
 *
 * @param posts - 待筛选的帖子列表
 * @param filters - 筛选条件（categoryId / keyword / sortBy）
 * @param myCampus - 当前用户学校名（用于 cat-campus 同校筛选，可选）
 * @returns 筛选并排序后的新数组
 */
export function filterAndSortPosts(
  posts: PostItem[],
  filters: {
    categoryId?: string;
    keyword?: string;
    sortBy?: "latest" | "hot";
    /** Phase Feedback4：同城 Tab 城市名 */
    city?: string;
    /** Phase Feedback4：发现 Tab 二级子标签 */
    discoverSub?: string;
  },
  myCampus?: string
): PostItem[] {
  let result = [...posts];

  if (filters.categoryId && filters.categoryId !== CATEGORY_ALL_ID) {
    if (filters.categoryId === CATEGORY_CAMPUS_ID) {
      // 校园分类：按同校筛选
      if (myCampus) {
        result = result.filter((post) => post.author.campusName === myCampus);
      } else {
        result = [];
      }
    } else if (filters.categoryId === FOLLOWING_CATEGORY_ID) {
      // Phase Feedback4：关注 Tab —— 展示匹配中点喜欢的人的动态（isFollowed=true）
      result = result.filter((post) => post.isFollowed);
    } else if (filters.categoryId === SAME_CITY_CATEGORY_ID) {
      // Phase Feedback4：同城 Tab —— 按城市过滤；未选城市时展示全部（兜底避免空态）
      if (filters.city) {
        result = result.filter((post) => post.city === filters.city);
      }
    } else if (filters.categoryId === DISCOVER_CATEGORY_ID) {
      // Phase Feedback4：发现 Tab —— 不按 categoryId 过滤，由 discoverSub 子标签决定
      switch (filters.discoverSub) {
        case "alumni":
          result = result.filter((post) => post.isAlumni);
          break;
        case "hometown":
          // 老乡：内容/标签含"老乡"或城市名匹配的帖子
          result = result.filter(
            (post) =>
              post.tags.some((tag) => tag.includes("老乡")) ||
              post.content.includes("老乡") ||
              post.content.includes("同乡")
          );
          break;
        case "buddy":
          // 搭子圈：带 buddyTags、标签含"搭子"、或作者兴趣命中搭子活动的帖子
          // Phase Feedback3 P2.5：补充作者兴趣标签聚合，扩大搭子内容的覆盖面
          result = result.filter(isBuddyPost);
          break;
        case "all":
        default:
          // 全部：不过滤
          break;
      }
    } else if (filters.categoryId === "cat-latest") {
      // 最新：不过滤（排序由 sortBy=latest 处理，mock 帖子无 cat-latest 分类）
      // 修复（收尾轮）：原走 else 精确匹配导致"最新"分类恒空
    } else if (filters.categoryId === MINE_CATEGORY_ID) {
      // 收尾轮：我的动态 —— 作者为当前用户（mock 下星野无帖子 → 空态引导发帖）
      try {
        const sessionStore = useSessionStore();
        const myUserId = sessionStore.userSession?.userId ?? "";
        result = myUserId ? result.filter((post) => post.author.userId === myUserId) : [];
      } catch (_e) {
        result = [];
      }
    } else {
      result = result.filter((post) => post.categoryId === filters.categoryId);
    }
  }

  if (filters.keyword) {
    const keyword = filters.keyword.toLowerCase();
    result = result.filter(
      (post) =>
        post.title.toLowerCase().includes(keyword) ||
        post.content.toLowerCase().includes(keyword)
    );
  }

  if (filters.sortBy === "hot") {
    result.sort((a, b) => b.likes - a.likes);
  } else {
    result.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  return result;
}

/**
 * 将前端分类 ID 转换为后端分类名。
 * 例如 "cat-interest" -> "interest"，"campus" -> "campus"。
 */
export function toBackendCategory(categoryId: string): string {
  if (categoryId.startsWith(CATEGORY_PREFIX)) {
    return categoryId.substring(CATEGORY_PREFIX.length);
  }
  return categoryId;
}

/**
 * 在 Mock 模式下切换帖子点赞状态（toggle 行为）。
 *
 * 抽取自 village store 的 likePost action，用于缩短原函数。
 * 同步更新列表中的帖子与当前详情页帖子（若命中）。
 *
 * @param posts - 帖子列表（in-place 修改）
 * @param currentPost - 当前详情页帖子（可选，命中时同步修改）
 * @param postId - 目标帖子 ID
 * @throws 帖子不存在时抛出 Error
 */
export function toggleMockPostLike(
  posts: PostItem[],
  currentPost: PostItem | null,
  postId: string
): void {
  const post = posts.find((p) => p.id === postId);
  if (!post) {
    throw new Error(t("storeErrors.village.postNotFound"));
  }
  post.isLiked = !post.isLiked;
  post.likes += post.isLiked ? 1 : -1;

  if (currentPost?.id === postId) {
    currentPost.isLiked = !currentPost.isLiked;
    currentPost.likes += currentPost.isLiked ? 1 : -1;
  }
}

/**
 * 保存帖子点赞的回滚快照，便于失败时恢复。
 *
 * 抽取自 village store 的 likePost action，用于缩短原函数。
 * 不修改任何状态，仅读取当前值并打包返回。
 */
export interface PostLikeSnapshot {
  prevPostIsLiked: boolean | undefined;
  prevPostLikes: number | undefined;
  prevCurrentIsLiked: boolean | undefined;
  prevCurrentLikes: number | undefined;
}

/**
 * 捕获点赞前的本地状态快照，用于失败时回滚。
 *
 * @param post - 帖子列表中命中的帖子（可选）
 * @param currentPost - 当前详情页帖子（可选，命中时一并快照）
 * @returns 状态快照
 */
export function captureLikeSnapshot(
  post: PostItem | undefined,
  currentPost: PostItem | null
): PostLikeSnapshot {
  return {
    prevPostIsLiked: post?.isLiked,
    prevPostLikes: post?.likes,
    prevCurrentIsLiked: currentPost?.isLiked,
    prevCurrentLikes: currentPost?.likes,
  };
}

/**
 * 乐观应用点赞状态（toggle 行为），返回新的 isLiked 状态。
 *
 * @param post - 帖子列表中命中的帖子（可选）
 * @param currentPost - 当前详情页帖子（可选，命中时一并更新）
 * @returns 应用后的新 isLiked 状态（用于后续 API 校正）
 */
export function applyOptimisticLike(
  post: PostItem | undefined,
  currentPost: PostItem | null
): boolean {
  let newIsLiked = false;
  if (post) {
    newIsLiked = !post.isLiked;
    post.isLiked = newIsLiked;
    post.likes = Math.max(0, post.likes + (newIsLiked ? 1 : -1));
  }
  if (currentPost) {
    newIsLiked = !currentPost.isLiked;
    currentPost.isLiked = newIsLiked;
    currentPost.likes = Math.max(
      0,
      currentPost.likes + (newIsLiked ? 1 : -1)
    );
  }
  return newIsLiked;
}

/**
 * 用后端返回的权威状态校正本地状态。
 *
 * @param post - 帖子列表中命中的帖子（可选）
 * @param currentPost - 当前详情页帖子（可选）
 * @param liked - 后端返回的点赞状态
 * @param likeCount - 后端返回的点赞数
 */
export function applyServerLikeResult(
  post: PostItem | undefined,
  currentPost: PostItem | null,
  liked: boolean,
  likeCount: number
): void {
  if (post) {
    post.isLiked = liked;
    post.likes = likeCount;
  }
  if (currentPost) {
    currentPost.isLiked = liked;
    currentPost.likes = likeCount;
  }
}

/**
 * 用快照回滚本地状态。
 *
 * @param post - 帖子列表中命中的帖子（可选）
 * @param currentPost - 当前详情页帖子（可选）
 * @param snapshot - 之前捕获的快照
 */
export function rollbackLike(
  post: PostItem | undefined,
  currentPost: PostItem | null,
  snapshot: PostLikeSnapshot
): void {
  if (post) {
    post.isLiked = snapshot.prevPostIsLiked ?? false;
    post.likes = snapshot.prevPostLikes ?? 0;
  }
  if (currentPost) {
    currentPost.isLiked = snapshot.prevCurrentIsLiked ?? false;
    currentPost.likes = snapshot.prevCurrentLikes ?? 0;
  }
}

/* ========== 2026-08-08 论坛互动真实化：收藏四件套（仿点赞 helpers） ========== */

/**
 * 在 Mock 模式下切换帖子收藏状态（toggle 行为）。
 * 同步更新列表中的帖子与当前详情页帖子（若命中）。
 *
 * @param posts - 帖子列表（in-place 修改）
 * @param currentPost - 当前详情页帖子（可选，命中时同步修改）
 * @param postId - 目标帖子 ID
 * @throws 帖子不存在时抛出 Error
 */
export function toggleMockPostFavorite(
  posts: PostItem[],
  currentPost: PostItem | null,
  postId: string
): void {
  const post = posts.find((p) => p.id === postId);
  if (!post) {
    throw new Error(t("storeErrors.village.postNotFound"));
  }
  post.isFavorite = !post.isFavorite;
  post.favorites = Math.max(0, post.favorites + (post.isFavorite ? 1 : -1));

  if (currentPost?.id === postId) {
    currentPost.isFavorite = !currentPost.isFavorite;
    currentPost.favorites = Math.max(
      0,
      currentPost.favorites + (currentPost.isFavorite ? 1 : -1)
    );
  }
}

/**
 * 保存帖子收藏的回滚快照，便于失败时恢复。
 */
export interface PostFavoriteSnapshot {
  prevPostIsFavorite: boolean | undefined;
  prevPostFavorites: number | undefined;
  prevCurrentIsFavorite: boolean | undefined;
  prevCurrentFavorites: number | undefined;
}

/**
 * 捕获收藏前的本地状态快照，用于失败时回滚。
 */
export function captureFavoriteSnapshot(
  post: PostItem | undefined,
  currentPost: PostItem | null
): PostFavoriteSnapshot {
  return {
    prevPostIsFavorite: post?.isFavorite,
    prevPostFavorites: post?.favorites,
    prevCurrentIsFavorite: currentPost?.isFavorite,
    prevCurrentFavorites: currentPost?.favorites,
  };
}

/**
 * 乐观应用收藏状态（toggle 行为），返回新的 isFavorite 状态。
 */
export function applyOptimisticFavorite(
  post: PostItem | undefined,
  currentPost: PostItem | null
): boolean {
  let newIsFavorite = false;
  if (post) {
    newIsFavorite = !post.isFavorite;
    post.isFavorite = newIsFavorite;
    post.favorites = Math.max(0, post.favorites + (newIsFavorite ? 1 : -1));
  }
  if (currentPost) {
    newIsFavorite = !currentPost.isFavorite;
    currentPost.isFavorite = newIsFavorite;
    currentPost.favorites = Math.max(
      0,
      currentPost.favorites + (newIsFavorite ? 1 : -1)
    );
  }
  return newIsFavorite;
}

/**
 * 用后端返回的权威状态校正本地收藏状态。
 */
export function applyServerFavoriteResult(
  post: PostItem | undefined,
  currentPost: PostItem | null,
  favorited: boolean,
  favoriteCount: number
): void {
  if (post) {
    post.isFavorite = favorited;
    post.favorites = favoriteCount;
  }
  if (currentPost) {
    currentPost.isFavorite = favorited;
    currentPost.favorites = favoriteCount;
  }
}

/**
 * 用快照回滚本地收藏状态。
 */
export function rollbackFavorite(
  post: PostItem | undefined,
  currentPost: PostItem | null,
  snapshot: PostFavoriteSnapshot
): void {
  if (post) {
    post.isFavorite = snapshot.prevPostIsFavorite ?? false;
    post.favorites = snapshot.prevPostFavorites ?? 0;
  }
  if (currentPost) {
    currentPost.isFavorite = snapshot.prevCurrentIsFavorite ?? false;
    currentPost.favorites = snapshot.prevCurrentFavorites ?? 0;
  }
}

/**
 * 格式化相对时间
 */
export function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = Date.parse(dateStr);
  const diff = now - then;

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "刚刚活跃";
  if (diff < hour) return `${Math.floor(diff / minute)}分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)}小时前`;
  return `${Math.floor(diff / day)}天前`;
}

