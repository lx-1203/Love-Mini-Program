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
// infra R2-00037: mock 头像统一走 IMAGE_PATHS 体系
import { IMAGE_PATHS } from "../../config/images";
import {
  COMMENT_DEBOUNCE_MS,
  MAX_CONTENT_LENGTH,
  MAX_IMAGES_COUNT,
  PAGE_SIZE,
} from "./constants";
import {
  applyOptimisticFavorite,
  applyOptimisticLike,
  applyServerFavoriteResult,
  applyServerLikeResult,
  captureFavoriteSnapshot,
  captureLikeSnapshot,
  filterAndSortPosts,
  mapCampusFeedPost,
  mapDetailToPostItem,
  mapToCommentItem,
  mapToPostItem,
  rollbackFavorite,
  rollbackLike,
  toBackendCategory,
  toggleMockPostFavorite,
  toggleMockPostLike,
} from "./utils";
// Mock 数据（R4-batch2：mock 用户/帖子数据自 utils.ts 拆分至 mock-data.ts，
// 仅 useMock() 分支引用，real 模式不会读取 mock ID）
import {
  MOCK_CURRENT_USER_ID,
  mockActivities,
  mockCategories,
  mockComments,
  mockPostHistory,
  mockPosts,
  mockSimilarAuthors,
} from "./mock-data";
import {
  clearPostHistoryApi,
  createCommentApi,
  createPostApi,
  favoritePostApi,
  fetchCampusFeedApi,
  fetchCommentsApi,
  fetchPostDetailApi,
  fetchPostHistoryApi,
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
  PostHistoryItem,
  PostItem,
  SimilarAuthor,
  VillageState,
} from "./types";

// 保留 re-export 以便外部旧 import 路径仍能从 "@/stores/village" 取到这些符号
export * from "./types";
export * from "./constants";
export * from "./utils";
export * from "./mock-data";
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
const commentDebounceTimers: Map<
  string,
  {
    timer: ReturnType<typeof setTimeout>;
    /** 被覆盖时用于 resolve 旧 Promise 的引用（修复：防抖覆盖导致 Promise 永不 settle） */
    resolve: ((value: CommentItem | CommentItemView | undefined) => void) | null;
  }
> = new Map();

/**
 * 正在点赞中的帖子 ID 集合（幂等守卫）。
 *
 * 修复（P1 BUG）：用户快速连续点击点赞按钮时，可能触发多次 likePost 请求，
 * 导致后端创建重复 like 记录或状态错乱。
 * 使用 Set 跟踪 in-flight 的点赞操作，同一帖子的并发请求直接跳过。
 */
const likingPostIds: Set<string> = new Set();
/** 点赞中的评论 ID 集合（幂等守卫：同一评论在途请求未完成时拒绝重复触发） */
const likingCommentIds: Set<string> = new Set();
/**
 * 正在收藏中的帖子 ID 集合（2026-08-08 论坛互动真实化，幂等守卫）。
 * 与 likingPostIds 同语义：同一帖子的并发收藏请求直接跳过，避免后端重复 toggle。
 */
