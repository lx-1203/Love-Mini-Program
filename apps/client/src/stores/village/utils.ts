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
  ActivitySummaryView,
  CommentAuthorView,
  CommentItem,
  CommentItemView,
  PostAuthor,
  PostAuthorView,
  PostDetailView,
  PostItem,
  PostSummaryView,
  // 修复 no-duplicate-imports：合并 ./types 的重复 import
  PostCategory,
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

/* ========== Mock 数据 ========== */

// 修复 no-duplicate-imports：PostCategory 已在文件顶部导入，此处删除重复 import

/** Mock 分类列表 */
export const mockCategories: PostCategory[] = [
  { id: "cat-all", name: "全部", icon: "grid" },
  { id: "cat-interest", name: "兴趣圈", icon: "heart" },
  { id: "cat-sincere", name: "诚意帖", icon: "star" },
  { id: "cat-hometown", name: "同乡", icon: "location" },
  { id: "cat-campus", name: "校园", icon: "school" },
  { id: "cat-latest", name: "最新", icon: "time" },
];

/** 我的动态分类（收尾轮：内部目标分类，不出现在 Tab 栏） */
export const mockMineCategory: PostCategory = {
  id: "cat-mine",
  name: "我的",
  icon: "user",
};

/**
 * Mock 作者列表
 *
 * 修复（严格模式 noUncheckedIndexedAccess）：原声明为 PostAuthor[]，索引访问会返回 PostAuthor | undefined，
 * 导致 mockPosts / mockComments 中 `author: mockAuthors[N]` 报 TS2322。
 * 改为显式 5 元素元组类型，索引访问 mockAuthors[0..4] 将返回确定的 PostAuthor，无需非空断言。
 */
