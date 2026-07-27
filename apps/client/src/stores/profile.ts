import { defineStore } from "pinia";
import type { components } from "../services/generated/api-types";
import type { ProfileStats } from "../services/generated/api-types-supplement";
import { clientApi } from "../services/api";
// 导入 UniUploadFileLike 类型，统一上传方法签名，消除 File 类型在 mp-weixin 端的不兼容问题
import type { UniUploadFileLike } from "../services/api";
import { useSessionStore } from "./session";
import { useMock } from "./helpers/use-mock";
// SubTask 1.4.1：loadMyPosts 复用 village API 拉取当前用户发布的帖子
import { request } from "../services/http";
// i18n 翻译函数（SubTask 3.3.3：错误回退消息 i18n 化）
import { t } from "@/i18n";

type Schemas = components["schemas"];

/* ========== 视图模型类型 ========== */

/**
 * VIP 状态信息
 * 用于个人主页 VIP 徽章与卡片展示
 */
export interface VipStatus {
  /** 是否为 VIP */
  isVip: boolean;
  /** VIP 等级名称（如「月度会员」） */
  planName?: string;
  /** 到期时间（ISO 字符串） */
  expireDate?: string | null;
}

/**
 * 我的动态预览项（简化版，用于个人主页列表展示）
 */
export interface MyPostSummary {
  id: string;
  /** 帖子内容摘要（前 N 字） */
  summary: string;
  /** 点赞数 */
  likes: number;
  /** 评论数 */
  comments: number;
  /** 发布时间（ISO 字符串） */
  createdAt: string;
  /** 配图（首图，可空） */
  coverImage?: string;
}

/* ========== Mock 数据 ========== */

/** Mock 基本资料数据 */
const mockBasicProfile: Schemas["BasicProfile"] = {
  nickname: "星野",
  bio: "安静、好奇，更喜欢一对一慢慢聊。",
  grade: "大三",
  pronouns: "她/她",
};

/** Mock 校区资料数据 */
const mockCampusProfile: Schemas["CampusProfile"] = {
  city: "广州",
  campusName: "南校区",
  department: "工业设计",
  verificationStatus: "draft",
};

/** Mock 日程资料数据 */
const mockScheduleProfile: Schemas["ScheduleProfile"] = {
  preferredCampusArea: "图书馆和北草坪",
  preferredTimeWindows: ["今晚", "本周"],
  courseBlocks: [
    {
      id: "b-1",
      weekday: "周一",
      start: "09:00",
      end: "10:30",
      label: "设计课",
    },
    {
      id: "b-2",
      weekday: "周三",
      start: "14:00",
      end: "15:30",
      label: "专题讨论",
    },
  ],
};

/** Mock 个人统计数据 */
const mockProfileStats: ProfileStats = {
  followers: 16,
  following: 28,
  likes: 104,
  visitors: 50,
  posts: 12,
  followingCount: 28,
  followersCount: 16,
  likesCount: 104,
  visitorsCount: 50,
};

/** Mock VIP 状态（默认未开通，便于在主页展示开通卡片） */
const mockVipStatus: VipStatus = {
  isVip: false,
  planName: "",
  expireDate: null,
};

