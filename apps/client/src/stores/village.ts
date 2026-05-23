import { defineStore } from "pinia";
import { appEnv } from "../services/env";
import { request } from "../services/http";
import { useSessionStore } from "./session";

/**
 * 帖子分类
 */
export interface PostCategory {
  id: string;
  name: string;
  icon: string;
}

/**
 * 帖子作者
 */
export interface PostAuthor {
  userId: string;
  name: string;
  avatar: string;
  headline: string;
  /** 所属学校名称，用于同校匹配 */
  campusName?: string;
  /** 兴趣标签列表 */
  interests?: string[];
}

/**
 * 帖子列表项
 */
export interface PostItem {
  id: string;
  author: PostAuthor;
  categoryId: string;
  title: string;
  content: string;
  images: string[];
  tags: string[];
  likes: number;
  comments: number;
  /** 转发次数 */
  shares: number;
  isLiked: boolean;
  isFollowed: boolean;
  /** 当前用户是否已转发 */
  isShared: boolean;
  createdAt: string;
}

/**
 * 评论项
 */
export interface CommentItem {
  id: string;
  postId: string;
  author: PostAuthor;
  content: string;
  likes: number;
  isLiked: boolean;
  createdAt: string;
}

/**
 * 帖子筛选条件
 */
export interface PostFilters {
  categoryId?: string;
  keyword?: string;
  sortBy?: "latest" | "hot";
}

/**
 * VillageStore 状态
 */
export interface VillageState {
  /** 帖子列表 */
  posts: PostItem[];
  /** 当前查看的帖子详情 */
  currentPost: PostItem | null;
  /** 评论列表 */
  comments: CommentItem[];
  /** 分类列表 */
  categories: PostCategory[];
  /** 是否正在加载 */
  loading: boolean;
  /** 错误信息 */
  errorMessage: string | null;
  /** 当前页码（从1开始） */
  page: number;
  /** 是否还有更多数据可加载 */
  hasMore: boolean;
}

/* ========== Mock 数据 ========== */

const mockCategories: PostCategory[] = [
  { id: "cat-all", name: "全部", icon: "grid" },
  { id: "cat-interest", name: "兴趣圈", icon: "heart" },
  { id: "cat-sincere", name: "诚意帖", icon: "star" },
  { id: "cat-hometown", name: "同乡", icon: "location" },
  { id: "cat-mask", name: "蒙面", icon: "eye-off" },
  { id: "cat-latest", name: "最新", icon: "time" },
];

const mockAuthors: PostAuthor[] = [
  {
    userId: "user-3001",
    name: "小鹿",
    avatar: "",
    headline: "94年 · 北京 · 年薪30w+ · 985硕士",
    campusName: "北京大学",
    interests: ["阅读", "旅行", "志愿者"],
  },
  {
    userId: "user-3002",
    name: "阿泽",
    avatar: "",
    headline: "96年 · 上海 · 互联网大厂 · 本科",
    campusName: "复旦大学",
    interests: ["徒步", "户外", "摄影"],
  },
  {
    userId: "user-3003",
    name: "橙子",
    avatar: "",
    headline: "95年 · 杭州 · 设计师 · 硕士",
    campusName: "浙江大学",
    interests: ["设计", "美食", "旅行"],
  },
  {
    userId: "user-3004",
    name: "南风",
    avatar: "",
    headline: "97年 · 深圳 · 产品经理 · 本科",
    campusName: "北京大学",
    interests: ["产品", "运动", "音乐"],
  },
  {
    userId: "user-3005",
    name: "北岛",
    avatar: "",
    headline: "93年 · 成都 · 创业者 · 博士",
    campusName: "四川大学",
    interests: ["创业", "摄影", "读书"],
  },
];

const mockPosts: PostItem[] = [
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
    isFollowed: false,
    isShared: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
];

