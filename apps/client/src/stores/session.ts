import { defineStore } from "pinia";
import { clientApi } from "../services/api";
import { appEnv } from "../services/env";
import { toLoginHeroView } from "../view-models/login";
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

/** Mock 登录主视觉配置 */
const mockLoginHero: LoginHeroConfig = {
  heroMode: "animation",
  heroVideoUrl: null,
  heroPosterUrl: null,
  heroAnimationTheme: "romantic",
  heroTitle: "遇见对的人",
  heroSubtitle: "校园恋爱，从这里开始",
  videoFallbackToAnimation: true,
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

export const useSessionStore = defineStore("session", {
  state: () => ({
    loading: false,
    /** 是否为离线状态（无法连接服务器） */
    isOffline: false,
    userSession: null as Awaited<ReturnType<typeof clientApi.getSession>> | null,
    loginHero: null as ReturnType<typeof toLoginHeroView> | null,
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
     * 资料是否已完善（所有必填项均完成）
     * 硬门槛：profileCompleted && campusVerified && scheduleCompleted
     */
    isProfileComplete: (state): boolean => {
      const session = state.userSession;
      if (!session) return false;
      return session.profileCompleted && session.campusVerified && session.scheduleCompleted;
    },
  },
  actions: {
    /**
     * 刷新用户会话
     * 包含离线状态检测
     */
    async refreshSession() {
      try {
        this.isOffline = false;

        if (useMock()) {
          // Mock 模式：使用本地硬编码的用户会话数据
          this.userSession = { ...mockUserSession };
        } else {
          this.userSession = await clientApi.getSession();
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
        await this.refreshSession();
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
  },
});
