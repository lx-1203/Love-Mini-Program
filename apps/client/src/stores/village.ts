import { defineStore } from "pinia";
import { appEnv } from "../services/env";

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
  isLiked: boolean;
  isFollowed: boolean;
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
  },
  {
    userId: "user-3002",
    name: "阿泽",
    avatar: "",
    headline: "96年 · 上海 · 互联网大厂 · 本科",
  },
  {
    userId: "user-3003",
    name: "橙子",
    avatar: "",
    headline: "95年 · 杭州 · 设计师 · 硕士",
  },
  {
    userId: "user-3004",
    name: "南风",
    avatar: "",
    headline: "97年 · 深圳 · 产品经理 · 本科",
  },
  {
    userId: "user-3005",
    name: "北岛",
    avatar: "",
    headline: "93年 · 成都 · 创业者 · 博士",
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
    isLiked: false,
    isFollowed: false,
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
    isLiked: true,
    isFollowed: true,
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
    isLiked: false,
    isFollowed: false,
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
    isLiked: false,
    isFollowed: false,
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
    isLiked: true,
    isFollowed: false,
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
    isLiked: false,
    isFollowed: false,
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
     * 获取帖子列表（支持筛选）
     * @param filters - 筛选条件
     */
    async fetchPosts(filters?: PostFilters) {
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

          this.posts = result;
          return;
        }

        // TODO: real API integration
        throw new Error("Real API not implemented");
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "加载帖子失败";
      } finally {
        this.loading = false;
      }
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
            isLiked: false,
            isFollowed: false,
            createdAt: new Date().toISOString(),
          };
          this.posts.unshift(newPost);
          return newPost;
        }

        // TODO: real API integration
        throw new Error("Real API not implemented");
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

        // TODO: real API integration
        throw new Error("Real API not implemented");
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "点赞操作失败";
        throw error;
      }
    },

    /**
     * 关注/取消关注用户
     * @param postId - 帖子 ID
     */
    async followUser(postId: string) {
      this.errorMessage = null;

      try {
        if (useMock()) {
          const post = this.posts.find((p) => p.id === postId);
          if (post) {
            post.isFollowed = !post.isFollowed;
          }
          if (this.currentPost?.id === postId) {
            this.currentPost.isFollowed = !this.currentPost.isFollowed;
          }
          return;
        }

        // TODO: real API integration
        throw new Error("Real API not implemented");
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

        // TODO: real API integration
        throw new Error("Real API not implemented");
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "评论失败";
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

        // TODO: real API integration
        throw new Error("Real API not implemented");
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