export const mockAuthors: [PostAuthor, PostAuthor, PostAuthor, PostAuthor, PostAuthor, PostAuthor, PostAuthor, PostAuthor, PostAuthor, PostAuthor, PostAuthor, PostAuthor, PostAuthor, PostAuthor, PostAuthor] = [
  {
    userId: "user-3001",
    name: "小鹿",
    avatar: "/static/assets/images/avatars/avatar-13.jpg",
    headline: "94年 · 北京 · 年薪30w+ · 985硕士",
    campusName: "北京大学",
    interests: ["阅读", "旅行", "志愿者"],
  },
  {
    userId: "user-3002",
    name: "阿泽",
    avatar: "/static/assets/images/avatars/avatar-14.jpg",
    headline: "96年 · 上海 · 互联网大厂 · 本科",
    campusName: "复旦大学",
    interests: ["徒步", "户外", "摄影"],
  },
  {
    userId: "user-3003",
    name: "橙子",
    avatar: "/static/assets/images/avatars/avatar-15.jpg",
    headline: "95年 · 杭州 · 设计师 · 硕士",
    campusName: "浙江大学",
    interests: ["设计", "美食", "旅行"],
  },
  {
    userId: "user-3004",
    name: "南风",
    avatar: "/static/assets/images/avatars/avatar-16.jpg",
    headline: "97年 · 深圳 · 产品经理 · 本科",
    campusName: "北京大学",
    interests: ["产品", "运动", "音乐"],
  },
  {
    userId: "user-3005",
    name: "北岛",
    avatar: "/static/assets/images/avatars/avatar-17.jpg",
    headline: "93年 · 成都 · 创业者 · 博士",
    campusName: "四川大学",
    interests: ["创业", "摄影", "读书"],
  },
  {
    userId: "user-3006",
    name: "苏晴",
    avatar: "/static/assets/images/avatars/avatar-18.jpg",
    headline: "95年 · 广州 · 摄影师 · 本科",
    campusName: "中山大学",
    interests: ["摄影", "旅行", "音乐"],
  },
  {
    userId: "user-3007",
    name: "周沐",
    avatar: "/static/assets/images/avatars/avatar-19.jpg",
    headline: "96年 · 南京 · 教师 · 硕士",
    campusName: "南京大学",
    interests: ["教育", "阅读", "手工"],
  },
  {
    userId: "user-3008",
    name: "许诺",
    avatar: "/static/assets/images/avatars/avatar-20.jpg",
    headline: "97年 · 武汉 · 工程师 · 本科",
    campusName: "武汉大学",
    interests: ["编程", "桌游", "健身"],
  },
  {
    userId: "user-3009",
    name: "林安",
    avatar: "/static/assets/images/avatars/avatar-21.jpg",
    headline: "94年 · 西安 · 医生 · 博士",
    campusName: "西安交通大学",
    interests: ["医学", "跑步", "咖啡"],
  },
  {
    userId: "user-3010",
    name: "叶青",
    avatar: "/static/assets/images/avatars/avatar-22.jpg",
    headline: "95年 · 苏州 · 律师 · 硕士",
    campusName: "中国人民大学",
    interests: ["法律", "辩论", "旅行"],
  },
  {
    userId: "user-3011",
    name: "夏言",
    avatar: "/static/assets/images/avatars/avatar-23.jpg",
    headline: "96年 · 厦门 · 自媒体 · 本科",
    campusName: "厦门大学",
    interests: ["写作", "美食", "电影"],
  },
  {
    userId: "user-3012",
    name: "顾北",
    avatar: "/static/assets/images/avatars/avatar-24.jpg",
    headline: "93年 · 青岛 · 建筑师 · 硕士",
    campusName: "天津大学",
    interests: ["建筑", "手绘", "旅行"],
  },
  {
    userId: "user-3013",
    name: "沈念",
    avatar: "/static/assets/images/avatars/avatar-25.jpg",
    headline: "95年 · 长沙 · 运营 · 本科",
    campusName: "中南大学",
    interests: ["运营", "瑜伽", "宠物"],
  },
  {
    userId: "user-3014",
    name: "白鹭",
    avatar: "/static/assets/images/avatars/avatar-26.jpg",
    headline: "97年 · 大连 · 教师 · 硕士",
    campusName: "大连理工大学",
    interests: ["教育", "钢琴", "烘焙"],
  },
  {
    userId: "user-3015",
    name: "季风",
    avatar: "/static/assets/images/avatars/avatar-27.jpg",
    headline: "94年 · 重庆 · 产品设计 · 本科",
    campusName: "重庆大学",
    interests: ["设计", "桌游", "火锅"],
  },
];

/* ========== 2026-08-08 频道化重构：Mock 活动摘要（帖子活动卡内嵌用） ========== */

/**
 * Mock 活动摘要列表（与后端 MockVillageService 的 activity 数据对齐：
 * 201 电影社线下碰面 / 202 周末篮球友谊赛）。
 */
export const mockActivities: ActivitySummaryView[] = [
  {
    id: 201,
    title: "电影社线下碰面",
    location: "影像楼 B 厅",
    scheduleText: "周五 19:00",
    activityDate: "2026-08-09",
    status: "upcoming",
    enrollmentCount: 23,
    coverImage: "/static/assets/images/posts/post-2.jpg",
  },
  {
    id: 202,
    title: "周末篮球友谊赛",
    location: "东区篮球场",
    scheduleText: "周六 15:00",
    activityDate: "2026-08-10",
    status: "upcoming",
    enrollmentCount: 12,
    coverImage: "",
  },
];

/** Mock 帖子列表 */
/**
 * Mock 帖子原始数据（2026-08-08 论坛互动真实化：收藏/浏览量字段由
 * {@link mockPosts} 归一化派生，避免逐条维护 30 条重复字段）。
 */
const mockPostsRaw: Array<
  Omit<PostItem, "favorites" | "isFavorite" | "views">
