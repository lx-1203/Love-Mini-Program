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
  // 修复 no-duplicate-imports：合并 ./types 的重复 import
  PostCategory,
} from "./types";
import {
  CATEGORY_ALL_ID,
  CATEGORY_CAMPUS_ID,
  CATEGORY_PREFIX,
  DISCOVER_CATEGORY_ID,
  FOLLOWING_CATEGORY_ID,
  SAME_CITY_CATEGORY_ID,
} from "./constants";
// i18n 翻译函数（SubTask 3.3.3：错误回退消息 i18n 化）
import { t } from "@/i18n";

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
 */
export function mapAuthorView(author: PostAuthorView): PostAuthor {
  return {
    userId: String(author.userId),
    name: author.nickname,
    avatar: author.avatarUrl || "",
    headline: author.campusName || "",
    campusName: author.campusName,
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
    isFollowed: false, // PostSummaryView 无 isFollowed 字段
    isShared: false, // PostSummaryView 无 isShared 字段
    isAlumni: raw.isAlumni ?? false,
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
    isFollowed: false,
    isShared: false,
    isAlumni: data.isAlumni ?? false,
    createdAt: data.createdAt,
  };
}

/**
 * 将后端 CommentItemView 映射为前端 CommentItem
 */
export function mapToCommentItem(raw: CommentItemView): CommentItem {
  return {
    id: String(raw.id),
    postId: String(raw.postId),
    author: mapCommentAuthorView(raw.author),
    content: raw.content,
    likes: raw.likeCount,
    isLiked: false, // CommentItemView 无 isLiked 字段
    createdAt: raw.createdAt,
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
          // 搭子圈：带 buddyTags 或标签含"搭子"的帖子
          result = result.filter(
            (post) =>
              (post.buddyTags && post.buddyTags.length > 0) ||
              post.tags.some((tag) => tag.includes("搭子"))
          );
          break;
        case "all":
        default:
          // 全部：不过滤
          break;
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

/**
 * Mock 作者列表
 *
 * 修复（严格模式 noUncheckedIndexedAccess）：原声明为 PostAuthor[]，索引访问会返回 PostAuthor | undefined，
 * 导致 mockPosts / mockComments 中 `author: mockAuthors[N]` 报 TS2322。
 * 改为显式 5 元素元组类型，索引访问 mockAuthors[0..4] 将返回确定的 PostAuthor，无需非空断言。
 */
export const mockAuthors: [PostAuthor, PostAuthor, PostAuthor, PostAuthor, PostAuthor] = [
  {
    userId: "user-3001",
    name: "小鹿",
    avatar: "/static/default-avatar.png",
    headline: "94年 · 北京 · 年薪30w+ · 985硕士",
    campusName: "北京大学",
    interests: ["阅读", "旅行", "志愿者"],
  },
  {
    userId: "user-3002",
    name: "阿泽",
    avatar: "/static/default-avatar.png",
    headline: "96年 · 上海 · 互联网大厂 · 本科",
    campusName: "复旦大学",
    interests: ["徒步", "户外", "摄影"],
  },
  {
    userId: "user-3003",
    name: "橙子",
    avatar: "/static/default-avatar.png",
    headline: "95年 · 杭州 · 设计师 · 硕士",
    campusName: "浙江大学",
    interests: ["设计", "美食", "旅行"],
  },
  {
    userId: "user-3004",
    name: "南风",
    avatar: "/static/default-avatar.png",
    headline: "97年 · 深圳 · 产品经理 · 本科",
    campusName: "北京大学",
    interests: ["产品", "运动", "音乐"],
  },
  {
    userId: "user-3005",
    name: "北岛",
    avatar: "/static/default-avatar.png",
    headline: "93年 · 成都 · 创业者 · 博士",
    campusName: "四川大学",
    interests: ["创业", "摄影", "读书"],
  },
];

/** Mock 帖子列表 */
export const mockPosts: PostItem[] = [
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
];

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