/** Mock 我的动态列表（个人主页预览用，最多展示 3 条） */
const mockMyPosts: MyPostSummary[] = [
  {
    id: "my-post-1",
    summary: "今天在图书馆遇到一只很亲人的橘猫，分享几张照片～",
    likes: 32,
    comments: 8,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "my-post-2",
    summary: "周末去看了场艺术展，被一幅画击中了，推荐给大家。",
    likes: 56,
    comments: 14,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: "my-post-3",
    summary: "整理了一下这学期的设计作业，复盘的过程很有收获。",
    likes: 21,
    comments: 5,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
];

/**
 * 深拷贝工具函数，避免 Mock 数据被直接修改
 */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * 当前 in-flight 的 load 请求 Promise（模块级单例）。
 *
 * 修复（P1 BUG）：原 load() 无并发守卫，组件 onShow 与 onMounted 同时触发
 * load() 时会发起两次完整 API 请求，响应顺序无法保证，
 * 后到的旧响应可能覆盖新响应，导致展示陈旧资料。
 * 现保存 in-flight 的 Promise，并发调用复用同一次请求，
 * 仅在请求完成后才允许下一次 load。
 */
let inflightLoadPromise: Promise<void> | null = null;

/**
 * 个人资料 Store 状态
 */
export interface ProfileState {
  basicProfile: Awaited<ReturnType<typeof clientApi.getBasicProfile>> | null;
  campusProfile: Awaited<ReturnType<typeof clientApi.getCampusProfile>> | null;
  scheduleProfile: Awaited<ReturnType<typeof clientApi.getScheduleProfile>> | null;
  profileStats: Awaited<ReturnType<typeof clientApi.getProfileStats>> | null;
  /** VIP 状态（用于个人主页徽章展示） */
  vipStatus: VipStatus | null;
  /** 我的动态预览列表（用于个人主页展示） */
  myPosts: MyPostSummary[];
  /** 照片墙 URL 数组（最多 6 张，Phase E3） */
  photoGallery: string[];
  /** 个人视频 URL（Phase E2） */
  personalVideoUrl: string;
  /** 是否正在加载 */
  loading: boolean;
  /** 错误信息 */
  errorMessage: string | null;
}

/**
 * 个人资料 Store
 *
 * 管理用户基本资料、校区资料、日程资料和统计数据。
 * 支持 Mock 模式和 Real 模式，Mock 模式下返回本地硬编码数据。
 */
export const useProfileStore = defineStore("profile", {
  state: (): ProfileState => ({
    basicProfile: null,
    campusProfile: null,
    scheduleProfile: null,
    profileStats: null,
    vipStatus: null,
    myPosts: [],
    photoGallery: [],
    personalVideoUrl: "",
    loading: false,
    errorMessage: null,
  }),

  actions: {
    /**
     * 加载所有个人资料数据。
     * Mock 模式下返回本地硬编码数据，Real 模式下调用后端 API。
     *
     * 修复：补充 vipStatus 与 myPosts 字段加载，确保个人主页可展示完整信息。
     *
     * 修复（P1 BUG）：新增并发守卫。组件 onShow 与 onMounted 可能同时触发 load()，
     * 原实现会发起两次完整 API 请求，响应顺序不可控，旧响应可能覆盖新响应。
     * 现保存 in-flight Promise，并发调用复用同一次请求，避免重复请求与状态错乱。
     */
    async load() {
      // 修复（P1 BUG）：并发守卫——若已有 in-flight 请求，复用其 Promise
      if (inflightLoadPromise) {
        return inflightLoadPromise;
      }

      const run = async () => {
        this.loading = true;
        this.errorMessage = null;

        try {
          if (useMock()) {
            this.basicProfile = clone(mockBasicProfile);
            this.campusProfile = clone(mockCampusProfile);
            this.scheduleProfile = clone(mockScheduleProfile);
            this.profileStats = clone(mockProfileStats);
            this.vipStatus = clone(mockVipStatus);
            this.myPosts = clone(mockMyPosts);
            return;
          }

          const [basic, campus, schedule, stats] = await Promise.all([
            clientApi.getBasicProfile(),
            clientApi.getCampusProfile(),
            clientApi.getScheduleProfile(),
            clientApi.getProfileStats(),
          ]);
          this.basicProfile = basic;
          this.campusProfile = campus;
          this.scheduleProfile = schedule;
          this.profileStats = stats;

          // SubTask 1.4.1：解析 vipStatus。
          // 当前后端 UserSession schema 暂未声明 vipStatus 字段，但实际响应可能已包含
          // （后端 DTO 扩展常常先于 OpenAPI 重新生成）。这里通过类型断言安全读取：
          // - 若响应包含 vipStatus 对象，则按其字段解析
          // - 否则回退到默认（未开通 VIP），保证 UI 不出现 undefined
          const session = useSessionStore();
          const sessionRaw = session.userSession as
            | {
                vipStatus?: {
                  isVip?: boolean;
                  planName?: string;
                  expireDate?: string | null;
                };
              }
            | null
            | undefined;
          const rawVip = sessionRaw?.vipStatus;
          this.vipStatus = {
            isVip: Boolean(rawVip?.isVip),
            planName: typeof rawVip?.planName === "string" ? rawVip.planName : "",
            expireDate:
              typeof rawVip?.expireDate === "string" || rawVip?.expireDate === null
                ? (rawVip.expireDate as string | null)
                : null,
          };

          // 我的动态：load() 不阻塞主流程，留空由 loadMyPosts() 按需拉取
          this.myPosts = this.myPosts ?? [];
        } catch (error) {
          this.errorMessage = error instanceof Error ? error.message : t("storeErrors.profile.loadProfileFailed");
          // 异常时确保数据不为 undefined
          this.basicProfile = this.basicProfile ?? null;
          this.campusProfile = this.campusProfile ?? null;
          this.scheduleProfile = this.scheduleProfile ?? null;
          this.profileStats = this.profileStats ?? null;
          this.vipStatus = this.vipStatus ?? { isVip: false, planName: "", expireDate: null };
          this.myPosts = this.myPosts ?? [];
        } finally {
          this.loading = false;
        }
      };

      // 保存 in-flight Promise，结束后清理
      inflightLoadPromise = run().finally(() => {
        inflightLoadPromise = null;
      });
      return inflightLoadPromise;
    },

    /**
     * 拉取个人主页数据（load 的语义别名，供 onShow 调用）。
     *
     * 修复：原页面仅 onMounted 调用 loadStats，切换 Tab 返回时不会刷新资料。
     * 现新增 fetchProfile 作为 onShow 入口，确保每次进入个人主页都能获取最新数据，
     * 同时保持与 load 的兼容（fetchProfile 内部委托 load，避免重复实现）。
     */
    async fetchProfile() {
      await this.load();
    },

    /**
     * SubTask 1.4.1：拉取当前用户的动态列表（个人主页"我的动态"模块）。
     *
     * <p>实现策略：</p>
     * <ul>
     *   <li>Mock 模式：直接返回 mockMyPosts，不发起网络请求</li>
     *   <li>Real 模式：复用后端 GET /api/posts?userId={currentUserId} 接口拉取当前用户发布的帖子，
     *       取前 3 条作为个人主页预览。后端响应字段映射到 MyPostSummary：
     *       id / content 截摘要 / likes / comments / createdAt / coverImage（首图）</li>
     *   <li>错误处理：失败时清空 myPosts 并设置 errorMessage，不抛出，避免阻塞页面渲染</li>
     * </ul>
     *
     * <p>设计考量：将 myPosts 拆分为独立 action 而非塞入 load()，原因：</p>
     * <ul>
     *   <li>个人主页首屏只需 basic/campus/schedule/stats + vipStatus，动态列表可懒加载</li>
     *   <li>用户进入"我的动态"分页时才需要完整列表，避免 load() 拉取冗余数据</li>
     *   <li>独立 action 便于失败重试，不影响主资料展示</li>
     * </ul>
     */
    async loadMyPosts() {
      this.errorMessage = null;
      try {
        if (useMock()) {
          this.myPosts = clone(mockMyPosts);
          return;
        }

        // Real 模式：从 sessionStore 获取当前用户 ID，调用 /posts?userId=... 拉取
        const sessionStore = useSessionStore();
        const userId = sessionStore.userSession?.userId;
        if (!userId) {
          // 未登录场景下没有"我的动态"可展示，清空即可
          this.myPosts = [];
          return;
        }

        // 后端 PostListResponse 结构（与 village store 一致），仅取所需字段
        type PostListItem = {
          id: string | number;
          content?: string;
          text?: string;
          title?: string;
          likeCount?: number;
          likes?: number;
          commentCount?: number;
          comments?: number;
          createdAt?: string;
          images?: string[];
        };
        type PostListResponse = {
          items?: PostListItem[];
          data?: PostListItem[];
          list?: PostListItem[];
        };

        const query = new URLSearchParams({
          userId: String(userId),
          page: "1",
          pageSize: "3",
        }).toString();
        const resp = await request<PostListResponse>({
          url: `/posts?${query}`,
          method: "GET",
        });

        const items = resp.items ?? resp.data ?? resp.list ?? [];
        this.myPosts = items.map((p): MyPostSummary => {
          const summary =
            (p.content && p.content.trim()) ||
            (p.text && p.text.trim()) ||
            (p.title && p.title.trim()) ||
            "";
          const truncated =
            summary.length > 50 ? summary.slice(0, 50) + "..." : summary;
          return {
            id: String(p.id),
            summary: truncated,
            likes: p.likeCount ?? p.likes ?? 0,
            comments: p.commentCount ?? p.comments ?? 0,
            createdAt: p.createdAt ?? new Date().toISOString(),
            coverImage: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : undefined,
          };
        });
      } catch (error) {
        // 失败时清空 myPosts，避免展示陈旧数据；记录 errorMessage 便于 UI 提示
        this.myPosts = [];
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.profile.loadMyPostsFailed");
      }
    },

    /**
     * 加载个人统计数据。
     */
    async loadStats() {
      this.errorMessage = null;
      try {
        if (useMock()) {
          this.profileStats = clone(mockProfileStats);
          return;
        }
        this.profileStats = await clientApi.getProfileStats();
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.profile.loadStatsFailed");
      }
    },

    /**
     * 保存基本资料。
     * Mock 模式下更新本地 Mock 数据并同步会话状态。
     */
    async saveBasicProfile(payload: Schemas["BasicProfileRequest"]) {
      this.errorMessage = null;
      try {
        if (useMock()) {
          const updated: Schemas["BasicProfile"] = {
            nickname: payload.nickname,
            bio: payload.bio,
            grade: payload.grade,
            pronouns: payload.pronouns,
          };
          this.basicProfile = clone(updated);
          await useSessionStore().refreshSession();
          return;
        }
        this.basicProfile = await clientApi.saveBasicProfile(payload);
        await useSessionStore().refreshSession();
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.profile.saveBasicFailed");
        throw error;
      }
    },

    /**
     * 保存校区资料。
     * Mock 模式下更新本地 Mock 数据，验证状态设为 pending。
     */
    async saveCampusProfile(payload: Parameters<typeof clientApi.saveCampusProfile>[0]) {
      this.errorMessage = null;
      try {
        if (useMock()) {
          const updated: Schemas["CampusProfile"] = {
            city: payload.city,
            campusName: payload.campusName,
            department: payload.department,
            verificationStatus: "pending",
          };
          this.campusProfile = clone(updated);
          await useSessionStore().refreshSession();
          return;
        }
        this.campusProfile = await clientApi.saveCampusProfile(payload);
        await useSessionStore().refreshSession();
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.profile.saveCampusFailed");
        throw error;
      }
    },

    /**
     * 保存日程资料。
     * Mock 模式下更新本地 Mock 数据。
     */
    async saveScheduleProfile(payload: Schemas["ScheduleProfileRequest"]) {
      this.errorMessage = null;
      try {
        if (useMock()) {
          const updated: Schemas["ScheduleProfile"] = {
            preferredCampusArea: payload.preferredCampusArea,
            preferredTimeWindows: payload.preferredTimeWindows,
            courseBlocks: payload.courseBlocks,
          };
          this.scheduleProfile = clone(updated);
          await useSessionStore().refreshSession();
          return;
        }
        this.scheduleProfile = await clientApi.saveScheduleProfile(payload);
        await useSessionStore().refreshSession();
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.profile.saveScheduleFailed");
        throw error;
      }
    },

    /**
     * 上传个人主页背景图（Phase E1 / H-10）。
     *
     * 调用 clientApi.uploadProfileBackground 上传至服务端，上传成功后：
     * - 更新 sessionStore.profileBackgroundUrl（驱动 profile 页面顶部背景渲染）
     * - 同步更新本地状态
     *
     * @param file - 图片文件（jpg/png/webp，≤10MB）
     * @returns 服务端返回的图片 URL
     */
    async uploadBackground(file: UniUploadFileLike): Promise<string> {
      this.errorMessage = null;
      try {
        const result = await clientApi.uploadProfileBackground(file);
        const url = result.url;
        // 同步更新 sessionStore.profileBackgroundUrl（同时持久化到本地存储）
        const sessionStore = useSessionStore();
        sessionStore.setProfileBackgroundUrl(url);
        return url;
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.profile.uploadBackgroundFailed");
        throw error;
      }
    },

    /**
     * 上传个人视频（Phase E2 / M-11）。
     *
     * 调用 clientApi.uploadProfileVideo 上传至服务端，上传成功后更新 personalVideoUrl 本地状态。
     *
     * @param file - 视频文件（mp4/mov，≤50MB，≤60s）
     * @returns 服务端返回的视频 URL
     */
    async uploadVideo(file: UniUploadFileLike): Promise<string> {
      this.errorMessage = null;
      try {
        const result = await clientApi.uploadProfileVideo(file);
        this.personalVideoUrl = result.url;
        return result.url;
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.profile.uploadVideoFailed");
        throw error;
      }
    },

    /**
     * 删除个人视频（Phase E2 / M-11）。
     *
     * 当前后端未提供独立的 DELETE /profile/video 接口，
     * 通过清空 personalVideoUrl 本地状态实现前端交互闭环。
     * 待后端补齐 DELETE 接口后，在此调用 clientApi.deleteProfileVideo()。
     */
    async removeVideo(): Promise<void> {
      this.errorMessage = null;
      try {
        // TODO: 后端补齐 DELETE /api/profile/video 后接入 clientApi.deleteProfileVideo()
        this.personalVideoUrl = "";
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.profile.deleteVideoFailed");
        throw error;
      }
    },

    /**
     * 上传照片墙指定索引（Phase E3 / H-08 补充）。
     *
     * 调用 clientApi.uploadProfilePhoto 上传至服务端，上传成功后更新 photoGallery。
     * photoGallery 为稠密数组：已上传的照片按顺序排列，无空槽位。
     * - 若 index === 当前长度：追加新照片
     * - 若 index < 当前长度：替换该位置照片（重新上传场景）
     *
     * @param file - 图片文件
     * @param index - 照片墙目标索引（0-5）
     * @returns 服务端返回的图片 URL
     */
    async uploadPhotoAtIndex(file: UniUploadFileLike, index: number): Promise<string> {
      if (index < 0 || index > 5) {
        throw new Error(t("storeErrors.profile.photoIndexOutOfRange"));
      }
      this.errorMessage = null;
      try {
        const result = await clientApi.uploadProfilePhoto(file, index);
        const url = result.url;
        const next = [...this.photoGallery];
        if (index < next.length) {
          // 替换现有位置
          next[index] = url;
        } else if (index === next.length) {
          // 追加到末尾
          next.push(url);
        } else {
          // index > next.length：跳过空位追加（不应出现在 UI 流程中）
          next.push(url);
        }
        this.photoGallery = next;
        return url;
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.profile.uploadPhotoFailed");
        throw error;
      }
    },

    /**
     * 删除照片墙指定索引（Phase E3 / H-08 补充）。
     *
     * 调用 clientApi.deleteProfilePhoto 删除服务端记录，并从本地 photoGallery 中移除。
     * 删除后后续照片前移，保持稠密数组结构。
     *
     * @param index - 照片墙索引（0 到 photoGallery.length-1）
     */
    async removePhotoAtIndex(index: number): Promise<void> {
      if (index < 0 || index >= this.photoGallery.length) {
        throw new Error(t("storeErrors.profile.photoIndexNotFound"));
      }
      this.errorMessage = null;
      try {
        await clientApi.deleteProfilePhoto(index);
        // 从数组中移除指定索引，并压缩（后续照片前移）
        this.photoGallery = [
          ...this.photoGallery.slice(0, index),
          ...this.photoGallery.slice(index + 1),
        ];
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : t("storeErrors.profile.deletePhotoFailed");
        throw error;
      }
    },
  },
});