> = [
  {
    id: "post-1",
    author: mockAuthors[0],
    categoryId: "cat-sincere",
    title: "",
    content:
      "认真征友，希望能遇到那个对的人。平时喜欢看书、旅行，周末会去做志愿者。期待一段双向奔赴的感情。",
    images: [],
    tags: ["#这是一条520交友启事", "#诚意征友"],
    likes: 128,
    comments: 32,
    shares: 15,
    isLiked: false,
    isFollowed: false,
    isShared: false,
    isAlumni: false,
    city: "南京",
    buddyTags: ["读书搭子"],
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: "post-2",
    author: mockAuthors[1],
    categoryId: "cat-interest",
    title: "",
    content:
      "周末有一起去徒步的吗？计划去西湖周边走一圈，大概15公里，新手友好路线。已经有3个人了，再来2个就出发！",
    images: [],
    tags: ["#周末徒步", "#西湖", "#户外"],
    likes: 45,
    comments: 18,
    shares: 8,
    isLiked: true,
    isFollowed: true,
    isShared: true,
    isAlumni: true,
    city: "杭州",
    buddyTags: ["运动搭子"],
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: "post-3",
    author: mockAuthors[2],
    categoryId: "cat-hometown",
    title: "",
    content:
      "在杭州的四川老乡集合啦！想建一个老乡群，周末可以一起约火锅、打麻将。身在异乡，老乡最亲~",
    images: [],
    tags: ["#四川老乡", "#杭州", "#火锅"],
    likes: 89,
    comments: 56,
    shares: 23,
    isLiked: false,
    isFollowed: false,
    isShared: false,
    isAlumni: false,
    city: "南京",
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: "post-4",
    author: mockAuthors[3],
    categoryId: "cat-mask",
    title: "",
    content:
      "【蒙面话题】你们觉得相亲时最看重对方什么？我先说：三观一致最重要，颜值其次。",
    images: [],
    tags: ["#蒙面话题", "#相亲", "#三观"],
    likes: 234,
    comments: 89,
    shares: 42,
    isLiked: false,
    isFollowed: false,
    isShared: false,
    isAlumni: false,
    city: "上海",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "post-5",
    author: mockAuthors[4],
    categoryId: "cat-sincere",
    title: "",
    content:
      "创业第三年，公司步入正轨，终于有时间考虑个人问题了。喜欢运动、摄影，希望找一个能一起成长的伴侣。",
    images: [],
    tags: ["#创业", "#征友", "#摄影"],
    likes: 167,
    comments: 43,
    shares: 19,
    isLiked: true,
    isFollowed: false,
    isShared: false,
    isAlumni: false,
    city: "成都",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: "post-6",
    author: mockAuthors[0],
    categoryId: "cat-interest",
    title: "",
    content:
      "分享最近读的一本书《亲密关系》，里面讲到沟通的重要性，推荐给正在恋爱中的朋友们。",
    images: [],
    tags: ["#读书分享", "#亲密关系"],
    likes: 67,
    comments: 12,
    shares: 6,
    isLiked: false,
    isFollowed: true,
    isShared: false,
    isAlumni: true,
    city: "南京",
    buddyTags: ["读书搭子"],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
  {
    id: "post-7",
    author: mockAuthors[0],
    categoryId: "cat-sincere",
    title: "",
    content:
      "周末去爬山，山顶的日落太治愈了，有一起的朋友吗？",
    images: ["/static/assets/images/posts/post-1.jpg"],
    tags: ['#爬山', '#周末活动'],
    likes: 20,
    comments: 3,
    shares: 1,
    isLiked: true,
    isFollowed: true,
    isShared: false,
    isAlumni: false,
    city: "北京",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(),
  },
  {
    id: "post-8",
    author: mockAuthors[1],
    categoryId: "cat-sincere",
    title: "",
    content:
      "刚看完《长安三万里》，李白的一生太浪漫了，推荐！",
    images: ["/static/assets/images/posts/post-2.jpg"],
    tags: ['#电影', '#分享'],
    likes: 27,
    comments: 6,
    shares: 3,
    isLiked: false,
    isFollowed: false,
    isShared: false,
    isAlumni: true,
    city: "上海",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
  },
  {
    id: "post-9",
    author: mockAuthors[2],
    categoryId: "cat-sincere",
    title: "",
    content:
      "想找个人一起学做咖啡，拉花入门中，进度缓慢但快乐～",
    images: ["/static/assets/images/posts/post-3.jpg"],
    tags: ['#咖啡', '#兴趣'],
    likes: 34,
    comments: 9,
    shares: 5,
    isLiked: false,
    isFollowed: false,
    isShared: false,
    isAlumni: false,
    city: "杭州",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 7).toISOString(),
  },
  {
    id: "post-10",
    author: mockAuthors[3],
    categoryId: "cat-interest",
    title: "",
    content:
      "分享我的旅行清单：想去冰岛看极光，攒钱中！",
    images: ["/static/assets/images/posts/post-4.jpg"],
    tags: ['#校园日常', '#图书馆'],
    likes: 41,
    comments: 12,
    shares: 7,
    isLiked: true,
    isFollowed: false,
    isShared: false,
    isAlumni: false,
    city: "广州",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
  },
  {
    id: "post-11",
    author: mockAuthors[4],
    categoryId: "cat-sincere",
    title: "",
    content:
      "第一次尝试露营，星空下的北京近郊太美了。",
    images: ["/static/assets/images/posts/post-5.jpg"],
    tags: ['#露营', '#户外'],
    likes: 48,
    comments: 15,
    shares: 9,
    isLiked: false,
    isFollowed: false,
    isShared: false,
    isAlumni: false,
    city: "深圳",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 13).toISOString(),
  },
  {
    id: "post-12",
    author: mockAuthors[5],
    categoryId: "cat-sincere",
    title: "",
    content:
      "养了一只英短，叫年糕，每天回家都治愈一天的疲惫。",
    images: ["/static/assets/images/posts/post-6.jpg"],
    tags: ['#宠物', '#日常'],
    likes: 55,
    comments: 18,
    shares: 11,
    isLiked: false,
    isFollowed: true,
    isShared: false,
    isAlumni: true,
    city: "成都",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 16).toISOString(),
  },
  {
    id: "post-13",
    author: mockAuthors[6],
    categoryId: "cat-sincere",
    title: "",
    content:
      "健身第三个月，终于能看到一点线条了，坚持就是胜利！",
    images: [],
    tags: ['#健身', '#打卡'],
    likes: 62,
    comments: 21,
    shares: 1,
    isLiked: true,
    isFollowed: false,
    isShared: false,
    isAlumni: false,
    city: "南京",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 19).toISOString(),
  },
  {
    id: "post-14",
    author: mockAuthors[7],
    categoryId: "cat-interest",
    title: "",
    content:
      "MBTI测试分享：我是INFJ，有一样的吗？",
    images: [],
    tags: ['#城市生活', '#慢生活'],
    likes: 69,
    comments: 24,
    shares: 3,
    isLiked: false,
    isFollowed: false,
    isShared: false,
    isAlumni: false,
    city: "武汉",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
  },
  {
    id: "post-15",
    author: mockAuthors[8],
    categoryId: "cat-sincere",
    title: "",
    content:
      "周末羽毛球局缺人，有没有组队的朋友？",
    images: ["/static/assets/images/posts/post-1.jpg"],
    tags: ['#运动', '#球局'],
    likes: 76,
    comments: 27,
    shares: 5,
    isLiked: false,
    isFollowed: false,
    isShared: false,
    isAlumni: false,
    city: "西安",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString(),
  },
  {
    id: "post-16",
    author: mockAuthors[9],
    categoryId: "cat-sincere",
    title: "",
    content:
      "雨天宅家，泡杯茶看看书，难得的悠闲时光。",
    images: ["/static/assets/images/posts/post-2.jpg"],
    tags: ['#雨天', '#阅读'],
    likes: 83,
    comments: 30,
    shares: 7,
    isLiked: true,
    isFollowed: false,
    isShared: false,
    isAlumni: true,
    city: "苏州",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
  },
  {
    id: "post-17",
    author: mockAuthors[10],
    categoryId: "cat-sincere",
    title: "",
    content:
      "辞职后gap三个月，计划走遍中国西部，有人同行吗？",
    images: ["/static/assets/images/posts/post-3.jpg"],
    tags: ['#旅行', '#辞职gap'],
    likes: 90,
    comments: 3,
    shares: 9,
    isLiked: false,
    isFollowed: true,
    isShared: false,
    isAlumni: false,
    city: "厦门",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 31).toISOString(),
  },
  {
    id: "post-18",
    author: mockAuthors[11],
    categoryId: "cat-interest",
    title: "",
    content:
      "有没有喜欢逛博物馆的朋友？周末组个局？",
    images: ["/static/assets/images/posts/post-4.jpg"],
    tags: ['#手作', '#陶艺'],
    likes: 97,
    comments: 6,
    shares: 11,
    isLiked: false,
    isFollowed: false,
    isShared: false,
    isAlumni: false,
    city: "青岛",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 34).toISOString(),
  },
  {
    id: "post-19",
    author: mockAuthors[12],
    categoryId: "cat-sincere",
    title: "",
    content:
      "深夜放毒：亲手做的红烧肉，肥而不腻，绝了！",
    images: ["/static/assets/images/posts/post-5.jpg"],
    tags: ['#美食', '#深夜食堂'],
    likes: 104,
    comments: 9,
    shares: 1,
    isLiked: true,
    isFollowed: false,
    isShared: false,
    isAlumni: false,
    city: "长沙",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 37).toISOString(),
  },
  {
    id: "post-20",
    author: mockAuthors[13],
    categoryId: "cat-sincere",
    title: "",
    content:
      "想找语伴练英语口语，每周两次线上，有人吗？",
    images: ["/static/assets/images/posts/post-6.jpg"],
    tags: ['#学习', '#英语'],
    likes: 111,
    comments: 12,
    shares: 3,
    isLiked: false,
    isFollowed: false,
    isShared: false,
    isAlumni: true,
    city: "大连",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 40).toISOString(),
  },
  {
    id: "post-21",
    author: mockAuthors[14],
    categoryId: "cat-sincere",
    title: "",
    content:
      "滑雪初体验！摔了十几次终于会刹车了，明年再战。",
    images: [],
    tags: ['#滑雪', '#冬天'],
    likes: 118,
    comments: 15,
    shares: 5,
    isLiked: false,
    isFollowed: false,
    isShared: false,
    isAlumni: false,
    city: "重庆",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 43).toISOString(),
  },
  {
    id: "post-22",
    author: mockAuthors[0],
    categoryId: "cat-interest",
    title: "",
    content:
      "分享我的旅行清单：想去冰岛看极光，攒钱中！",
    images: [],
    tags: ['#摄影', '#生活记录'],
    likes: 125,
    comments: 18,
    shares: 7,
    isLiked: true,
    isFollowed: true,
    isShared: false,
    isAlumni: false,
    city: "北京",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 46).toISOString(),
  },
  {
    id: "post-23",
    author: mockAuthors[1],
    categoryId: "cat-sincere",
    title: "",
    content:
      "加班到深夜，楼下便利店的热豆浆是唯一的慰藉。",
    images: ["/static/assets/images/posts/post-1.jpg"],
    tags: ['#加班', '#打工日常'],
    likes: 132,
    comments: 21,
    shares: 9,
    isLiked: false,
    isFollowed: false,
    isShared: false,
    isAlumni: false,
    city: "上海",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 49).toISOString(),
  },
  {
    id: "post-24",
    author: mockAuthors[2],
    categoryId: "cat-sincere",
    title: "",
    content:
      "春天来了，想找个人一起看樱花，武汉的樱花开好了。",
    images: ["/static/assets/images/posts/post-2.jpg"],
    tags: ['#春天', '#樱花'],
    likes: 139,
    comments: 24,
    shares: 11,
    isLiked: false,
    isFollowed: false,
    isShared: false,
    isAlumni: true,
    city: "杭州",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 52).toISOString(),
  },
  {
    id: "post-25",
    author: mockAuthors[3],
    categoryId: "cat-sincere",
    title: "",
    content:
      "学了三个月吉他，终于能弹完整一首《晴天》了！",
    images: ["/static/assets/images/posts/post-3.jpg"],
    tags: ['#吉他', '#音乐'],
    likes: 146,
    comments: 27,
    shares: 1,
    isLiked: true,
    isFollowed: false,
    isShared: false,
    isAlumni: false,
    city: "广州",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 55).toISOString(),
  },
  {
    id: "post-26",
    author: mockAuthors[4],
    categoryId: "cat-interest",
    title: "",
    content:
      "MBTI测试分享：我是INFJ，有一样的吗？",
    images: ["/static/assets/images/posts/post-4.jpg"],
    tags: ['#童年', '#回忆'],
    likes: 153,
    comments: 30,
    shares: 3,
    isLiked: false,
    isFollowed: false,
    isShared: false,
    isAlumni: false,
    city: "深圳",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 58).toISOString(),
  },
  {
    id: "post-27",
    author: mockAuthors[5],
    categoryId: "cat-sincere",
    title: "",
    content:
      "跑步第100天打卡！从3公里到10公里，变化看得见。",
    images: ["/static/assets/images/posts/post-5.jpg"],
    tags: ['#跑步', '#坚持'],
    likes: 160,
    comments: 3,
    shares: 5,
    isLiked: false,
    isFollowed: true,
    isShared: false,
    isAlumni: false,
    city: "成都",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 61).toISOString(),
  },
  {
    id: "post-28",
    author: mockAuthors[6],
    categoryId: "cat-sincere",
    title: "",
    content:
      "最近在研究咖啡手冲，喜欢的朋友可以交流下～",
    images: ["/static/assets/images/posts/post-6.jpg"],
    tags: ['#咖啡', '#手冲'],
    likes: 167,
    comments: 6,
    shares: 7,
    isLiked: true,
    isFollowed: false,
    isShared: false,
    isAlumni: true,
    city: "南京",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 64).toISOString(),
  },
  {
    id: "post-29",
    author: mockAuthors[7],
    categoryId: "cat-sincere",
    title: "",
    content:
      "周末去看展，遇见一幅很喜欢的画，忍不住拍下来。",
    images: [],
    tags: ['#看展', '#艺术'],
    likes: 24,
    comments: 9,
    shares: 9,
    isLiked: false,
    isFollowed: false,
    isShared: false,
    isAlumni: false,
    city: "武汉",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 67).toISOString(),
  },
  {
    id: "post-30",
    author: mockAuthors[8],
    categoryId: "cat-interest",
    title: "",
    content:
      "有没有喜欢逛博物馆的朋友？周末组个局？",
    images: [],
    tags: ['#火锅', '#美食'],
    likes: 31,
    comments: 12,
    shares: 11,
    isLiked: false,
    isFollowed: false,
    isShared: false,
    isAlumni: false,
    city: "西安",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 70).toISOString(),
  },
  /* ========== 2026-08-08 频道化重构：今日演示帖（置顶 / 活动关联 / 校园） ========== */
  {
    id: "post-31",
    author: mockAuthors[0],
    categoryId: "cat-interest",
    title: "本周圈子公告：七夕主题活动预告",
    content:
      "本周六晚 7 点，校园东区草坪将举办「七夕星光主题趴」：露天电影、心动配对、荧光手环，现场还有小礼物～心动就来发帖报名，名额有限先到先得！",
    images: [],
    tags: ["#圈子公告", "#七夕活动"],
    likes: 56,
    comments: 18,
    shares: 9,
    isLiked: false,
    isFollowed: false,
    isShared: false,
    isAlumni: false,
    isPinned: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
  },
  {
    id: "post-32",
    author: mockAuthors[1],
    categoryId: "cat-activity",
    title: "今晚电影社放映《你的名字》，现场报名 ing！",
    content:
      "周五 19:00 影像楼 B 厅放映《你的名字》，映后自由讨论，免费入场！已报名 23 人，活动链接点卡片直达～",
    images: ["/static/assets/images/posts/post-2.jpg"],
    tags: ["#电影", "#活动"],
    likes: 42,
    comments: 11,
    shares: 6,
    isLiked: false,
    isFollowed: false,
    isShared: false,
    isAlumni: false,
    activityId: "201",
    activity: mockActivities[0],
    recentComments: [
      {
        id: "comment-31",
        postId: "post-32",
        author: mockAuthors[2],
        content: "带我一个！正好周末没安排",
        likes: 2,
        isLiked: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: "post-33",
    author: mockAuthors[3],
    categoryId: "cat-campus",
    title: "图书馆四楼新增自习区，环境超棒！",
    content:
      "今天去图书馆发现四楼新开了自习区，每个座位都有插座和台灯，还有独立隔板，学习效率直接拉满，推荐给同校的同学们！",
    images: ["/static/assets/images/posts/post-1.jpg"],
    tags: ["#校园日常", "#图书馆"],
    likes: 35,
    comments: 9,
    shares: 4,
    isLiked: false,
    isFollowed: false,
    isShared: false,
    isAlumni: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
];

/**
 * Mock 帖子列表（2026-08-08 论坛互动真实化）：
 * 收藏数/浏览量派生自点赞数；post-1 / post-4 预置收藏态便于演示初始状态。
 */
export const mockPosts: PostItem[] = mockPostsRaw.map((p) => ({
  ...p,
  favorites: Math.floor(p.likes / 3),
  views: p.likes * 10,
  isFavorite: p.id === "post-1" || p.id === "post-4",
}));

/**
 * Mock 帖子浏览历史（2026-08-08 论坛互动真实化）：取前 6 条，浏览时间错开。
 */
export const mockPostHistory: { post: PostItem; viewedAt: string }[] =
  mockPosts.slice(0, 6).map((p, i) => ({
    post: p,
    viewedAt: new Date(
      Date.now() - 1000 * 60 * 60 * (i * 3 + 1)
    ).toISOString(),
  }));

/** Mock 评论列表 */
export const mockComments: CommentItem[] = [
  {
    id: "comment-1",
    postId: "post-1",
    author: mockAuthors[1],
    content: "同在北京，可以认识一下吗？",
    likes: 6,
    isLiked: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
  },
  {
    id: "comment-2",
    postId: "post-1",
    author: mockAuthors[2],
    content: "志愿者活动是在哪里做的呀？",
    likes: 3,
    isLiked: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
  },
  {
    id: "comment-3",
    postId: "post-4",
    author: mockAuthors[0],
    content: "完全同意！三观不合真的很难走下去。",
    likes: 12,
    isLiked: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: "comment-4",
    postId: "post-4",
    author: mockAuthors[4],
    content: "我觉得人品和责任心也很重要。",
    likes: 8,
    isLiked: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
];

// 2026-08-08 论坛互动真实化：mock 评论覆盖全部 mock 帖子
// （修复 mock 模式下大部分帖子评论区为空——原 mockComments 只覆盖 post-1/post-2/post-4）
const mockCommentSeed = [
  "支持一下楼主！",
  "说得很有道理",
  "学到了，感谢分享",
  "路过帮顶",
  "同感+1",
];
mockPosts.slice(4).forEach((p, i) => {
  const author = mockAuthors[i % mockAuthors.length];
  if (!author) return; // 防御：mockAuthors 池意外为空时跳过
  mockComments.push({
    id: `comment-mock-${i + 1}`,
    postId: p.id,
    author,
    content: mockCommentSeed[i % mockCommentSeed.length] ?? "支持一下楼主！",
    likes: (i * 3) % 9,
    isLiked: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * (i + 1)).toISOString(),
  });
});
