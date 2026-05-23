import { defineStore } from "pinia";
import { appEnv } from "../services/env";
import { request } from "../services/http";
import { useSessionStore } from "./session";

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
}

/* ========== Mock 数据 ========== */

const mockLikes: LikeRecord[] = [
  {
    id: "like-1",
    userId: "user-2001",
    name: "林夕",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Linxi&backgroundColor=c0aede",
    headline: "中山大学 · 大二 · 喜欢电影和咖啡",
    likedAt: "2026-05-20T14:30:00Z",
  },
  {
    id: "like-2",
    userId: "user-2002",
    name: "陈默",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Chenmo&backgroundColor=d1d4f9",
    headline: "华南理工 · 大三 · 自习搭子",
    likedAt: "2026-05-19T10:15:00Z",
  },
];

const mockLikedBy: LikeRecord[] = [
  {
    id: "like-3",
    userId: "user-2003",
    name: "苏晴",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Suqing&backgroundColor=ffdfbf",
    headline: "中山大学 · 大一 · 摄影爱好者",
    likedAt: "2026-05-20T16:45:00Z",
  },
  {
    id: "like-4",
    userId: "user-2004",
    name: "周然",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Zhouran&backgroundColor=c0aede",
    headline: "华南理工 · 研一 · 喜欢夜跑",
    likedAt: "2026-05-18T09:20:00Z",
  },
  {
    id: "like-5",
    userId: "user-2006",
    name: "叶知秋",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Yezhiqu&backgroundColor=b6e3f4",
    headline: "暨南大学 · 大二 · 文学系",
    likedAt: "2026-05-17T20:10:00Z",
  },
  {
    id: "like-6",
    userId: "user-2007",
    name: "沈星河",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Shenxinghe&backgroundColor=d1d4f9",
    headline: "广东工业 · 大三 · 篮球队",
    likedAt: "2026-05-16T14:00:00Z",
  },
];

const mockVisitors: VisitorRecord[] = [
  {
    id: "visit-1",
    userId: "user-2003",
    name: "苏晴",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Suqing&backgroundColor=ffdfbf",
    headline: "中山大学 · 大一 · 摄影爱好者",
    visitedAt: "2026-05-20T16:45:00Z",
    isNew: true,
  },
  {
    id: "visit-2",
    userId: "user-2005",
    name: "顾言",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Guyan&backgroundColor=ffd5dc",
    headline: "星海音乐 · 大二 · 音乐社",
    visitedAt: "2026-05-19T08:00:00Z",
    isNew: false,
  },
  {
    id: "visit-3",
    userId: "user-2008",
    name: "江晚吟",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jiangwanyin&backgroundColor=ffdfbf",
    headline: "华南师范 · 大一 · 舞蹈队",
    visitedAt: "2026-05-15T18:30:00Z",
    isNew: false,
  },
];

const mockHeartSignals: HeartSignal[] = [
  {
    id: "signal-1",
    fromUserId: "user-2003",
    fromUserName: "苏晴",
    fromUserAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Suqing&backgroundColor=ffdfbf",
    toUserId: "user-1001",
    status: "pending",
    sentAt: "2026-05-20T16:45:00Z",
    expiresAt: "2026-05-21T16:45:00Z",
  },
  {
    id: "signal-2",
    fromUserId: "user-2006",
    fromUserName: "叶知秋",
    fromUserAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Yezhiqu&backgroundColor=b6e3f4",
    toUserId: "user-1001",
    status: "pending",
    sentAt: "2026-05-17T20:10:00Z",
    expiresAt: "2026-05-18T20:10:00Z",
  },
];

