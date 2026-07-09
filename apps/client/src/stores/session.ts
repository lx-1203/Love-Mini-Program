import { defineStore } from "pinia";
import { clientApi } from "../services/api";
import { appEnv, isDev } from "../services/env";
import { toLoginHeroView } from "../view-models/login";
import { MOCK_LOGIN_HERO } from "../features/login/hero";
import type { components } from "../services/generated/api-types";

type Schemas = components["schemas"];
type UserSession = Schemas["UserSession"];
type LoginHeroConfig = Schemas["LoginHeroConfig"];

/** 判断当前是否为 Mock 模式 */
function useMock() {
  return appEnv.apiMode === "mock";
}

/* ========== Mock 数据 ========== */

/** Mock 用户会话数据 */
const mockUserSession: UserSession = {
  userId: "1",
  loggedIn: true,
  loginMethod: "wechat",
  displayName: "测试用户",
  phoneBound: false,
  profileCompleted: true,
  campusVerified: true,
  scheduleCompleted: true,
  campusName: "北京大学",
  featureFlags: {
    chat_ai_enabled: false,
  },
};

/** Mock 登录主视觉配置（引用 hero.ts 中的 mock 数据，确保视频背景生效） */
const mockLoginHero: LoginHeroConfig = {
  ...MOCK_LOGIN_HERO,
};

/**
 * 用户资料字段完善状态（用于细粒度完善度计算）
 */
export interface ProfileFieldStatus {
  avatar: boolean;
  nickname: boolean;
  gender: boolean;
  birthday: boolean;
  school: boolean;
  major: boolean;
  interestTags: boolean;
  bio: boolean;
}

/**
 * Session Store 持久化存储 Key。
 *
 * 用于将 profileBackgroundUrl / avatarUrl / nickname 等关键字段持久化到本地，
 * 以保证 H5 冷启动 / 刷新后背景图等视图状态不丢失。
 *
 * 注意：项目未引入 pinia-plugin-persistedstate，故采用 uni.setStorageSync 手动持久化。
 */
const SESSION_PERSIST_KEY = "session:persistent-fields";

/**
 * Session Store 持久化字段（仅持久化必要字段，避免泄漏完整会话）。
 */
interface SessionPersistedFields {
  profileBackgroundUrl: string;
}

/**
 * 从本地存储读取持久化字段，失败时返回空对象。
 */
function loadPersistedFields(): Partial<SessionPersistedFields> {
  try {
    const raw = uni.getStorageSync(SESSION_PERSIST_KEY);
    if (typeof raw === "string" && raw.length > 0) {
      const parsed = JSON.parse(raw) as Partial<SessionPersistedFields>;
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    }
  } catch (_e) {
    // 读取失败忽略，使用默认空值
  }
  return {};
}

/**
 * 将持久化字段写入本地存储，失败时静默忽略。
 */
function savePersistedFields(fields: SessionPersistedFields): void {
  try {
    uni.setStorageSync(SESSION_PERSIST_KEY, JSON.stringify(fields));
  } catch (_e) {
    // 写入失败忽略，避免阻塞业务流程
  }
}

// 启动时一次性读取持久化字段，作为 store 初始值
const initialPersisted = loadPersistedFields();

