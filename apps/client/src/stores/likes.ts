import { defineStore } from "pinia";
import { request } from "../services/http";
import { useSessionStore } from "./session";
import { useMock } from "./helpers/use-mock";
// i18n 翻译函数（SubTask 3.3.3：错误回退消息 i18n 化）
import { t } from "@/i18n";

/**
 * 心动信号状态
 */
export type HeartSignalStatus = "pending" | "accepted" | "expired";

/**
 * 后端 LikedUserView 类型
 * 对应后端 record LikedUserView(Long userId, String nickname, String avatarUrl, String campusName, String likedAt)
 */
export interface LikedUserView {
  userId: number;
  nickname: string;
  avatarUrl: string;
  campusName: string;
  likedAt: string;
}

/**
 * 后端 VisitorView 类型
 * 对应后端 record VisitorView(Long visitorId, String nickname, String avatarUrl, String campusName, String visitedAt)
 */
export interface VisitorView {
  visitorId: number;
  nickname: string;
  avatarUrl: string;
  campusName: string;
  visitedAt: string;
}

/**
 * 后端 HeartSignalView 类型
 * 对应后端 record HeartSignalView(Long id, Long userAId, Long userBId, String status, String expiresAt, String createdAt, String fromUserName, String fromUserAvatar)
 */
export interface HeartSignalView {
  id: number;
  userAId: number;
  userBId: number;
  status: string;
  expiresAt: string;
  createdAt: string;
  /** 发起方用户名称 */
  fromUserName: string;
  /** 发起方用户头像 */
  fromUserAvatar: string;
}

/**
 * 将后端 LikedUserView 映射为前端 LikeRecord
 */
function mapToLikeRecord(raw: LikedUserView): LikeRecord {
  return {
    id: String(raw.userId),
    userId: String(raw.userId),
    name: raw.nickname,
    avatar: raw.avatarUrl || "",
    headline: raw.campusName || "",
    likedAt: raw.likedAt,
  };
}

/**
 * 将后端 VisitorView 映射为前端 VisitorRecord
 */
function mapToVisitorRecord(raw: VisitorView): VisitorRecord {
  return {
    id: String(raw.visitorId),
    userId: String(raw.visitorId),
    name: raw.nickname,
    avatar: raw.avatarUrl || "",
    headline: raw.campusName || "",
    visitedAt: raw.visitedAt,
    isNew: false, // 后端 VisitorView 无 isNew 字段，默认为 false
  };
}

/**
 * 将后端 HeartSignalView 映射为前端 HeartSignal
 */
function mapToHeartSignal(raw: HeartSignalView): HeartSignal {
  return {
    id: String(raw.id),
    fromUserId: String(raw.userAId),
    fromUserName: raw.fromUserName || "",
    fromUserAvatar: raw.fromUserAvatar || "",
    toUserId: String(raw.userBId),
    status: (raw.status === "accepted" ? "accepted" : raw.status === "expired" ? "expired" : "pending") as HeartSignalStatus,
    sentAt: raw.createdAt,
    expiresAt: raw.expiresAt,
  };
}

/**
 * 喜欢记录
 */
export interface LikeRecord {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  headline: string;
  likedAt: string;
  /**
   * 认证徽章级别：none/email/idcard/school（Phase D3 新增）。
   * 后端 LikedUserView 暂未返回此字段，由前端可选消费：
   * - 字段存在且非 "none" 时，VerificationBadge 渲染对应徽章
   * - 字段为 "none" 或 undefined 时，不渲染任何内容（避免对方资料上显示"去认证"CTA）
   */
  verificationBadgeLevel?: string;
}

/**
 * 访客记录
 */
export interface VisitorRecord {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  headline: string;
  visitedAt: string;
  isNew: boolean;
  /**
   * 认证徽章级别：none/email/idcard/school（Phase D3 新增）。
   * 与 LikeRecord.verificationBadgeLevel 同义，用于访客卡片渲染徽章。
   */
  verificationBadgeLevel?: string;
}

/**
 * 心动信号
 */
export interface HeartSignal {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar: string;
  toUserId: string;
  status: HeartSignalStatus;
  sentAt: string;
  expiresAt: string;
}

/**
 * 批量操作类型
 * - like: 批量喜欢（对喜欢我的人）
 * - skip: 批量跳过（移除喜欢我的人，从列表移除）
 * - cancel: 批量取消喜欢（对我发出的喜欢）
 */
export type BatchActionType = "like" | "skip" | "cancel";