function useMock() {
  return appEnv.apiMode === "mock";
}

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
      } catch {
        return "user-1001";
      }
    },
  },

  actions: {
    /**
     * 获取我发出的喜欢列表和喜欢我的列表
     */
    async fetchLikes() {
      this.loading = true;
      this.errorMessage = null;

      try {
        if (useMock()) {
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
        });
        this.likedBy = likedByData.map(mapToLikeRecord);

        // 调用后端 API: GET /api/matches/my-likes?userId={userId}
        const myLikesData = await request<LikedUserView[]>({
          url: `/matches/my-likes?userId=${this.currentUserId}`,
          method: "GET",
        });
        this.likes = myLikesData.map(mapToLikeRecord);
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "加载喜欢列表失败";
        // 异常时确保列表不为 undefined
        this.likes = this.likes.length > 0 ? this.likes : [];
        this.likedBy = this.likedBy.length > 0 ? this.likedBy : [];
      } finally {
        this.loading = false;
      }
    },

    /**
     * 获取访客记录
     */
    async fetchVisitors() {
      this.loading = true;
      this.errorMessage = null;

      try {
        if (useMock()) {
          this.visitors = [...mockVisitors];
          return;
        }

        // 调用后端 API: GET /api/matches/visitors?userId={userId}
        const data = await request<VisitorView[]>({
          url: `/matches/visitors?userId=${this.currentUserId}`,
          method: "GET",
        });
        this.visitors = data.map(mapToVisitorRecord);
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "加载访客记录失败";
        this.visitors = [];
      } finally {
        this.loading = false;
      }
    },

    /**
     * 喜欢一个用户
     * @param userId - 目标用户 ID
     */
    async likeUser(userId: string) {
      this.errorMessage = null;

      try {
        // 参数校验：userId 不能为空
        if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
          this.errorMessage = "用户 ID 无效";
          throw new Error("用户 ID 无效");
        }

        // 自喜欢检查：不能喜欢自己
        const currentUserId = this.currentUserId;
        if (userId === currentUserId) {
          this.errorMessage = "不能喜欢自己哦";
          throw new Error("不能喜欢自己哦");
        }

        // 重复喜欢检查
        const alreadyLiked = this.likes.some((item) => item.userId === userId);
        if (alreadyLiked) {
          this.errorMessage = "你已经喜欢过该用户了";
          throw new Error("你已经喜欢过该用户了");
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

        // 更新本地状态
        const target = this.likedBy.find((item) => item.userId === userId);
        if (target) {
          this.likes.push({
            ...target,
            id: `like-${Date.now()}`,
            likedAt: new Date().toISOString(),
          });
        }
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "喜欢用户失败";
        throw error;
      }
    },

    /**
     * 取消喜欢一个用户
     * @param userId - 目标用户 ID
     */
    async unlikeUser(userId: string) {
      this.errorMessage = null;

      try {
        // 参数校验
        if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
          this.errorMessage = "用户 ID 无效";
          throw new Error("用户 ID 无效");
        }

        if (useMock()) {
          this.likes = this.likes.filter((item) => item.userId !== userId);
          return;
        }

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

        this.likes = this.likes.filter((item) => item.userId !== userId);
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
          title: `💕 与 ${signal.fromUserName} 互相喜欢了！`,
          icon: "none",
          duration: 3000,
        });

        // 可选：触发系统通知（需要权限）
        if (typeof uni.requestSubscribeMessage === "function") {
          // 小程序订阅消息（实际项目中使用）
          console.log(`[HeartSignal] 双向喜欢通知: ${signal.fromUserName}`);
        }
      } catch (error) {
        // 通知失败不应阻塞主流程
        console.warn("发送心动信号通知失败:", error);
      }
    },

    /**
     * 获取心动信号列表
     */
    async fetchHeartSignals() {
      this.loading = true;
      this.errorMessage = null;

      try {
        if (useMock()) {
          this.heartSignals = [...mockHeartSignals];
          return;
        }

        // 调用后端 API: GET /api/matches/heart-signals?userId={userId}
        const data = await request<HeartSignalView[]>({
          url: `/matches/heart-signals?userId=${this.currentUserId}`,
          method: "GET",
        });
        this.heartSignals = data.map(mapToHeartSignal);
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "加载心动信号失败";
      } finally {
        this.loading = false;
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
     * 标记访客为已读
     * @param visitorId - 访客记录 ID
     */
    markVisitorRead(visitorId: string) {
      const visitor = this.visitors.find((v) => v.id === visitorId);
      if (visitor) {
        visitor.isNew = false;
      }
    },
  },
});
