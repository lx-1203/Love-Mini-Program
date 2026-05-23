import { defineStore } from "pinia";
import type { components } from "../services/generated/api-types";
import { appEnv } from "../services/env";
import { clientApi } from "../services/api";
import { useSessionStore } from "./session";

type Schemas = components["schemas"];

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
const mockProfileStats: Schemas["ProfileStats"] = {
  followingCount: 28,
  followersCount: 16,
  likesCount: 104,
};

/**
 * 检测当前是否为 Mock 模式
 */
function useMock(): boolean {
  return appEnv.apiMode === "mock";
}

/**
 * 深拷贝工具函数，避免 Mock 数据被直接修改
 */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * 个人资料 Store 状态
 */
export interface ProfileState {
  basicProfile: Awaited<ReturnType<typeof clientApi.getBasicProfile>> | null;
  campusProfile: Awaited<ReturnType<typeof clientApi.getCampusProfile>> | null;
  scheduleProfile: Awaited<ReturnType<typeof clientApi.getScheduleProfile>> | null;
  profileStats: Awaited<ReturnType<typeof clientApi.getProfileStats>> | null;
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
    loading: false,
    errorMessage: null,
  }),

  actions: {
    /**
     * 加载所有个人资料数据。
     * Mock 模式下返回本地硬编码数据，Real 模式下调用后端 API。
     */
    async load() {
      this.loading = true;
      this.errorMessage = null;

      try {
        if (useMock()) {
          this.basicProfile = clone(mockBasicProfile);
          this.campusProfile = clone(mockCampusProfile);
          this.scheduleProfile = clone(mockScheduleProfile);
          this.profileStats = clone(mockProfileStats);
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
      } catch (error) {
        this.errorMessage = error instanceof Error ? error.message : "加载个人资料失败";
        // 异常时确保数据不为 undefined
        this.basicProfile = this.basicProfile ?? null;
        this.campusProfile = this.campusProfile ?? null;
        this.scheduleProfile = this.scheduleProfile ?? null;
        this.profileStats = this.profileStats ?? null;
      } finally {
        this.loading = false;
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
        this.errorMessage = error instanceof Error ? error.message : "加载资料统计失败";
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
        this.errorMessage = error instanceof Error ? error.message : "保存基本资料失败";
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
        this.errorMessage = error instanceof Error ? error.message : "保存校园资料失败";
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
        this.errorMessage = error instanceof Error ? error.message : "保存日程资料失败";
        throw error;
      }
    },
  },
});
