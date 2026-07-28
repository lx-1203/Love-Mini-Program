/**
 * Village Store 实现入口
 *
 * 村口社区 Store 主体实现：管理社区帖子、评论和分类数据。
 *
 * 模块拆分结构：
 * - ./types        类型定义
 * - ./constants    常量
 * - ./utils        工具函数与 Mock 数据
 * - ./api          API 调用函数
 * - ./index.ts     本文件：store 主体实现
 *
 * 通过 stores/village.ts re-export，保持外部 import 路径完全兼容：
 *   import { useVillageStore } from "@/stores/village";
 */

import { defineStore } from "pinia";
import { useSessionStore } from "../session";
import { useMock } from "../helpers/use-mock";
import type { CampusFeedView } from "../../services/generated/api-types-supplement";
// i18n 翻译函数（SubTask 3.3.3：错误回退消息 i18n 化）
import { t } from "@/i18n";
import {
  COMMENT_DEBOUNCE_MS,
  MAX_CONTENT_LENGTH,
  MAX_IMAGES_COUNT,
  PAGE_SIZE,
} from "./constants";
import {
  applyOptimisticLike,
  applyServerLikeResult,
  captureLikeSnapshot,
  filterAndSortPosts,
  mapCampusFeedPost,
  mapDetailToPostItem,
  mapToCommentItem,
  mapToPostItem,
  mockCategories,
  mockComments,
  mockPosts,
  rollbackLike,
  toBackendCategory,
  toggleMockPostLike,
} from "./utils";
import {
  createCommentApi,
  createPostApi,
  fetchCampusFeedApi,
  fetchCommentsApi,
  fetchPostDetailApi,
  fetchPostsApi,
  fetchSimilarAuthorsApi,
  followUserApi,
  likeCommentApi,
  likePostApi,
  sharePostApi,
} from "./api";
import type {
  CommentItem,
  CommentItemView,
  PostFilters,
  PostItem,
  SimilarAuthor,
  VillageState,
} from "./types";

// 保留 re-export 以便外部旧 import 路径仍能从 "@/stores/village" 取到这些符号
export * from "./types";
export * from "./constants";
export * from "./utils";
export * from "./api";

/**
 * 当前 fetchPosts 请求的 AbortController。
 *
 * 修复（P1 BUG）：原 fetchPosts 未处理 abort，新请求发起时旧请求仍在途，
 * 旧请求返回后可能覆盖新请求的结果（竞态条件），导致展示错误的帖子列表。
 * 现保存当前请求的 controller，新请求发起前 abort 旧请求，
 * 旧请求的 catch 分支通过 signal.abored 判断跳过状态修改。
 */
let fetchPostsController: AbortController | null = null;

/**
 * 评论发送防抖定时器映射表（postId -> 定时器）。
 *
 * 修复（P1 BUG）：用户快速点击发送评论按钮时，可能触发多次 commentPost 请求，
 * 导致后端创建重复评论。通过 per-post 防抖避免此问题。
 * 使用映射表而非单例，确保不同帖子的评论互不影响。
 */
const commentDebounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

/**
 * 正在点赞中的帖子 ID 集合（幂等守卫）。
 *
 * 修复（P1 BUG）：用户快速连续点击点赞按钮时，可能触发多次 likePost 请求，
 * 导致后端创建重复 like 记录或状态错乱。
 * 使用 Set 跟踪 in-flight 的点赞操作，同一帖子的并发请求直接跳过。
 */