/**
 * LikesStore 状态
 */
export interface LikesState {
  /** 我发出的喜欢列表 */
  likes: LikeRecord[];
  /** 喜欢我的列表 */
  likedBy: LikeRecord[];
  /** 访客记录列表 */
  visitors: VisitorRecord[];
  /** 心动信号列表 */
  heartSignals: HeartSignal[];
  /** 是否正在加载 */
  loading: boolean;
  /** 错误信息 */
  errorMessage: string | null;
  /**
   * 搜索关键词（功能2：喜欢列表搜索）
   * 用于按昵称、学校（headline 中包含学校信息）、城市筛选
   * 由 likes 页面搜索框（300ms 防抖）写入
   */
  searchQuery: string;
  /**
   * 批量模式开关（功能1：喜欢列表批量操作）
   * - true: 显示 checkbox、底部批量操作栏
   * - false: 正常浏览模式
   */
  batchMode: boolean;
  /**
   * 选中的用户 ID 集合（功能1：批量操作）
   * 在批量模式下，用户点击 checkbox 时维护此 Set
   */
  selectedIds: string[];
  /** 批量操作执行中（防重复提交） */
  batchProcessing: boolean;
}

/* ========== Mock 数据 ========== */

const mockLikes: LikeRecord[] = [
  {
    id: "like-1",
    userId: "user-2001",
    name: "林夕",
    avatar: "/static/default-avatar.png",
    headline: "中山大学 · 大二 · 喜欢电影和咖啡",
    likedAt: "2026-05-20T14:30:00Z",
  },
  {
    id: "like-2",
    userId: "user-2002",
    name: "陈默",
    avatar: "/static/default-avatar.png",
    headline: "华南理工 · 大三 · 自习搭子",
    likedAt: "2026-05-19T10:15:00Z",
  },
];

const mockLikedBy: LikeRecord[] = [
  {
    id: "like-3",
    userId: "user-2003",
    name: "苏晴",
    avatar: "/static/default-avatar.png",
    headline: "中山大学 · 大一 · 摄影爱好者",
    likedAt: "2026-05-20T16:45:00Z",
    verificationBadgeLevel: "school",
  },
  {
    id: "like-4",
    userId: "user-2004",
    name: "周然",
    avatar: "/static/default-avatar.png",
    headline: "华南理工 · 研一 · 喜欢夜跑",
    likedAt: "2026-05-18T09:20:00Z",
    verificationBadgeLevel: "email",
  },
  {
    id: "like-5",
    userId: "user-2006",
    name: "叶知秋",
    avatar: "/static/default-avatar.png",
    headline: "暨南大学 · 大二 · 文学系",
    likedAt: "2026-05-17T20:10:00Z",
  },
  {
    id: "like-6",
    userId: "user-2007",
    name: "沈星河",
    avatar: "/static/default-avatar.png",
    headline: "广东工业 · 大三 · 篮球队",
    likedAt: "2026-05-16T14:00:00Z",
    verificationBadgeLevel: "idcard",
  },
];

const mockVisitors: VisitorRecord[] = [
  {
    id: "visit-1",
    userId: "user-2003",
    name: "苏晴",
    avatar: "/static/default-avatar.png",
    headline: "中山大学 · 大一 · 摄影爱好者",
    visitedAt: "2026-05-20T16:45:00Z",
    isNew: true,
    verificationBadgeLevel: "school",
  },
  {
    id: "visit-2",
    userId: "user-2005",
    name: "顾言",
    avatar: "/static/default-avatar.png",
    headline: "星海音乐 · 大二 · 音乐社",
    visitedAt: "2026-05-19T08:00:00Z",
    isNew: false,
  },
  {
    id: "visit-3",
    userId: "user-2008",
    name: "江晚吟",
    avatar: "/static/default-avatar.png",
    headline: "华南师范 · 大一 · 舞蹈队",
    visitedAt: "2026-05-15T18:30:00Z",
    isNew: false,
    verificationBadgeLevel: "email",
  },
];

const mockHeartSignals: HeartSignal[] = [
  {
    id: "signal-1",
    fromUserId: "user-2003",
    fromUserName: "苏晴",
    fromUserAvatar: "/static/default-avatar.png",
    toUserId: "user-1001",
    status: "pending",
    sentAt: "2026-05-20T16:45:00Z",
    expiresAt: "2026-05-21T16:45:00Z",
  },
  {
    id: "signal-2",
    fromUserId: "user-2006",
    fromUserName: "叶知秋",
    fromUserAvatar: "/static/default-avatar.png",
    toUserId: "user-1001",
    status: "pending",
    sentAt: "2026-05-17T20:10:00Z",
    expiresAt: "2026-05-18T20:10:00Z",
  },
];