export const useSessionStore = defineStore("session", {
  state: () => ({
    loading: false,
    /** 是否为离线状态（无法连接服务器） */
    isOffline: false,
    userSession: null as Awaited<ReturnType<typeof clientApi.getSession>> | null,
    loginHero: null as ReturnType<typeof toLoginHeroView> | null,
    /**
     * 个人主页顶部背景图 URL（Phase D4 / Phase E1）
     * 字段名与后端 schema / fixtures / api-types-supplement 中的 profileBackgroundUrl 对齐。
     * 默认空字符串，空时使用品牌色渐变；非空时使用 <image> 渲染。
     *
     * 持久化策略：上传成功后通过 uni.setStorageSync 持久化，冷启动 / H5 刷新后从 storage 恢复，
     * 避免每次刷新都丢失背景图。refreshSession 时若后端 UserSession 携带 profileBackgroundUrl，
     * 优先使用后端返回值（向后兼容：UserSession schema 暂未暴露该字段，使用类型断言安全访问）。
     */
    profileBackgroundUrl: (initialPersisted.profileBackgroundUrl ?? "") as string,
  }),
  getters: {
    isLoggedIn: (state) => Boolean(state.userSession?.loggedIn),
    featureFlags: (state) => state.userSession?.featureFlags ?? {},
    completionState: (state) => ({
      profileCompleted: Boolean(state.userSession?.profileCompleted),
      campusCompleted: Boolean(state.userSession?.campusVerified),
      scheduleCompleted: Boolean(state.userSession?.scheduleCompleted),
    }),

    /**
     * 资料字段完善状态
     * 基于 userSession 中的 displayName / campusName 等推断
     * 实际项目中应由后端返回各字段状态
     */
    profileFieldStatus: (state): ProfileFieldStatus => {
      const session = state.userSession;
      if (!session) {
        return {
          avatar: false,
          nickname: false,
          gender: false,
          birthday: false,
          school: false,
          major: false,
          interestTags: false,
          bio: false,
        };
      }

      return {
        // 头像：以 profileCompleted 为代理（实际应有 avatarUrl 字段）
        avatar: session.profileCompleted,
        // 昵称：有 displayName 即算完成
        nickname: Boolean(session.displayName && session.displayName.trim().length > 0),
        // 性别、生日、专业、兴趣标签、简介：以 profileCompleted 为代理
        gender: session.profileCompleted,
        birthday: session.profileCompleted,
        // 学校：有 campusName 即算完成
        school: Boolean(session.campusName && session.campusName.trim().length > 0),
        major: session.profileCompleted,
        interestTags: session.profileCompleted,
        bio: session.profileCompleted,
      };
    },

    /**
     * 细粒度资料完善度百分比（0-100）
     * 权重：头像20%、昵称10%、性别10%、生日10%、学校20%、专业10%、兴趣标签10%、个人简介10%
     */
    profileCompletion: (state): number => {
      const session = state.userSession;
      if (!session) return 0;

      // 基础维度（三大模块）
      let completed = 0;
      if (session.profileCompleted) completed += 1;
      if (session.campusVerified) completed += 1;
      if (session.scheduleCompleted) completed += 1;
      const baseScore = Math.round((completed / 3) * 100);

      // 细粒度字段维度（仅用于展示，实际以三大模块为硬门槛）
      const fields = {
        avatar: session.profileCompleted ? 20 : 0,
        nickname: Boolean(session.displayName && session.displayName.trim().length > 0) ? 10 : 0,
        gender: session.profileCompleted ? 10 : 0,
        birthday: session.profileCompleted ? 10 : 0,
        school: Boolean(session.campusName && session.campusName.trim().length > 0) ? 20 : 0,
        major: session.profileCompleted ? 10 : 0,
        interestTags: session.profileCompleted ? 10 : 0,
        bio: session.profileCompleted ? 10 : 0,
      };

      const detailScore = Object.values(fields).reduce((sum, v) => sum + v, 0);

      // 取两者较小值，确保硬门槛优先；边界值检查确保不超100
      const rawScore = Math.min(baseScore, detailScore);
      return Math.max(0, Math.min(100, rawScore));
    },

    /**
     * 资料是否已完善（资料完善硬门槛）
     *
     * 修复（P0 BUG）：原逻辑要求 profileCompleted && campusVerified && scheduleCompleted，
     * 与 session-guard 的 `snapshot.profileCompleted` 判定不一致，导致用户完成资料完善后，
     * profile-guard 与页面 LockScreen 仍因 campus/schedule 未完成而锁定村口/我的等页面。
     *
     * 现统一为仅判定 `profileCompleted`，与 session-guard、page-access.ts 的 requiresProfile 保持一致。
     * campus/schedule 的硬门槛由各自的 requiresCampus / requiresSchedule 控制，不再耦合在资料判定里。
     */
    isProfileComplete: (state): boolean => {
      const session = state.userSession;
      if (!session) return false;
      // 修复（P0 BUG）：原逻辑要求 profileCompleted && campusVerified && scheduleCompleted，
      // 与 session-guard 的 snapshot.profileCompleted 判定不一致，导致用户完成资料完善后
      // profile-guard 与页面 LockScreen 仍因 campus/schedule 未完成而锁定村口/我的等页面。
      // 现统一为仅判定 profileCompleted，与 session-guard、page-access.ts 的 requiresProfile 保持一致。
      // campus/schedule 硬门槛由各自的 requiresCampus / requiresSchedule 控制，不再耦合在资料判定里。
      const result = Boolean(session.profileCompleted);
      if (isDev) {
        console.debug("[SessionStore] isProfileComplete 判定:", {
          profileCompleted: session.profileCompleted,
          result,
        });
      }
      return result;
    },

    /**
     * 是否已完成校园认证（用于课表等仅在校生可用的功能守卫）
     * 基于 userSession.campusVerified 字段判定
     */
    isCampusVerified: (state): boolean => {
      return Boolean(state.userSession?.campusVerified);
    },
  },
  actions: {
    /**
     * 刷新用户会话
     * 包含离线状态检测
     *
     * 修复（E1.1）：将 userSession.profileBackgroundUrl 同步到 store.profileBackgroundUrl，
     * 保证后端返回背景图 URL 时前端状态一致；同时持久化到本地存储以支撑冷启动 / H5 刷新场景。
     */
    async refreshSession() {
      try {
        this.isOffline = false;

        if (useMock()) {
          // Mock 模式：调用 API 获取最新的会话数据（支持测试 mock）
          this.userSession = await clientApi.getSession();
        } else {
          this.userSession = await clientApi.getSession();
        }

        // 同步 profileBackgroundUrl：后端 UserSession schema 暂未暴露此字段，
        // 使用类型断言安全访问，避免 TS 编译错误。若后端补字段后可移除断言。
        const bgUrl = (
          this.userSession as { profileBackgroundUrl?: string } | null
        )?.profileBackgroundUrl;
        if (typeof bgUrl === "string") {
          this.profileBackgroundUrl = bgUrl;
        }

        // 持久化到本地存储，保证 H5 刷新 / 冷启动后背景图不丢失
        savePersistedFields({
          profileBackgroundUrl: this.profileBackgroundUrl,
        });

        // 开发模式日志：便于排查完善度状态变化（资料保存后是否同步更新）
        if (isDev && this.userSession) {
          console.debug("[SessionStore] refreshSession 完成:", {
            profileCompleted: this.userSession.profileCompleted,
            campusVerified: this.userSession.campusVerified,
            scheduleCompleted: this.userSession.scheduleCompleted,
            isProfileComplete: this.isProfileComplete,
          });
        }

        return this.userSession;
      } catch (error) {
        this.isOffline = true;
        console.warn("[SessionStore] 刷新会话失败，可能处于离线状态:", error);
        throw error;
      }
    },

    /**
     * 应用启动初始化
     * 包含离线状态处理
     */
    async bootstrap() {
      this.loading = true;
      try {
        this.isOffline = false;

        if (useMock()) {
          // Mock 模式：使用本地硬编码的登录主视觉和用户会话数据
          this.loginHero = toLoginHeroView({ ...mockLoginHero });
          this.userSession = { ...mockUserSession };
        } else {
          const [hero, session] = await Promise.all([
            clientApi.getLoginHero(),
            clientApi.getSession(),
          ]);
          this.loginHero = toLoginHeroView(hero);
          this.userSession = session;
        }
      } catch (error) {
        this.isOffline = true;
        console.warn("[SessionStore] 初始化失败，进入离线模式:", error);
        // 离线模式下不清空已有数据
        if (!this.userSession) {
          this.userSession = null;
        }
      } finally {
        this.loading = false;
      }
    },

    /**
     * 微信登录
     * @param code - 微信授权码
     */
    async loginWithWechat(code = "mock-code") {
      try {
        this.isOffline = false;

        if (useMock()) {
          // Mock 模式：模拟登录成功，返回已登录的用户会话数据
          this.userSession = { ...mockUserSession, loggedIn: true };
        } else {
          this.userSession = await clientApi.loginWithWechat(code);
        }

        return this.userSession;
      } catch (error) {
        this.isOffline = true;
        console.warn("[SessionStore] 登录失败，可能处于离线状态:", error);
        throw error;
      }
    },

    /**
     * 更新资料完善度
     * 用于在资料编辑完成后重新计算完善度
     */
    async updateProfileCompletion() {
      this.loading = true;
      try {
        if (isDev) {
          console.debug("[SessionStore] updateProfileCompletion 触发，准备刷新会话");
        }
        await this.refreshSession();
        if (isDev) {
          console.debug("[SessionStore] updateProfileCompletion 完成:", {
            isProfileComplete: this.isProfileComplete,
            profileCompletion: this.profileCompletion,
          });
        }
      } catch (error) {
        console.warn("[SessionStore] 更新资料完善度失败:", error);
      } finally {
        this.loading = false;
      }
    },

    /**
     * 设置离线状态
     * @param offline - 是否离线
     */
    setOfflineStatus(offline: boolean) {
      this.isOffline = offline;
      if (!offline) {
        // 恢复在线时自动刷新会话
        this.refreshSession().catch(() => {
          console.warn("[SessionStore] 恢复在线后刷新会话失败");
        });
      }
    },

    /**
     * 设置个人主页背景图 URL（Phase E1）。
     *
     * 由 profileStore.uploadBackground 调用，更新状态的同时持久化到本地存储，
     * 保证 H5 刷新 / 冷启动后背景图不丢失。
     *
     * @param url - 背景图 URL（空字符串表示清除）
     */
    setProfileBackgroundUrl(url: string) {
      this.profileBackgroundUrl = url;
      savePersistedFields({
        profileBackgroundUrl: this.profileBackgroundUrl,
      });
    },
  },
});