const likingPostIds: Set<string> = new Set();

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
    campusFeedPosts: [],
    campusFeedActivities: [],
    campusFeedTopics: [],
    loadingCampusFeed: false,
    similarAuthors: [],
    loadingSimilarAuthors: false,
  }),

  getters: {
    /** 按分类过滤后的帖子 */
    filteredPosts: (state) => {
      return (filters?: PostFilters): PostItem[] => {
        let result = [...state.posts];

        if (filters?.categoryId && filters.categoryId !== "cat-all") {
          if (filters.categoryId === "cat-campus") {
            // 校园分类：按同校筛选
            try {
              const sessionStore = useSessionStore();
              const myCampus = sessionStore.userSession?.campusName ?? "";
              if (myCampus) {
                result = result.filter((post) => post.author.campusName === myCampus);
              }
            } catch (_e) {
              // 无法获取 sessionStore 时忽略
            }
          } else {
            result = result.filter((post) => post.categoryId === filters.categoryId);
          }
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
     *
     * 修复（P1 BUG）：新增 AbortController 取消在途请求，避免竞态条件。
     * 原实现未处理 abort，新请求发起时旧请求仍在途，
     * 旧请求返回后可能覆盖新请求的结果（如切换分类时旧列表覆盖新列表）。
     * 现保存当前请求的 controller，新请求发起前 abort 旧请求，
     * 旧请求的 catch 分支通过 signal.aborted 判断跳过状态修改。
     *
     * @param filters - 筛选条件
     * @param reset - 是否重置列表（默认true，传false则追加数据）
     */
    async fetchPosts(filters?: PostFilters, reset: boolean = true) {
      // 修复（P1 BUG）：取消在途的旧请求，避免竞态条件
      if (fetchPostsController) {
        try {
          fetchPostsController.abort();
        } catch (_e) {
          // abort 失败时忽略
        }
        fetchPostsController = null;
      }
      const controller = new AbortController();
      fetchPostsController = controller;

      this.loading = true;
      this.errorMessage = null;

      try {
        if (useMock()) {
          this.categories = [...mockCategories];

          // 获取当前用户学校信息（用于 cat-campus 筛选）
          let myCampus = "";
          if (filters?.categoryId === "cat-campus") {
            try {
              const sessionStore = useSessionStore();
              myCampus = sessionStore.userSession?.campusName ?? "";
            } catch (_e) {
              // session store 不可用时忽略
            }
          }

          const result = filterAndSortPosts(
            mockPosts,
            {
              categoryId: filters?.categoryId,
              keyword: filters?.keyword,
              sortBy: filters?.sortBy,
            },
            myCampus
          );

          // 修复：被取消的请求不修改状态
          if (controller.signal.aborted) return;

          this.posts = reset ? result : [...this.posts, ...result];
          this.hasMore = false;
          return;
        }

        // 调用后端 API: GET /api/posts
        const currentPage = reset ? 1 : this.page;
        const data = await fetchPostsApi(filters, currentPage, controller.signal);

        // 修复：请求返回后若已被取消，跳过状态修改，避免覆盖新请求结果
        if (controller.signal.aborted) return;

        const newPosts = data.items.map(mapToPostItem);
        this.posts = reset ? newPosts : [...this.posts, ...newPosts];
        this.page = currentPage;
        // 当返回数据不足一页时，说明没有更多数据
        this.hasMore = data.items.length >= PAGE_SIZE;
      } catch (error) {
        // 修复：被取消的请求不视为错误，不更新 errorMessage
        if (controller.signal.aborted) return;
        this.errorMessage = error instanceof Error ? error.message : "加载帖子失败";
      } finally {
        // 修复：仅当当前 controller 仍是全局 controller 时才清 loading
        // 避免新请求已发起时被旧请求的 finally 误清 loading
        if (fetchPostsController === controller) {
          this.loading = false;
          fetchPostsController = null;
        }
      }
    },

    /**
     * 加载更多帖子（分页加载下一页）
     *
     * SubTask 5.2.2：分页加载失败时保留已加载项并回退 page。
     *
     * <p>历史 BUG：原实现 {@code this.page += 1} 在 fetchPosts 之前执行，
     * 若 fetchPosts 失败（网络异常/服务端 5xx），{@code this.page} 已被推进，
     * 下次 loadMore 会跳过本应加载的页，导致帖子列表出现「断页」。
     * 同时 fetchPosts 内部 catch 不抛错，loadMore 无法感知失败。</p>
     *
     * <p>修复策略：</p>
     * <ol>
     *   <li>保存 previousPage，失败时回退；</li>
     *   <li>通过 errorMessage 非空感知失败（fetchPosts 内部 catch 不抛错，
     *       但会设置 errorMessage）；</li>
     *   <li>失败时不清空 this.posts（fetchPosts 已保证），保留已加载项供用户重试。</li>
     * </ol>
     *
     * @param filters - 筛选条件
     */
    async loadMore(filters?: PostFilters) {
      if (!this.hasMore || this.loading) {
        return;
      }
      const previousPage = this.page;
      this.page += 1;
      await this.fetchPosts(filters, false);
      // SubTask 5.2.2：分页加载失败时回退 page，保留已加载项供用户重试
      // fetchPosts 内部 catch 不抛错（避免上层未处理 reject），
      // 通过 errorMessage 非空感知失败并回退 page，避免下次 loadMore 跳页
      if (this.errorMessage) {
        this.page = previousPage;
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
          this.errorMessage = t("storeErrors.village.postContentEmpty");
          throw new Error(t("storeErrors.village.postContentEmpty"));
        }
        if (data.content.length > MAX_CONTENT_LENGTH) {
          this.errorMessage = t("storeErrors.village.postContentTooLong", { n: MAX_CONTENT_LENGTH });
          throw new Error(t("storeErrors.village.postContentTooLong", { n: MAX_CONTENT_LENGTH }));
        }

        // 图片数量校验：不超过9张
        const imageCount = data.images?.length ?? 0;
        if (imageCount > MAX_IMAGES_COUNT) {
          this.errorMessage = t("storeErrors.village.postImagesTooMany", { n: MAX_IMAGES_COUNT });
          throw new Error(t("storeErrors.village.postImagesTooMany", { n: MAX_IMAGES_COUNT }));
        }

        // 分类校验
        if (!data.categoryId || data.categoryId.trim().length === 0) {
          this.errorMessage = t("storeErrors.village.postCategoryRequired");
          throw new Error(t("storeErrors.village.postCategoryRequired"));
        }

        if (useMock()) {
          const newPost: PostItem = {
            id: `post-${Date.now()}`,
            author: {
              userId: "user-1001",
              name: "我",
              avatar: "/static/default-avatar.png",
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
            isAlumni: false,
            createdAt: new Date().toISOString(),
          };
          this.posts.unshift(newPost);
          return newPost;
        }

        // 调用后端 API: POST /api/posts
        const result = await createPostApi({
          category: toBackendCategory(data.categoryId),
          title: data.title,
          content: data.content,
          images: data.images ?? [],
          tags: data.tags ?? [],
        });
        // 将后端 PostDetailView 映射为前端 PostItem
        const newPost = mapDetailToPostItem(result);
        this.posts.unshift(newPost);
        return newPost;
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "发布帖子失败";
        throw error;
      }
    },

    /**
     * 点赞/取消点赞帖子
     *
     * 修复（P1 BUG）：
     * 1. 新增幂等守卫：使用 likingPostIds Set 跟踪 in-flight 的点赞操作，
     *    同一帖子的并发请求直接跳过，避免后端创建重复 like 记录。
     * 2. Real 模式新增乐观更新 + 失败回滚：先本地预测更新 isLiked/likes，
     *    后端失败时回滚到原状态，避免 UI 与后端数据不一致。
     *
     * @param postId - 帖子 ID
     */
    async likePost(postId: string) {
      this.errorMessage = null;

      // postId 校验
      if (!postId || postId.trim().length === 0) {
        this.errorMessage = t("storeErrors.village.postIdInvalid");
        throw new Error(t("storeErrors.village.postIdInvalid"));
      }

      // 修复（P1 BUG）：幂等守卫，同一帖子的并发点赞请求直接跳过
      if (likingPostIds.has(postId)) {
        return;
      }

      try {
        if (useMock()) {
          // Mock 模式：toggle 行为，无后端调用
          try {
            toggleMockPostLike(this.posts, this.currentPost, postId);
          } catch (error) {
            this.errorMessage = error instanceof Error ? error.message : "帖子不存在";
            throw error;
          }
          return;
        }

        // 修复（P1 BUG）：标记为 in-flight，防止并发请求
        likingPostIds.add(postId);

        // 修复（P1 BUG）：保存原始状态用于失败回滚
        const post = this.posts.find((p) => p.id === postId);
        const currentPostSnapshot =
          this.currentPost?.id === postId ? this.currentPost : null;
        const snapshot = captureLikeSnapshot(post, currentPostSnapshot);

        // 修复（P1 BUG）：乐观更新，先本地预测状态
        applyOptimisticLike(post, currentPostSnapshot);

        try {
          // 调用后端 API: POST /api/posts/{postId}/like
          const result = await likePostApi(postId);

          // 修复：根据后端返回的权威状态校正本地状态
          applyServerLikeResult(
            post,
            currentPostSnapshot,
            result.liked,
            result.likeCount
          );
        } catch (error) {
          // 修复（P1 BUG）：失败回滚到原始状态
          rollbackLike(post, currentPostSnapshot, snapshot);
          throw error;
        }
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "点赞操作失败";
        throw error;
      } finally {
        // 修复（P1 BUG）：清理 in-flight 标记
        likingPostIds.delete(postId);
      }
    },

    /**
     * 关注/取消关注用户
     * @param userId - 目标用户 ID（被关注者）
     */
    async followUser(userId: string) {
      this.errorMessage = null;

      try {
        // 判断当前是否已关注，决定调用关注还是取关 API
        const isCurrentlyFollowed = this.posts.find(
          (p) => p.author.userId === userId
        )?.isFollowed ?? false;

        if (useMock()) {
          // Mock 模式：更新所有该用户的帖子的 isFollowed 状态
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

        // 获取当前用户 ID
        const sessionStore = useSessionStore();
        const currentUserId = sessionStore.userSession?.userId ?? "";

        await followUserApi(userId, currentUserId, !isCurrentlyFollowed);

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
     * 评论帖子（带 500ms 防抖，防止快速连续提交）
     *
     * 修复（P1 BUG）：原 commentPost 无防抖，用户快速点击发送按钮或
     * 网络延迟时重复点击会触发多次后端请求，导致创建重复评论。
     * 通过 per-post 防抖窗口合并多次点击为一次实际请求。
     *
     * @param postId - 帖子 ID
     * @param content - 评论内容
     */
    async commentPost(postId: string, content: string) {
      this.errorMessage = null;

      // 内容非空检查（在防抖前执行，确保用户立即收到错误反馈）
      if (!content || content.trim().length === 0) {
        this.errorMessage = t("storeErrors.village.commentContentEmpty");
        throw new Error(t("storeErrors.village.commentContentEmpty"));
      }

      // 内容长度检查
      if (content.length > MAX_CONTENT_LENGTH) {
        this.errorMessage = t("storeErrors.village.commentContentTooLong", { n: MAX_CONTENT_LENGTH });
        throw new Error(t("storeErrors.village.commentContentTooLong", { n: MAX_CONTENT_LENGTH }));
      }

      // postId 检查
      if (!postId || postId.trim().length === 0) {
        this.errorMessage = t("storeErrors.village.postIdInvalid");
        throw new Error(t("storeErrors.village.postIdInvalid"));
      }

      // 修复（P1 BUG）：per-post 防抖，防止快速连续提交
      return new Promise<CommentItem | CommentItemView | undefined>((resolve, reject) => {
        // 清理上一次该帖子的防抖定时器
        const existingTimer = commentDebounceTimers.get(postId);
        if (existingTimer) {
          clearTimeout(existingTimer);
          commentDebounceTimers.delete(postId);
        }
        const timer = setTimeout(() => {
          commentDebounceTimers.delete(postId);
          this._doCommentPost(postId, content).then(resolve).catch(reject);
        }, COMMENT_DEBOUNCE_MS);
        commentDebounceTimers.set(postId, timer);
      });
    },

    /**
     * commentPost 的实际执行逻辑（由防抖 wrapper 调用）。
     *
     * @param postId - 帖子 ID
     * @param content - 评论内容
     */
    async _doCommentPost(postId: string, content: string) {
      this.errorMessage = null;

      try {
        if (useMock()) {
          const newComment: CommentItem = {
            id: `comment-${Date.now()}`,
            postId,
            author: {
              userId: "user-1001",
              name: "我",
              avatar: "/static/default-avatar.png",
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
        const result = await createCommentApi(postId, content);
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
     * 点赞/取消点赞评论
     * @param commentId - 评论 ID（toggle 操作）
     */
    async likeComment(commentId: string) {
      this.errorMessage = null;

      try {
        if (!commentId || commentId.trim().length === 0) {
          this.errorMessage = t("storeErrors.village.commentIdInvalid");
          throw new Error(t("storeErrors.village.commentIdInvalid"));
        }

        if (useMock()) {
          const comment = this.comments.find((c) => c.id === commentId);
          if (!comment) {
            this.errorMessage = t("storeErrors.village.commentNotFound");
            throw new Error(t("storeErrors.village.commentNotFound"));
          }

          // toggle 点赞状态
          comment.isLiked = !comment.isLiked;
          comment.likes += comment.isLiked ? 1 : -1;
          return;
        }

        // 调用后端 API: POST /api/posts/comments/{commentId}/like
        await likeCommentApi(commentId);

        const comment = this.comments.find((c) => c.id === commentId);
        if (comment) {
          comment.isLiked = !comment.isLiked;
          comment.likes += comment.isLiked ? 1 : -1;
        }
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "点赞评论失败";
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
          this.errorMessage = t("storeErrors.village.postIdInvalid");
          throw new Error(t("storeErrors.village.postIdInvalid"));
        }

        if (useMock()) {
          const post = this.posts.find((p) => p.id === postId);
          if (!post) {
            this.errorMessage = t("storeErrors.village.postNotFound");
            throw new Error(t("storeErrors.village.postNotFound"));
          }

          // 如果已转发则不再累加（幂等保护）
          if (post.isShared) {
            this.errorMessage = t("storeErrors.village.alreadyForwarded");
            throw new Error(t("storeErrors.village.alreadyForwarded"));
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
        const result = await sharePostApi(postId, comment);

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
        const data = await fetchCommentsApi(postId);
        this.comments = data.items.map(mapToCommentItem);
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "加载评论失败";
      } finally {
        this.loading = false;
      }
    },

    /**
     * 设置当前查看的帖子
     * Real 模式下调用 GET /api/posts/{id} 获取完整详情
     * @param postId - 帖子 ID
     */
    async setCurrentPost(postId: string) {
      if (useMock()) {
        this.currentPost = this.posts.find((p) => p.id === postId) ?? null;
        return;
      }

      // 调用后端 API: GET /api/posts/{postId}
      try {
        const data = await fetchPostDetailApi(postId);
        this.currentPost = mapDetailToPostItem(data);
      } catch (error) {
        // API 调用失败时回退到本地列表查找
        this.currentPost = this.posts.find((p) => p.id === postId) ?? null;
      }
    },

    /**
     * 清空当前帖子
     */
    clearCurrentPost() {
      this.currentPost = null;
      this.comments = [];
    },

    /**
     * 加载同校动态流
     * 获取当前用户所在学校的帖子、活动和话题聚合数据
     * Mock 模式提供本地测试数据，Real 模式调用 GET /api/campus/feed
     */
    async loadCampusFeed() {
      this.loadingCampusFeed = true;
      this.errorMessage = null;

      try {
        if (useMock()) {
          // Mock 模式：从本地 mockPosts 中筛选同校帖子作为动态流
          let myCampus = "";
          try {
            const sessionStore = useSessionStore();
            myCampus = sessionStore.userSession?.campusName ?? "";
          } catch (_e) {
            // session store 不可用时忽略
          }

          // 筛选同校帖子，如果没有学校信息则使用全部帖子
          const campusPosts = myCampus
            ? mockPosts.filter((p) => p.author.campusName === myCampus)
            : mockPosts.slice(0, 3);

          this.campusFeedPosts = campusPosts;
          this.campusFeedActivities = [
            {
              id: "activity-1",
              title: "周末校园电影放映",
              location: "学生活动中心",
              scheduleText: "本周六 19:00",
            },
            {
              id: "activity-2",
              title: "社团招新嘉年华",
              location: "操场",
              scheduleText: "下周三 14:00-17:00",
            },
          ];
          this.campusFeedTopics = [
            {
              id: "topic-1",
              title: "期末考试复习经验分享",
              heatLabel: "热门",
            },
            {
              id: "topic-2",
              title: "校园周边美食推荐",
              heatLabel: "讨论中",
            },
            {
              id: "topic-3",
              title: "毕业季租房避坑指南",
              heatLabel: "新话题",
            },
          ];
          return;
        }

        // 调用后端 API: GET /api/campus/feed
        const sessionStore = useSessionStore();
        const userId = sessionStore.userSession?.userId ?? "";
        const data = await fetchCampusFeedApi<CampusFeedView>(userId);

        // 将后端 CampusFeedView 中的帖子映射为前端 PostItem
        this.campusFeedPosts = (data.posts ?? []).map(mapCampusFeedPost);

        this.campusFeedActivities = data.activities ?? [];
        this.campusFeedTopics = data.topics ?? [];
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "加载同校动态失败";
      } finally {
        this.loadingCampusFeed = false;
      }
    },

    /**
     * 获取相似作者推荐。
     * 基于帖子作者的校区和兴趣标签，推荐 1-2 位相似用户。
     * Mock 模式返回本地模拟数据，Real 模式调用 GET /api/posts/{postId}/similar-authors
     *
     * @param postId - 帖子 ID
     */
    async fetchSimilarAuthors(postId: string) {
      this.loadingSimilarAuthors = true;
      this.errorMessage = null;

      try {
        if (useMock()) {
          // Mock 数据：返回 2 个相似作者
          this.similarAuthors = [
            {
              userId: "user-3004",
              name: "南风",
              avatar: "/static/default-avatar.png",
              campusName: "北京大学",
              headline: "97年 · 深圳 · 产品经理 · 本科",
              isAlumni: true,
              commonInterests: ["阅读", "旅行"],
              isFollowed: false,
            },
            {
              userId: "user-3005",
              name: "北岛",
              avatar: "/static/default-avatar.png",
              campusName: "四川大学",
              headline: "93年 · 成都 · 创业者 · 博士",
              isAlumni: false,
              commonInterests: ["阅读"],
              isFollowed: false,
            },
          ];
          return;
        }

        // 调用后端 API: GET /api/posts/{postId}/similar-authors?userId={userId}
        const sessionStore = useSessionStore();
        const userId = sessionStore.userSession?.userId ?? "";
        const data = await fetchSimilarAuthorsApi(postId, userId);

        this.similarAuthors = (data.authors ?? []).map((a: SimilarAuthor) => ({
          userId: String(a.userId ?? ""),
          name: String(a.nickname ?? a.name ?? ""),
          avatar: String(a.avatarUrl ?? a.avatar ?? ""),
          campusName: String(a.campusName ?? ""),
          headline: String(a.headline ?? ""),
          isAlumni: Boolean(a.isAlumni ?? false),
          commonInterests: Array.isArray(a.commonInterests) ? a.commonInterests : [],
          isFollowed: Boolean(a.isFollowed ?? false),
        }));
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "加载相似作者失败";
      } finally {
        this.loadingSimilarAuthors = false;
      }
    },

    /**
     * 清理 store 持有的所有定时器与请求资源。
     *
     * 修复（P1 BUG）：模块级定时器与请求控制器在 HMR 热更新或页面切换时未清理，
     * 可能导致内存泄漏或已卸载组件的状态被修改。
     * 调用时机：页面 onUnmounted / HMR 热更新 / 切换账号。
     */
    dispose() {
      // 清理 fetchPosts 请求控制器
      if (fetchPostsController) {
        try {
          fetchPostsController.abort();
        } catch (_e) {
          // abort 失败时忽略
        }
        fetchPostsController = null;
      }
      // 清理所有评论防抖定时器
      commentDebounceTimers.forEach((timer) => {
        clearTimeout(timer);
      });
      commentDebounceTimers.clear();
      // 清理点赞 in-flight 集合
      likingPostIds.clear();
    },
  },
});