/* ========== 模块级 AbortController（修复 P1 BUG：异步竞态条件） ==========
 *
 * 修复（P1 BUG）：原 fetchLikes / fetchVisitors / fetchHeartSignals 未处理 abort，
 * 用户在 Tab 间快速切换或下拉刷新时，新请求发起时旧请求仍在途，
 * 旧请求返回后可能覆盖新请求的结果（竞态条件），导致展示错误列表。
 * 现保存当前请求的 controller，新请求发起前 abort 旧请求，
 * 旧请求的 catch 分支通过 signal.aborted 判断跳过状态修改。
 */
let fetchLikesController: AbortController | null = null;
let fetchVisitorsController: AbortController | null = null;
let fetchHeartSignalsController: AbortController | null = null;

/**
 * 喜欢与访客 Store
 *
 * 管理用户之间的喜欢关系、访客记录和心动信号。
 */
export const useLikesStore = defineStore("likes", {
  state: (): LikesState => ({
    likes: [],
    likedBy: [],
    visitors: [],
    heartSignals: [],
    loading: false,
    errorMessage: null,
    searchQuery: "",
    batchMode: false,
    selectedIds: [],
    batchProcessing: false,
  }),

  getters: {
    /** 互相喜欢的用户列表（即匹配） */
    mutualLikes: (state): LikeRecord[] => {
      const likedUserIds = new Set(state.likes.map((item) => item.userId));
      return state.likedBy.filter((item) => likedUserIds.has(item.userId));
    },
    /** 未读访客数量 */
    unreadVisitorCount: (state): number => {
      return state.visitors.filter((v) => v.isNew).length;
    },
    /** 待处理的心动信号数量 */
    pendingHeartSignals: (state): HeartSignal[] => {
      return state.heartSignals.filter((s) => s.status === "pending");
    },
    /** 当前用户 ID（从 session 获取，mock 模式下默认 user-1001） */
    currentUserId(): string {
      try {
        const sessionStore = useSessionStore();
        return sessionStore.userSession?.userId ?? "user-1001";
      } catch (_e) {
        return "user-1001";
      }
    },
    /**
     * 功能2：根据 searchQuery 过滤后的「喜欢我的」列表
     * 按昵称、学校（headline）、城市（headline）做包含匹配
     * searchQuery 为空时返回原列表
     */
    filteredLikedBy: (state): LikeRecord[] => {
      const q = state.searchQuery.trim().toLowerCase();
      if (!q) return state.likedBy;
      return state.likedBy.filter((item) => {
        const name = (item.name || "").toLowerCase();
        const headline = (item.headline || "").toLowerCase();
        return name.includes(q) || headline.includes(q);
      });
    },
    /**
     * 功能2：根据 searchQuery 过滤后的「我发出的喜欢」列表
     */
    filteredLikes: (state): LikeRecord[] => {
      const q = state.searchQuery.trim().toLowerCase();
      if (!q) return state.likes;
      return state.likes.filter((item) => {
        const name = (item.name || "").toLowerCase();
        const headline = (item.headline || "").toLowerCase();
        return name.includes(q) || headline.includes(q);
      });
    },
    /**
     * 功能2：根据 searchQuery 过滤后的访客列表
     */
    filteredVisitors: (state): VisitorRecord[] => {
      const q = state.searchQuery.trim().toLowerCase();
      if (!q) return state.visitors;
      return state.visitors.filter((item) => {
        const name = (item.name || "").toLowerCase();
        const headline = (item.headline || "").toLowerCase();
        return name.includes(q) || headline.includes(q);
      });
    },
    /**
     * 功能1：选中项数量（用于底部批量操作栏展示）
     */
    selectedCount: (state): number => state.selectedIds.length,
    /**
     * 功能1：判断某用户 ID 是否已被选中
     */
    isSelected: (state) => (userId: string): boolean => state.selectedIds.includes(userId),
  },

  actions: {
    /**
     * 获取我发出的喜欢列表和喜欢我的列表
     *
     * 修复（P1 BUG）：原 catch 分支未向上抛出错误，调用方无法感知加载失败，
     * 仍会将旧数据视为「当前数据」展示。同时原实现保留旧列表（仅做空值兜底），
     * 易让用户误以为数据是最新的。
     * 现改为：
     * 1. 失败时清空 likes/likedBy 列表，避免展示陈旧数据
     * 2. 重新抛出错误，调用方可据此展示重试入口
     *
     * 修复（P1 BUG - 异步竞态）：新增 AbortController 取消在途的旧请求。
     * 用户在 Tab 间快速切换或下拉刷新时，新请求发起时旧请求仍在途，
     * 旧请求返回后可能覆盖新请求结果（竞态条件），导致展示错误列表。
     * 现保存当前请求的 controller，新请求发起前 abort 旧请求，
     * 旧请求的 catch 分支通过 signal.aborted 判断跳过状态修改。
     */
    async fetchLikes() {
      // 修复（P1 BUG）：取消在途的旧请求，避免竞态条件
      if (fetchLikesController) {
        try {
          fetchLikesController.abort();
        } catch (_e) {
          // abort 失败时忽略
        }
        fetchLikesController = null;
      }
      const controller = new AbortController();
      fetchLikesController = controller;

      this.loading = true;
      this.errorMessage = null;

      try {
        if (useMock()) {
          // 修复：被取消的请求不修改状态
          if (controller.signal.aborted) return;

          this.likes = [...mockLikes];
          this.likedBy = [...mockLikedBy];

          // 空列表处理：设置友好提示
          if (this.likes.length === 0 && this.likedBy.length === 0) {
            // 静默处理，不做额外提示，UI 层应显示空态
          }
          return;
        }

        // 调用后端 API: GET /api/matches/liked-me?userId={userId}
        const likedByData = await request<LikedUserView[]>({
          url: `/matches/liked-me?userId=${this.currentUserId}`,
          method: "GET",
          signal: controller.signal,
        });

        // 修复：请求返回后若已被取消，跳过状态修改，避免覆盖新请求结果
        if (controller.signal.aborted) return;

        this.likedBy = likedByData.map(mapToLikeRecord);

        // 调用后端 API: GET /api/matches/my-likes?userId={userId}
        const myLikesData = await request<LikedUserView[]>({
          url: `/matches/my-likes?userId=${this.currentUserId}`,
          method: "GET",
          signal: controller.signal,
        });

        // 修复：第二次请求返回后再次检查是否已取消
        if (controller.signal.aborted) return;

        this.likes = myLikesData.map(mapToLikeRecord);
      } catch (error) {
        // 修复：被取消的请求不视为错误，不更新 errorMessage，也不清空列表
        if (controller.signal.aborted) return;
        this.errorMessage = error instanceof Error ? error.message : "加载喜欢列表失败";
        // 修复（P1 BUG）：失败时清空列表，避免陈旧数据被当作当前数据展示
        this.likes = [];
        this.likedBy = [];
        // 修复（P1 BUG）：重新抛出错误，调用方可据此展示重试入口
        throw error;
      } finally {
        // 修复：仅当当前 controller 仍是全局 controller 时才清 loading
        // 避免新请求已发起时被旧请求的 finally 误清 loading
        if (fetchLikesController === controller) {
          this.loading = false;
          fetchLikesController = null;
        }
      }
    },

    /**
     * 获取访客记录
     *
     * 修复（P1 BUG - 异步竞态）：新增 AbortController 取消在途的旧请求，
     * 避免快速切换 Tab 时旧请求覆盖新请求结果。
     */
    async fetchVisitors() {
      // 修复（P1 BUG）：取消在途的旧请求，避免竞态条件
      if (fetchVisitorsController) {
        try {
          fetchVisitorsController.abort();
        } catch (_e) {
          // abort 失败时忽略
        }
        fetchVisitorsController = null;
      }
      const controller = new AbortController();
      fetchVisitorsController = controller;

      this.loading = true;
      this.errorMessage = null;

      try {
        if (useMock()) {
          // 修复：被取消的请求不修改状态
          if (controller.signal.aborted) return;
          this.visitors = [...mockVisitors];
          return;
        }

        // 调用后端 API: GET /api/matches/visitors?userId={userId}
        const data = await request<VisitorView[]>({
          url: `/matches/visitors?userId=${this.currentUserId}`,
          method: "GET",
          signal: controller.signal,
        });

        // 修复：请求返回后若已被取消，跳过状态修改
        if (controller.signal.aborted) return;

        this.visitors = data.map(mapToVisitorRecord);
      } catch (error) {
        // 修复：被取消的请求不视为错误，不更新 errorMessage
        if (controller.signal.aborted) return;
        this.errorMessage = error instanceof Error ? error.message : "加载访客记录失败";
        this.visitors = [];
      } finally {
        // 修复：仅当当前 controller 仍是全局 controller 时才清 loading
        if (fetchVisitorsController === controller) {
          this.loading = false;
          fetchVisitorsController = null;
        }
      }
    },

    /**
     * 喜欢一个用户
     *
     * <p>SubTask 5.5.1：改为乐观更新模式。</p>
     * <ol>
     *   <li>参数与业务校验（userId 空、自喜欢、重复喜欢）</li>
     *   <li>快照本地 likes 列表，便于失败时回滚</li>
     *   <li>立即将目标用户追加到本地 likes 列表（UI 即时反馈）</li>
     *   <li>调用后端 POST /api/matches/like 同步状态</li>
     *   <li>失败时回滚 likes 列表至快照，并向上抛出错误供 UI 提示</li>
     * </ol>
     *
     * @param userId - 目标用户 ID
     */
    async likeUser(userId: string) {
      this.errorMessage = null;

      try {
        // 参数校验：userId 不能为空
        if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
          this.errorMessage = t("storeErrors.likes.userIdInvalid");
          throw new Error(t("storeErrors.likes.userIdInvalid"));
        }

        // 自喜欢检查：不能喜欢自己
        const currentUserId = this.currentUserId;
        if (userId === currentUserId) {
          this.errorMessage = t("storeErrors.likes.cannotLikeSelf");
          throw new Error(t("storeErrors.likes.cannotLikeSelf"));
        }

        // 重复喜欢检查
        const alreadyLiked = this.likes.some((item) => item.userId === userId);
        if (alreadyLiked) {
          this.errorMessage = t("storeErrors.likes.alreadyLiked");
          throw new Error(t("storeErrors.likes.alreadyLiked"));
        }

        if (useMock()) {
          const target = mockLikedBy.find((item) => item.userId === userId);
          if (target) {
            this.likes.push({
              ...target,
              id: `like-${Date.now()}`,
              likedAt: new Date().toISOString(),
            });
          }
          return;
        }

        // SubTask 5.5.1：乐观更新 —— 先在本地追加，再同步服务端
        const target = this.likedBy.find((item) => item.userId === userId);
        // 快照 likes 列表（浅拷贝），用于失败时回滚
        const likesSnapshot = this.likes.slice();

        if (target) {
          // 立即更新本地状态，UI 即时反馈「已喜欢」
          this.likes.push({
            ...target,
            id: `like-${Date.now()}`,
            likedAt: new Date().toISOString(),
          });
        }

        try {
          // 调用后端 API: POST /api/matches/like
          // 后端请求体: { userId: Long, targetUserId: Long }
          await request<HeartSignalView>({
            url: "/matches/like",
            method: "POST",
            data: {
              userId: this.currentUserId,
              targetUserId: userId,
            },
          });
        } catch (apiError) {
          // SubTask 5.5.1：失败回滚 —— 恢复 likes 列表至乐观更新前的快照
          this.likes = likesSnapshot;
          throw apiError;
        }
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "喜欢用户失败";
        throw error;
      }
    },

    /**
     * 取消喜欢一个用户
     *
     * <p>SubTask 5.5.1：改为乐观更新模式。</p>
     * <ol>
     *   <li>参数校验</li>
     *   <li>快照本地 likes 列表，便于失败时回滚</li>
     *   <li>立即从本地 likes 列表移除目标用户（UI 即时反馈）</li>
     *   <li>调用后端 POST /api/matches/cancel-like 同步状态</li>
     *   <li>失败时回滚 likes 列表至快照，并向上抛出错误供 UI 提示</li>
     * </ol>
     *
     * @param userId - 目标用户 ID
     */
    async unlikeUser(userId: string) {
      this.errorMessage = null;

      try {
        // 参数校验
        if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
          this.errorMessage = t("storeErrors.likes.userIdInvalid");
          throw new Error(t("storeErrors.likes.userIdInvalid"));
        }

        if (useMock()) {
          this.likes = this.likes.filter((item) => item.userId !== userId);
          return;
        }

        // SubTask 5.5.1：乐观更新 —— 先本地移除，再同步服务端
        const likesSnapshot = this.likes.slice();
        // 立即从本地列表移除目标用户，UI 即时反馈「已取消喜欢」
        this.likes = this.likes.filter((item) => item.userId !== userId);

        try {
          // 调用后端 API: POST /api/matches/cancel-like
          // 后端请求体: { userId: Long, targetUserId: Long }
          await request<void>({
            url: "/matches/cancel-like",
            method: "POST",
            data: {
              userId: this.currentUserId,
              targetUserId: userId,
            },
          });
        } catch (apiError) {
          // SubTask 5.5.1：失败回滚 —— 恢复 likes 列表至乐观更新前的快照
          this.likes = likesSnapshot;
          throw apiError;
        }
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "取消喜欢失败";
        throw error;
      }
    },

    /**
     * 检查是否与指定用户互相喜欢
     * 如果双向喜欢，自动创建心动信号记录并发送通知
     * @param userId - 目标用户 ID
     * @returns 是否互相喜欢
     */
    checkMutualLike(userId: string): boolean {
      // 参数校验
      if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
        this.errorMessage = "用户 ID 无效";
        return false;
      }

      // 自喜欢检查
      const currentUserId = this.currentUserId;
      if (userId === currentUserId) {
        return false;
      }

      const hasLiked = this.likes.some((item) => item.userId === userId);
      const hasBeenLiked = this.likedBy.some((item) => item.userId === userId);
      const isMutual = hasLiked && hasBeenLiked;

      if (isMutual) {
        this.createHeartSignalForMutualLike(userId);
      }

      return isMutual;
    },

    /**
     * 为双向喜欢创建心动信号
     * @param targetUserId - 目标用户 ID
     */
    createHeartSignalForMutualLike(targetUserId: string) {
      // 避免重复创建
      const existing = this.heartSignals.find(
        (s) => s.fromUserId === targetUserId && s.status === "pending"
      );
      if (existing) {
        return;
      }

      const targetUser = this.likedBy.find((item) => item.userId === targetUserId);
      if (!targetUser) {
        return;
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24小时后过期

      const newSignal: HeartSignal = {
        id: `signal-${Date.now()}`,
        fromUserId: targetUser.userId,
        fromUserName: targetUser.name,
        fromUserAvatar: targetUser.avatar,
        toUserId: this.currentUserId, // 从 session store 获取当前用户 ID
        status: "pending",
        sentAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };

      this.heartSignals.push(newSignal);

      // 发送本地通知（uni-app）
      this.notifyHeartSignal(newSignal);
    },

    /**
     * 发送心动信号本地通知
     * @param signal - 心动信号
     */
    notifyHeartSignal(signal: HeartSignal) {
      try {
        // 使用 uni-app 通知 API
        uni.showToast({
          title: `与 ${signal.fromUserName} 互相喜欢了！`,
          icon: "none",
          duration: 3000,
        });

        // 可选：触发系统通知（需要权限）
        if (typeof uni.requestSubscribeMessage === "function") {
          // 小程序订阅消息（实际项目中使用）
          // 修复 no-console：双向喜欢通知日志改用 console.warn（允许的方法）
          console.warn(`[HeartSignal] 双向喜欢通知: ${signal.fromUserName}`);
        }
      } catch (error) {
        // 通知失败不应阻塞主流程
        console.warn("发送心动信号通知失败:", error);
      }
    },

    /**
     * 获取心动信号列表
     *
     * 修复（P1 BUG - 异步竞态）：新增 AbortController 取消在途的旧请求，
     * 避免快速重复调用时旧请求覆盖新请求结果。
     */
    async fetchHeartSignals() {
      // 修复（P1 BUG）：取消在途的旧请求，避免竞态条件
      if (fetchHeartSignalsController) {
        try {
          fetchHeartSignalsController.abort();
        } catch (_e) {
          // abort 失败时忽略
        }
        fetchHeartSignalsController = null;
      }
      const controller = new AbortController();
      fetchHeartSignalsController = controller;

      this.loading = true;
      this.errorMessage = null;

      try {
        if (useMock()) {
          // 修复：被取消的请求不修改状态
          if (controller.signal.aborted) return;
          this.heartSignals = [...mockHeartSignals];
          return;
        }

        // 调用后端 API: GET /api/matches/heart-signals?userId={userId}
        const data = await request<HeartSignalView[]>({
          url: `/matches/heart-signals?userId=${this.currentUserId}`,
          method: "GET",
          signal: controller.signal,
        });

        // 修复：请求返回后若已被取消，跳过状态修改
        if (controller.signal.aborted) return;

        this.heartSignals = data.map(mapToHeartSignal);
      } catch (error) {
        // 修复：被取消的请求不视为错误，不更新 errorMessage
        if (controller.signal.aborted) return;
        this.errorMessage = error instanceof Error ? error.message : "加载心动信号失败";
      } finally {
        // 修复：仅当当前 controller 仍是全局 controller 时才清 loading
        if (fetchHeartSignalsController === controller) {
          this.loading = false;
          fetchHeartSignalsController = null;
        }
      }
    },

    /**
     * 接受心动信号
     * @param signalId - 心动信号 ID
     */
    async acceptHeartSignal(signalId: string) {
      this.errorMessage = null;

      try {
        if (useMock()) {
          const signal = this.heartSignals.find((s) => s.id === signalId);
          if (signal) {
            signal.status = "accepted";
          }
          return;
        }

        // 调用后端 API: POST /api/matches/heart-signals/{signalId}/accept?userId={userId}
        await request<void>({
          url: `/matches/heart-signals/${signalId}/accept?userId=${this.currentUserId}`,
          method: "POST",
        });

        const signal = this.heartSignals.find((s) => s.id === signalId);
        if (signal) {
          signal.status = "accepted";
        }
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "接受心动信号失败";
        throw error;
      }
    },

    /**
     * 拒绝/忽略心动信号
     * @param signalId - 心动信号 ID
     */
    async declineHeartSignal(signalId: string) {
      this.errorMessage = null;

      try {
        if (useMock()) {
          const signal = this.heartSignals.find((s) => s.id === signalId);
          if (signal) {
            signal.status = "expired";
          }
          return;
        }

        // 调用后端 API: POST /api/matches/heart-signals/{signalId}/decline?userId={userId}
        await request<void>({
          url: `/matches/heart-signals/${signalId}/decline?userId=${this.currentUserId}`,
          method: "POST",
        });

        const signal = this.heartSignals.find((s) => s.id === signalId);
        if (signal) {
          signal.status = "expired";
        }
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "拒绝心动信号失败";
        throw error;
      }
    },

    /**
     * 标记访客为已读
     * @param visitorId - 访客记录 ID
     */
    markVisitorRead(visitorId: string) {
      const visitor = this.visitors.find((v) => v.id === visitorId);
      if (visitor) {
        visitor.isNew = false;
      }
    },

    /**
     * 添加匹配用户到「喜欢我的」列表
     * 由 discover store 在匹配成功时调用，使喜欢页能展示已匹配用户。
     * 若该用户已在列表中，则不重复添加。
     * @param user - 匹配用户基础信息
     */
    addMatchedUser(user: {
      userId: string;
      name: string;
      avatar: string;
      headline: string;
    }) {
      // 参数校验
      if (!user || !user.userId) return;

      // 已存在则跳过，避免重复
      const existing = this.likedBy.find((item) => item.userId === user.userId);
      if (existing) return;

      const newRecord: LikeRecord = {
        id: `match-${user.userId}-${Date.now()}`,
        userId: user.userId,
        name: user.name,
        avatar: user.avatar || "",
        headline: user.headline || "",
        likedAt: new Date().toISOString(),
      };

      // 插入列表头部，确保最新匹配优先展示
      this.likedBy.unshift(newRecord);
    },

    /**
     * 记录我发出的喜欢（无后端调用）
     * 由 discover store 在右滑/超级喜欢成功后调用，使「我发出的喜欢」列表
     * 能即时看到刚喜欢的用户，不触发重复 API 请求。
     * @param user - 目标用户基础信息
     */
    recordLikedUser(user: {
      userId: string;
      name: string;
      avatar: string;
      headline: string;
    }) {
      // 参数校验
      if (!user || !user.userId) return;

      // 已存在则跳过，避免重复
      const alreadyLiked = this.likes.some((item) => item.userId === user.userId);
      if (alreadyLiked) return;

      const newRecord: LikeRecord = {
        id: `like-${user.userId}-${Date.now()}`,
        userId: user.userId,
        name: user.name,
        avatar: user.avatar || "",
        headline: user.headline || "",
        likedAt: new Date().toISOString(),
      };

      // 插入列表头部，确保最新喜欢优先展示
      this.likes.unshift(newRecord);
    },

    /* ========== 功能1：批量操作 ========== */

    /**
     * 进入/退出批量模式
     * 进入时清空已选列表，退出时同样清空，避免残留状态
     * @param enabled - 是否进入批量模式
     */
    setBatchMode(enabled: boolean) {
      this.batchMode = !!enabled;
      if (!this.batchMode) {
        this.selectedIds = [];
      }
    },

    /**
     * 切换某用户的选中状态
     * @param userId - 用户 ID
     */
    toggleSelected(userId: string) {
      if (!userId) return;
      const idx = this.selectedIds.indexOf(userId);
      if (idx >= 0) {
        this.selectedIds.splice(idx, 1);
      } else {
        this.selectedIds.push(userId);
      }
    },

    /**
     * 全选当前列表（按传入的 userId 列表）
     * 用于「全选」按钮：调用方传入当前可见列表的所有 userId
     * @param userIds - 当前可见列表的用户 ID 数组
     */
    selectAll(userIds: string[]) {
      this.selectedIds = Array.from(new Set([...userIds]));
    },

    /**
     * 清空选中
     */
    clearSelected() {
      this.selectedIds = [];
    },

    /**
     * 批量操作（功能1核心）
     *
     * 支持三种操作类型：
     * - like: 批量喜欢（对 likedBy 列表中的多个用户同时发起喜欢）
     * - skip: 批量跳过（从 likedBy 列表移除，相当于"忽略"）
     * - cancel: 批量取消喜欢（从 likes 列表移除）
     *
     * 错误处理：
     * - 任一用户操作失败时记录到 errorMessage，但不中断后续用户操作
     * - 全部完成后，若存在失败项则抛出聚合错误，调用方可据此 toast 提示
     *
     * @param action - 操作类型：like / skip / cancel
     * @param userIds - 待操作的用户 ID 列表
     * @throws Error 当 userIds 为空或批量操作存在失败时抛出
     */
    async batchActions(action: BatchActionType, userIds: string[]): Promise<void> {
      // 参数校验
      if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new Error(t("storeErrors.likes.noSelectedUsers"));
      }
      // 防重复提交锁
      if (this.batchProcessing) {
        return;
      }
      this.batchProcessing = true;
      this.errorMessage = null;

      const failed: string[] = [];
      try {
        if (action === "like") {
          // 批量喜欢：对每个 userId 调用 likeUser
          for (const userId of userIds) {
            try {
              await this.likeUser(userId);
            } catch (_e) {
              failed.push(userId);
            }
          }
          // 操作完成后从 likedBy 列表移除已喜欢成功的用户
          this.likedBy = this.likedBy.filter((item) => !failed.includes(item.userId) && !userIds.includes(item.userId) || failed.includes(item.userId));
          // 已成功喜欢的从 likedBy 移除（避免重复展示）
          this.likedBy = this.likedBy.filter((item) => !userIds.includes(item.userId) || failed.includes(item.userId));
        } else if (action === "skip") {
          // 批量跳过：从 likedBy 列表移除选中项（前端操作，无后端调用）
          // mock 模式下直接操作本地状态；real 模式下后续可扩展批量 API
          if (useMock()) {
            this.likedBy = this.likedBy.filter((item) => !userIds.includes(item.userId));
          } else {
            // real 模式：批量调用 cancel-like 反向操作或新增 batch-skip 接口
            // 此处复用 unlikeUser（语义：从 likedBy 移除并不再展示）
            for (const userId of userIds) {
              try {
                // 跳过不发起喜欢，仅本地移除
                this.likedBy = this.likedBy.filter((item) => item.userId !== userId);
              } catch (_e) {
                failed.push(userId);
              }
            }
          }
        } else if (action === "cancel") {
          // 批量取消喜欢：从 likes 列表移除选中项
          for (const userId of userIds) {
            try {
              await this.unlikeUser(userId);
            } catch (_e) {
              failed.push(userId);
            }
          }
          // 兜底：确保本地状态一致
          this.likes = this.likes.filter((item) => !userIds.includes(item.userId) || failed.includes(item.userId));
        }

        // 操作完成清空选中
        this.selectedIds = [];

        if (failed.length > 0) {
          this.errorMessage = `部分操作失败（${failed.length}/${userIds.length}）`;
          throw new Error(this.errorMessage);
        }
      } finally {
        this.batchProcessing = false;
      }
    },

    /* ========== 功能2：搜索 ========== */

    /**
     * 设置搜索关键词（功能2）
     * 由 likes 页面搜索框（300ms 防抖）调用
     * @param query - 搜索关键词
     */
    setSearchQuery(query: string) {
      this.searchQuery = query ?? "";
    },
  },
});