const mockComments: CommentItem[] = [
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

/**
 * 后端 PostSummaryView 类型
 * 对应后端 record PostSummaryView
 */
export interface PostSummaryView {
  id: number;
  title: string;
  summary: string;
  author: PostAuthorView;
  category: string;
  tags: string[];
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: string;
  isHot: boolean;
  isAlumni: boolean;
}

/**
 * 后端 PostAuthorView 类型
 * 对应后端 record PostAuthorView(Long userId, String nickname, String avatarUrl, String campusName)
 */
export interface PostAuthorView {
  userId: number;
  nickname: string;
  avatarUrl: string;
  campusName: string;
}

/**
 * 后端 PostDetailView 类型
 * 对应后端 record PostDetailView
 */
export interface PostDetailView {
  id: number;
  title: string;
  content: string;
  author: PostAuthorView;
  category: string;
  tags: string[];
  images: string[];
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: string;
  updatedAt: string;
  isLiked: boolean;
  isAuthor: boolean;
  isAlumni: boolean;
}

/**
 * 后端 PostListResponse 类型
 * 对应后端 record PostListResponse(List<PostSummaryView> items, int total, int page, int pageSize)
 */
export interface PostListResponse {
  items: PostSummaryView[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 后端 CommentItemView 类型
 * 对应后端 record CommentItemView
 */
export interface CommentItemView {
  id: number;
  postId: number;
  parentId: number | null;
  author: CommentAuthorView;
  content: string;
  likeCount: number;
  createdAt: string;
  isAuthor: boolean;
  replyTo: string | null;
}

/**
 * 后端 CommentAuthorView 类型
 */
export interface CommentAuthorView {
  userId: number;
  nickname: string;
  avatarUrl: string;
}

/**
 * 后端 CommentListResponse 类型
 */
export interface CommentListResponse {
  items: CommentItemView[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 后端 PostLikeResponse 类型
 */
export interface PostLikeResponse {
  success: boolean;
  liked: boolean;
  likeCount: number;
}

/**
 * 后端 ShareView 类型
 */
export interface ShareView {
  id: number;
  postId: number;
  shareCount: number;
}

/**
 * 将后端 PostSummaryView 映射为前端 PostItem
 */
function mapToPostItem(raw: PostSummaryView): PostItem {
  return {
    id: String(raw.id),
    author: {
      userId: String(raw.author.userId),
      name: raw.author.nickname,
      avatar: raw.author.avatarUrl || "",
      headline: raw.author.campusName || "",
      campusName: raw.author.campusName,
    },
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
    createdAt: raw.createdAt,
  };
}

/**
 * 将后端 CommentItemView 映射为前端 CommentItem
 */
function mapToCommentItem(raw: CommentItemView): CommentItem {
  return {
    id: String(raw.id),
    postId: String(raw.postId),
    author: {
      userId: String(raw.author.userId),
      name: raw.author.nickname,
      avatar: raw.author.avatarUrl || "",
      headline: "",
    },
    content: raw.content,
    likes: raw.likeCount,
    isLiked: false, // CommentItemView 无 isLiked 字段
    createdAt: raw.createdAt,
  };
}

/** 内容最大长度 */
const MAX_CONTENT_LENGTH = 500;
/** 图片最大数量 */
const MAX_IMAGES_COUNT = 9;

function useMock() {
  return appEnv.apiMode === "mock";
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

/**
 * 村口社区 Store
 *
 * 管理社区帖子、评论和分类数据。
 */
export const useVillageStore = defineStore("village", {
  state: (): VillageState => ({
    posts: [],
    currentPost: null,
    comments: [],
    categories: [],
    loading: false,
    errorMessage: null,
    page: 1,
    hasMore: true,
  }),

  getters: {
    /** 按分类过滤后的帖子 */
    filteredPosts: (state) => {
      return (filters?: PostFilters): PostItem[] => {
        let result = [...state.posts];

        if (filters?.categoryId && filters.categoryId !== "cat-all") {
          result = result.filter((post) => post.categoryId === filters.categoryId);
        }

        if (filters?.keyword) {
          const keyword = filters.keyword.toLowerCase();
          result = result.filter(
            (post) =>
              post.title.toLowerCase().includes(keyword) ||
              post.content.toLowerCase().includes(keyword)
          );
        }

        if (filters?.sortBy === "hot") {
          result.sort((a, b) => b.likes - a.likes);
        } else {
          result.sort(
            (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
          );
        }

        return result;
      };
    },
    /** 当前帖子的评论 */
    currentPostComments: (state): CommentItem[] => {
      if (!state.currentPost) return [];
      return state.comments.filter((c) => c.postId === state.currentPost!.id);
    },
  },

  actions: {
    /**
     * 获取帖子列表（支持筛选和分页）
     * @param filters - 筛选条件
     * @param reset - 是否重置列表（默认true，传false则追加数据）
     */
    async fetchPosts(filters?: PostFilters, reset: boolean = true) {
      this.loading = true;
      this.errorMessage = null;

      try {
        if (useMock()) {
          this.categories = [...mockCategories];

          let result = [...mockPosts];

          if (filters?.categoryId && filters.categoryId !== "cat-all") {
            result = result.filter((post) => post.categoryId === filters.categoryId);
          }

          if (filters?.keyword) {
            const keyword = filters.keyword.toLowerCase();
            result = result.filter(
              (post) =>
                post.title.toLowerCase().includes(keyword) ||
                post.content.toLowerCase().includes(keyword)
            );
          }

          if (filters?.sortBy === "hot") {
            result.sort((a, b) => b.likes - a.likes);
          } else {
            result.sort(
              (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
            );
          }

          this.posts = reset ? result : [...this.posts, ...result];
          this.hasMore = false;
          return;
        }

        // 调用后端 API: GET /api/posts
        // 后端参数: category, tag, sortBy, page, pageSize
        const params: Record<string, string> = {};
        if (filters?.categoryId && filters.categoryId !== "cat-all") {
          params.category = filters.categoryId; // 后端参数名为 category，非 categoryId
        }
        if (filters?.keyword) {
          params.tag = filters.keyword; // 后端用 tag 做关键词过滤
        }
        if (filters?.sortBy) {
          params.sortBy = filters.sortBy;
        }
        const currentPage = reset ? 1 : this.page;
        params.page = String(currentPage);
        params.pageSize = "20";

        const data = await request<PostListResponse>({
          url: `/posts?${new URLSearchParams(params).toString()}`,
          method: "GET",
        });

        const newPosts = data.items.map(mapToPostItem);
        this.posts = reset ? newPosts : [...this.posts, ...newPosts];
        this.page = currentPage;
        // 当返回数据不足一页时，说明没有更多数据
        this.hasMore = data.items.length >= 20;
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "加载帖子失败";
      } finally {
        this.loading = false;
      }
    },

    /**
     * 加载更多帖子（分页加载下一页）
     * @param filters - 筛选条件
     */
    async loadMore(filters?: PostFilters) {
      if (!this.hasMore || this.loading) {
        return;
      }
      this.page += 1;
      await this.fetchPosts(filters, false);
    },

    /**
     * 创建新帖子
     * @param data - 帖子数据
     */
    async createPost(data: {
      categoryId: string;
      title: string;
      content: string;
      images?: string[];
      tags?: string[];
    }) {
      this.errorMessage = null;

      try {
        // 内容长度校验：不超过500字
        if (!data.content || data.content.trim().length === 0) {
          this.errorMessage = "帖子内容不能为空";
          throw new Error("帖子内容不能为空");
        }
        if (data.content.length > MAX_CONTENT_LENGTH) {
          this.errorMessage = `帖子内容不能超过${MAX_CONTENT_LENGTH}字`;
          throw new Error(`帖子内容不能超过${MAX_CONTENT_LENGTH}字`);
        }

        // 图片数量校验：不超过9张
        const imageCount = data.images?.length ?? 0;
        if (imageCount > MAX_IMAGES_COUNT) {
          this.errorMessage = `图片数量不能超过${MAX_IMAGES_COUNT}张`;
          throw new Error(`图片数量不能超过${MAX_IMAGES_COUNT}张`);
        }

        // 分类校验
        if (!data.categoryId || data.categoryId.trim().length === 0) {
          this.errorMessage = "请选择帖子分类";
          throw new Error("请选择帖子分类");
        }

        if (useMock()) {
          const newPost: PostItem = {
            id: `post-${Date.now()}`,
            author: {
              userId: "user-1001",
              name: "我",
              avatar: "",
              headline: "",
            },
            categoryId: data.categoryId,
            title: data.title,
            content: data.content,
            images: data.images ?? [],
            tags: data.tags ?? [],
            likes: 0,
            comments: 0,
            shares: 0,
            isLiked: false,
            isFollowed: false,
            isShared: false,
            createdAt: new Date().toISOString(),
          };
          this.posts.unshift(newPost);
          return newPost;
        }

        // 调用后端 API: POST /api/posts
        // 后端请求体: CreatePostRequest(title, content, category, tags, images)
        const result = await request<PostDetailView, { title: string; content: string; category: string; tags: string[]; images: string[] }>({
          url: "/posts",
          method: "POST",
          data: {
            title: data.title || "",
            content: data.content,
            category: data.categoryId,
            tags: data.tags ?? [],
            images: data.images ?? [],
          },
        });
        // 将后端 PostDetailView 映射为前端 PostItem
        const newPost: PostItem = {
          id: String(result.id),
          author: {
            userId: String(result.author.userId),
            name: result.author.nickname,
            avatar: result.author.avatarUrl || "",
            headline: result.author.campusName || "",
            campusName: result.author.campusName,
          },
          categoryId: result.category,
          title: result.title,
          content: result.content,
          images: result.images,
          tags: result.tags,
          likes: result.likeCount,
          comments: result.commentCount,
          shares: result.shareCount,
          isLiked: result.isLiked,
          isFollowed: false,
          isShared: false,
          createdAt: result.createdAt,
        };
        this.posts.unshift(newPost);
        return newPost;
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "发布帖子失败";
        throw error;
      }
    },

    /**
     * 点赞/取消点赞帖子
     * @param postId - 帖子 ID
     */
    async likePost(postId: string) {
      this.errorMessage = null;

      try {
        // postId 校验
        if (!postId || postId.trim().length === 0) {
          this.errorMessage = "帖子 ID 无效";
          throw new Error("帖子 ID 无效");
        }

        if (useMock()) {
          const post = this.posts.find((p) => p.id === postId);
          if (!post) {
            this.errorMessage = "帖子不存在";
            throw new Error("帖子不存在");
          }

          // 防止重复点赞：如果已经点赞，再次调用则取消点赞（toggle 行为）
          post.isLiked = !post.isLiked;
          post.likes += post.isLiked ? 1 : -1;

          if (this.currentPost?.id === postId) {
            this.currentPost.isLiked = !this.currentPost.isLiked;
            this.currentPost.likes += this.currentPost.isLiked ? 1 : -1;
          }
          return;
        }

        // 调用后端 API: POST /api/posts/{postId}/like
        // 后端返回 PostLikeResponse(success, liked, likeCount)
        const result = await request<PostLikeResponse>({
          url: `/posts/${postId}/like`,
          method: "POST",
        });

        // 根据后端返回的实际状态更新本地
        const post = this.posts.find((p) => p.id === postId);
        if (post) {
          post.isLiked = result.liked;
          post.likes = result.likeCount;
        }
        if (this.currentPost?.id === postId) {
          this.currentPost.isLiked = result.liked;
          this.currentPost.likes = result.likeCount;
        }
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "点赞操作失败";
        throw error;
      }
    },

    /**
     * 关注/取消关注用户
     * @param userId - 目标用户 ID（被关注者）
     */
    async followUser(userId: string) {
      this.errorMessage = null;

      try {
        if (useMock()) {
          // Mock 模式：更新所有该用户的帖子的 isFollowed 状态
          const isCurrentlyFollowed = this.posts.find(
            (p) => p.author.userId === userId
          )?.isFollowed ?? false;
          const newFollowedState = !isCurrentlyFollowed;

          this.posts.forEach((post) => {
            if (post.author.userId === userId) {
              post.isFollowed = newFollowedState;
            }
          });
          if (this.currentPost?.author.userId === userId) {
            this.currentPost.isFollowed = newFollowedState;
          }
          return;
        }

        // 判断当前是否已关注，决定调用关注还是取关 API
        const isCurrentlyFollowed = this.posts.find(
          (p) => p.author.userId === userId
        )?.isFollowed ?? false;

        // 获取当前用户 ID
        const sessionStore = useSessionStore();
        const currentUserId = sessionStore.userSession?.userId ?? "";

        if (isCurrentlyFollowed) {
          // 取关：DELETE /api/users/{userId}/follow?userId={currentUserId}
          await request<void>({
            url: `/users/${userId}/follow?userId=${currentUserId}`,
            method: "DELETE",
          });
        } else {
          // 关注：POST /api/users/{userId}/follow?userId={currentUserId}
          await request<void>({
            url: `/users/${userId}/follow?userId=${currentUserId}`,
            method: "POST",
          });
        }

        // 更新本地状态：该用户所有帖子的 isFollowed 统一更新
        const newFollowedState = !isCurrentlyFollowed;
        this.posts.forEach((post) => {
          if (post.author.userId === userId) {
            post.isFollowed = newFollowedState;
          }
        });
        if (this.currentPost?.author.userId === userId) {
          this.currentPost.isFollowed = newFollowedState;
        }
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "关注操作失败";
        throw error;
      }
    },

    /**
     * 评论帖子
     * @param postId - 帖子 ID
     * @param content - 评论内容
     */
    async commentPost(postId: string, content: string) {
      this.errorMessage = null;

      try {
        // 内容非空检查
        if (!content || content.trim().length === 0) {
          this.errorMessage = "评论内容不能为空";
          throw new Error("评论内容不能为空");
        }

        // 内容长度检查
        if (content.length > MAX_CONTENT_LENGTH) {
          this.errorMessage = `评论内容不能超过${MAX_CONTENT_LENGTH}字`;
          throw new Error(`评论内容不能超过${MAX_CONTENT_LENGTH}字`);
        }

        // postId 检查
        if (!postId || postId.trim().length === 0) {
          this.errorMessage = "帖子 ID 无效";
          throw new Error("帖子 ID 无效");
        }

        if (useMock()) {
          const newComment: CommentItem = {
            id: `comment-${Date.now()}`,
            postId,
            author: {
              userId: "user-1001",
              name: "我",
              avatar: "",
              headline: "",
            },
            content,
            likes: 0,
            isLiked: false,
            createdAt: new Date().toISOString(),
          };
          this.comments.push(newComment);

          const post = this.posts.find((p) => p.id === postId);
          if (post) {
            post.comments += 1;
          }
          if (this.currentPost?.id === postId) {
            this.currentPost.comments += 1;
          }
          return newComment;
        }

        // 调用后端 API: POST /api/posts/{postId}/comments
        // 后端请求体: CreateCommentRequest(content, parentId)
        const result = await request<CommentItemView, { content: string }>({
          url: `/posts/${postId}/comments`,
          method: "POST",
          data: { content },
        });
        const mappedComment = mapToCommentItem(result);
        this.comments.push(mappedComment);

        const post = this.posts.find((p) => p.id === postId);
        if (post) {
          post.comments += 1;
        }
        if (this.currentPost?.id === postId) {
          this.currentPost.comments += 1;
        }
        return result;
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "评论失败";
        throw error;
      }
    },

    /**
     * 转发帖子
     * @param postId - 帖子 ID
     * @param comment - 转发的附加评论（可选）
     */
    async sharePost(postId: string, comment?: string) {
      this.errorMessage = null;

      try {
        // postId 校验
        if (!postId || postId.trim().length === 0) {
          this.errorMessage = "帖子 ID 无效";
          throw new Error("帖子 ID 无效");
        }

        if (useMock()) {
          const post = this.posts.find((p) => p.id === postId);
          if (!post) {
            this.errorMessage = "帖子不存在";
            throw new Error("帖子不存在");
          }

          // 如果已转发则不再累加（幂等保护）
          if (post.isShared) {
            this.errorMessage = "您已转发过该帖子";
            throw new Error("您已转发过该帖子");
          }

          post.isShared = true;
          post.shares += 1;

          if (this.currentPost?.id === postId) {
            this.currentPost.isShared = true;
            this.currentPost.shares += 1;
          }
          return;
        }

        // 调用后端 API: POST /api/posts/{postId}/share
        // 后端请求体: SharePostRequest(comment)
        const result = await request<ShareView>({
          url: `/posts/${postId}/share`,
          method: "POST",
          data: comment ? { comment } : { comment: "" },
        });

        // 更新本地状态
        const post = this.posts.find((p) => p.id === postId);
        if (post && !post.isShared) {
          post.isShared = true;
          post.shares = result.shareCount;
        }
        if (this.currentPost?.id === postId && !this.currentPost.isShared) {
          this.currentPost.isShared = true;
          this.currentPost.shares = result.shareCount;
        }
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "转发操作失败";
        throw error;
      }
    },

    /**
     * 获取指定帖子的评论
     * @param postId - 帖子 ID
     */
    async fetchComments(postId: string) {
      this.loading = true;
      this.errorMessage = null;

      try {
        if (useMock()) {
          this.comments = mockComments.filter((c) => c.postId === postId);
          return;
        }

        // 调用后端 API: GET /api/posts/{postId}/comments
        // 后端返回 CommentListResponse(items, total, page, pageSize)
        const data = await request<CommentListResponse>({
          url: `/posts/${postId}/comments`,
          method: "GET",
        });
        this.comments = data.items.map(mapToCommentItem);
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "加载评论失败";
      } finally {
        this.loading = false;
      }
    },

    /**
     * 设置当前查看的帖子
     * @param postId - 帖子 ID
     */
    setCurrentPost(postId: string) {
      this.currentPost = this.posts.find((p) => p.id === postId) ?? null;
    },

    /**
     * 清空当前帖子
     */
    clearCurrentPost() {
      this.currentPost = null;
      this.comments = [];
    },
  },
});