const favoritingPostIds: Set<string> = new Set();

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
    // 2026-08-08 论坛互动真实化：浏览记录
    historyPosts: [],
    loadingHistory: false,
  }),

  getters: {
    /** 按分类过滤后的帖子（与 fetchPosts 的 filterAndSortPosts 同一语义，幂等） */
    filteredPosts: (state) => {
      return (filters?: PostFilters): PostItem[] => {
        // Phase 4.4 修复：委托统一过滤函数 filterAndSortPosts，
        // 避免 getter 与 fetchPosts 双重过滤语义不一致（Tab 分类 vs 内容分类）导致列表为空
        try {
          const sessionStore = useSessionStore();
          const myCampus = sessionStore.userSession?.campusName ?? "";
          return filterAndSortPosts(state.posts, filters ?? {}, myCampus);
        } catch (_e) {
          return filterAndSortPosts(state.posts, filters ?? {}, undefined);
        }
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
              city: filters?.city,
              discoverSub: filters?.discoverSub,
            },
            myCampus
          );

          // 修复：被取消的请求不修改状态
          if (controller.signal.aborted) return;

          // infra R2-00035: mock 分支模拟与 real 一致的分页语义（按 PAGE_SIZE 切片），
          // 避免 mock 下 hasMore 恒为 false、无法演练分页加载
          const currentPage = reset ? 1 : this.page;
          const start = (currentPage - 1) * PAGE_SIZE;
          const pageItems = result.slice(start, start + PAGE_SIZE);
          this.posts = reset ? pageItems : [...this.posts, ...pageItems];
          this.page = currentPage;
          this.hasMore = start + PAGE_SIZE < result.length;
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
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.village.loadPostsFailed"); // infra R2-00038: 错误回退消息 i18n 化
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
      /** 2026-08-08 频道化重构：关联活动 ID（可选，帖子活动卡） */
      activityId?: string;
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
          // infra R2-00037: mock 作者信息从当前会话生成，避免硬编码 "user-1001" 与真实用户体系割裂
          // R4-batch2: 兜底 ID 收敛为 mock-data 常量 MOCK_CURRENT_USER_ID（仅 mock 分支可达）
          const me = useSessionStore().userSession;
          const newPost: PostItem = {
            id: `post-${Date.now()}`,
            author: {
              userId: me?.userId ?? MOCK_CURRENT_USER_ID,
              name: me?.displayName ?? "我",
              avatar: IMAGE_PATHS.DEFAULT_AVATAR,
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
            // 2026-08-08 论坛互动真实化：新帖收藏/浏览从 0 起步
            favorites: 0,
            isFavorite: false,
            views: 0,
            // 2026-08-08 频道化重构：新帖活动关联透传（mock 活动摘要查表）
            activityId: data.activityId,
            activity: data.activityId
              ? mockActivities.find((a) => String(a.id) === data.activityId) ?? null
              : null,
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
          activityId: data.activityId,
        });
        // 将后端 PostDetailView 映射为前端 PostItem
        const newPost = mapDetailToPostItem(result);
        this.posts.unshift(newPost);
        return newPost;
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.village.publishPostFailed"); // infra R2-00038
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
            this.errorMessage = error instanceof Error ? error.message : t("storeErrors.village.postNotFound"); // infra R2-00038
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
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.village.likePostFailed"); // infra R2-00038
        throw error;
      } finally {
        // 修复（P1 BUG）：清理 in-flight 标记
        likingPostIds.delete(postId);
      }
    },

    /**
     * 收藏/取消收藏帖子（2026-08-08 论坛互动真实化）。
     *
     * 与 likePost 同模式：幂等守卫 + 乐观更新 + 失败回滚，
     * 以后端 FavoriteResponse{success, favorited, favoriteCount} 为权威状态校正。
     * 同时更新列表（this.posts）与当前详情页（this.currentPost），保持两处状态一致。
     *
     * @param postId - 帖子 ID
     */
    async toggleFavorite(postId: string) {
      this.errorMessage = null;

      // postId 校验
      if (!postId || postId.trim().length === 0) {
        this.errorMessage = t("storeErrors.village.postIdInvalid");
        throw new Error(t("storeErrors.village.postIdInvalid"));
      }

      // 幂等守卫：同一帖子的并发收藏请求直接跳过
      if (favoritingPostIds.has(postId)) {
        return;
      }

      try {
        if (useMock()) {
          // Mock 模式：toggle 行为，无后端调用
          try {
            toggleMockPostFavorite(this.posts, this.currentPost, postId);
          } catch (error) {
            this.errorMessage = error instanceof Error ? error.message : t("storeErrors.village.postNotFound"); // infra R2-00038
            throw error;
          }
          return;
        }

        // 标记 in-flight，防止并发请求
        favoritingPostIds.add(postId);

        // 保存原始状态用于失败回滚
        const post = this.posts.find((p) => p.id === postId);
        const currentPostSnapshot =
          this.currentPost?.id === postId ? this.currentPost : null;
        const snapshot = captureFavoriteSnapshot(post, currentPostSnapshot);

        // 乐观更新，先本地预测状态
        applyOptimisticFavorite(post, currentPostSnapshot);

        try {
          // 调用后端 API: POST /api/posts/{postId}/favorite
          const result = await favoritePostApi(postId);

          // 根据后端返回的权威状态校正本地状态
          applyServerFavoriteResult(
            post,
            currentPostSnapshot,
            result.favorited,
            result.favoriteCount
          );
        } catch (error) {
          // 失败回滚到原始状态
          rollbackFavorite(post, currentPostSnapshot, snapshot);
          throw error;
        }
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.village.favoritePostFailed"); // infra R2-00038
        throw error;
      } finally {
        // 清理 in-flight 标记
        favoritingPostIds.delete(postId);
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

        // P2-13：关注接口 userId 由后端 JWT 获取，客户端不再携带
        await followUserApi(userId, !isCurrentlyFollowed);

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
     * @param parentId - 父评论 ID（P1-02 楼中楼回复，缺省为根评论）
     */
    async commentPost(postId: string, content: string, parentId?: string) {
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
        const existing = commentDebounceTimers.get(postId);
        if (existing) {
          clearTimeout(existing.timer);
          commentDebounceTimers.delete(postId);
          // 修复（P1 BUG）：被新提交覆盖的旧 Promise 不再挂起——
          // 以“已取消”语义 resolve undefined，让旧调用方（await 处）正常返回
          if (existing.resolve) {
            existing.resolve(undefined);
          }
        }
        const timer = setTimeout(() => {
          commentDebounceTimers.delete(postId);
          this._doCommentPost(postId, content, parentId).then(resolve).catch(reject);
        }, COMMENT_DEBOUNCE_MS);
        commentDebounceTimers.set(postId, { timer, resolve });
      });
    },

    /**
     * commentPost 的实际执行逻辑（由防抖 wrapper 调用）。
     *
     * @param postId - 帖子 ID
     * @param content - 评论内容
     * @param parentId - 父评论 ID（P1-02 楼中楼回复）
     */
    async _doCommentPost(postId: string, content: string, parentId?: string) {
      this.errorMessage = null;

      // infra R2-00036: 防抖回调内二次校验（防御防抖窗口期间内容被清空/变更）
      if (!content || content.trim().length === 0) {
        this.errorMessage = t("storeErrors.village.commentContentEmpty");
        throw new Error(t("storeErrors.village.commentContentEmpty"));
      }

      try {
        // P1-02 楼中楼：本地插入评论（根评论追加到列表，回复追加到父评论 replies）
        const appendComment = (comment: CommentItem): void => {
          if (parentId) {
            const parent = this.comments.find((c) => c.id === parentId);
            if (parent) {
              parent.replies = [...(parent.replies ?? []), comment];
            } else {
              // 父评论不在当前列表（异常兜底）：按根评论展示
              this.comments.push(comment);
            }
          } else {
            this.comments.push(comment);
          }
        };

        if (useMock()) {
          // infra R2-00037: mock 评论作者从当前会话生成
          const me = useSessionStore().userSession;
          const parent = parentId
            ? this.comments.find((c) => c.id === parentId)
            : undefined;
          const newComment: CommentItem = {
            id: `comment-${Date.now()}`,
            postId,
            author: {
              userId: me?.userId ?? MOCK_CURRENT_USER_ID,
              name: me?.displayName ?? "我",
              avatar: IMAGE_PATHS.DEFAULT_AVATAR,
              headline: "",
            },
            content,
            likes: 0,
            isLiked: false,
            createdAt: new Date().toISOString(),
            parentId: parentId ?? null,
            replyTo: parent?.author.name ?? null,
            replies: [],
          };
          appendComment(newComment);

          const post = this.posts.find((p) => p.id === postId);
          if (post) {
            post.comments += 1;
          }
          if (this.currentPost?.id === postId) {
            this.currentPost.comments += 1;
          }
          return newComment;
        }

        // 调用后端 API: POST /api/posts/{postId}/comments（P1-02：带 parentId 创建楼中楼回复）
        const result = await createCommentApi(postId, content, parentId);
        const mappedComment = mapToCommentItem(result);
        appendComment(mappedComment);

        const post = this.posts.find((p) => p.id === postId);
        if (post) {
          post.comments += 1;
        }
        if (this.currentPost?.id === postId) {
          this.currentPost.comments += 1;
        }
        return result;
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.village.commentFailed"); // infra R2-00038
        throw error;
      }
    },

    /**
     * 点赞/取消点赞评论
     * @param commentId - 评论 ID（toggle 操作）
     *
     * 修复（P1 BUG）：新增幂等守卫——同一评论的点赞请求在途时拒绝重复触发，
     * 避免快速连点导致多次 toggle（点赞数漂移或重复请求）。
     */
    async likeComment(commentId: string) {
      // 幂等守卫：在途请求未完成时直接返回
      if (likingCommentIds.has(commentId)) {
        return;
      }
      this.errorMessage = null;
      likingCommentIds.add(commentId);

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
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.village.likeCommentFailed"); // infra R2-00038
        throw error;
      } finally {
        likingCommentIds.delete(commentId);
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
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.village.sharePostFailed"); // infra R2-00038
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
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.village.loadCommentsFailed"); // infra R2-00038
      } finally {
        this.loading = false;
      }
    },

    /**
     * 分页获取当前用户的帖子浏览历史（2026-08-08 论坛互动真实化）。
     *
     * @param reset - 是否重置列表（默认 true，传 false 则追加数据）
     */
    async fetchPostHistory(reset: boolean = true) {
      this.loadingHistory = true;
      this.errorMessage = null;

      try {
        if (useMock()) {
          // Mock 模式：直接使用内置浏览历史
          this.historyPosts = [...mockPostHistory];
          return;
        }

        const page = reset ? 1 : Math.floor(this.historyPosts.length / PAGE_SIZE) + 1;
        const data = await fetchPostHistoryApi(page, PAGE_SIZE);
        // 后端 PostHistoryItemView -> 前端 PostHistoryItem（post 复用 mapToPostItem）
        const items: PostHistoryItem[] = data.items.map((raw) => ({
          post: mapToPostItem(raw.post),
          viewedAt: raw.viewedAt,
        }));
        this.historyPosts = reset ? items : [...this.historyPosts, ...items];
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.village.loadHistoryFailed"); // infra R2-00038
      } finally {
        this.loadingHistory = false;
      }
    },

    /**
     * 清空当前用户的帖子浏览历史（2026-08-08 论坛互动真实化）。
     */
    async clearPostHistory() {
      this.errorMessage = null;

      try {
        if (useMock()) {
          this.historyPosts = [];
          return;
        }
        await clearPostHistoryApi();
        this.historyPosts = [];
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.village.clearHistoryFailed"); // infra R2-00038
        throw error;
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
      } catch (_error) {
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

        // 调用后端 API: GET /api/campus/feed（P2-13：userId 由后端 JWT 获取）
        const data = await fetchCampusFeedApi<CampusFeedView>();

        // 将后端 CampusFeedView 中的帖子映射为前端 PostItem
        this.campusFeedPosts = (data.posts ?? []).map(mapCampusFeedPost);

        this.campusFeedActivities = data.activities ?? [];
        this.campusFeedTopics = data.topics ?? [];
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.village.loadCampusFeedFailed"); // infra R2-00038
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
          // Mock 数据：返回 2 个相似作者（infra R2-00039: 仅 mock 演示用，real 分支由后端下发；
          // R4-batch2: 数据移入 stores/village/mock-data.ts 的 mockSimilarAuthors）
          this.similarAuthors = mockSimilarAuthors;
          return;
        }

        // 调用后端 API: GET /api/posts/{postId}/similar-authors（P2-13：userId 由后端 JWT 获取）
        const data = await fetchSimilarAuthorsApi(postId);

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
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.village.loadSimilarAuthorsFailed"); // infra R2-00038
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
     *
     * TODO(dispose-接线)：引用页面为 pages/village/index.vue（主列表页）及
     * pages/village/detail.vue、pages/village/post.vue、pages/village/tag-posts.vue、
     * pages/profile/index.vue。本子任务受目录权限限制无法修改
     * pages/ 目录，需在后续任务中于页面 onUnload 调用 villageStore.dispose()。
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
      // 清理所有评论防抖定时器（含被覆盖 Promise 的 resolve 引用）
      commentDebounceTimers.forEach((entry) => {
        clearTimeout(entry.timer);
        if (entry.resolve) {
          entry.resolve(undefined);
        }
      });
      commentDebounceTimers.clear();
      // 清理点赞 in-flight 集合
      likingPostIds.clear();
      likingCommentIds.clear();
      // 2026-08-08 论坛互动真实化：清理收藏 in-flight 集合
      favoritingPostIds.clear();
    },
  },
});
