import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

/**
 * Session Store 单元测试。
 *
 * SubTask 1.4.2：重点覆盖 profileCompletion 加权平均算法。
 *
 * 修复前的实现使用 `Math.min(baseScore, detailScore)`，导致用户即使填完
 * 所有细粒度字段，只要三大模块任一未完成，完善度就会被压低到 33% / 67%。
 *
 * 修复后改为纯加权平均算法：按字段权重累加得分，权重总和为 100，
 * 每个字段完成则加上对应权重，未完成则加 0。
 *
 * 权重分配（合计 100）：
 * - 头像 20%
 * - 昵称 10%
 * - 性别 10%
 * - 生日 10%
 * - 学校 20%
 * - 专业 10%
 * - 兴趣标签 10%
 * - 个人简介 10%
 */
vi.mock("../../services/env", () => ({
  appEnv: {
    apiMode: "mock",
    apiBaseUrl: "http://127.0.0.1:8080/api",
  },
  isMockMode: () => true,
  isDev: false,
}));

vi.mock("../../services/api", () => ({
  clientApi: {
    getBasicProfile: vi.fn(),
    getCampusProfile: vi.fn(),
    getScheduleProfile: vi.fn(),
    getProfileStats: vi.fn(),
    saveBasicProfile: vi.fn(),
    saveCampusProfile: vi.fn(),
    saveScheduleProfile: vi.fn(),
    getLoginHero: vi.fn(),
    getSession: vi.fn(),
    loginWithWechat: vi.fn(),
  },
}));

vi.mock("../../services/sentry", () => ({
  setUser: vi.fn(),
  clearUser: vi.fn(),
}));

vi.mock("../../services/auth", () => ({
  loginWithWechat: vi.fn(),
}));

(globalThis as any).uni = {
  getStorageSync: vi.fn(() => null),
  setStorageSync: vi.fn(),
  showToast: vi.fn(),
};

import { useSessionStore } from "../../stores/session";
import type { components } from "../../services/generated/api-types";

type UserSession = components["schemas"]["UserSession"];

describe("session store - profileCompletion 加权平均算法（SubTask 1.4.2）", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  // ------------------------------------------------------------------
  // 边界场景
  // ------------------------------------------------------------------
  it("userSession 为 null 时返回 0", () => {
    const store = useSessionStore();
    // 初始状态：userSession 为 null
    expect(store.profileCompletion).toBe(0);
  });

  it("所有字段都未完成时返回 0", () => {
    const store = useSessionStore();
    store.userSession = makeSession({
      profileCompleted: false,
      displayName: "",
      campusName: null,
    });
    expect(store.profileCompletion).toBe(0);
  });

  it("所有字段都完成时返回 100（权重总和）", () => {
    const store = useSessionStore();
    store.userSession = makeSession({
      profileCompleted: true,
      displayName: "星野",
      campusName: "北京大学",
    });
    expect(store.profileCompletion).toBe(100);
  });

  // ------------------------------------------------------------------
  // SubTask 1.4.2 关键修复点：单一模块未完成不应再被压低
  // ------------------------------------------------------------------
  it("profileCompleted=false 但其他字段都完成时，不应被压低到 0", () => {
    /**
     * 修复前的 bug：使用 Math.min(baseScore, detailScore) 时，
     * profileCompleted=false 会导致 baseScore=0，从而 profileCompletion=0，
     * 用户填完所有细粒度字段依然显示 0% 完善度。
     *
     * 修复后：profileCompleted 仅作为头像/性别/生日/专业/兴趣/简介的代理字段，
     * 各字段独立计分；displayName 与 campusName 直接基于实际值判定。
     *
     * 此场景：profileCompleted=false 时：
     * - 头像 0 / 昵称 10 / 性别 0 / 生日 0 / 学校 20 / 专业 0 / 兴趣 0 / 简介 0
     * - 总分：30
     */
    const store = useSessionStore();
    store.userSession = makeSession({
      profileCompleted: false,
      displayName: "星野",
      campusName: "北京大学",
    });
    expect(store.profileCompletion).toBe(30);
  });

  it("仅 displayName 完成时返回 10（昵称权重）", () => {
    const store = useSessionStore();
    store.userSession = makeSession({
      profileCompleted: false,
      displayName: "星野",
      campusName: null,
    });
    expect(store.profileCompletion).toBe(10);
  });

  it("仅 campusName 完成时返回 20（学校权重）", () => {
    const store = useSessionStore();
    store.userSession = makeSession({
      profileCompleted: false,
      displayName: "",
      campusName: "北京大学",
    });
    expect(store.profileCompletion).toBe(20);
  });

  it("仅 profileCompleted=true 时返回 70（除昵称/学校外的代理字段权重和）", () => {
    /**
     * profileCompleted=true 时以下字段均视为完成（各为代理字段）：
     * - 头像 20
     * - 性别 10
     * - 生日 10
     * - 专业 10
     * - 兴趣标签 10
     * - 个人简介 10
     * 合计：70
     *
     * 昵称/学校独立判定，未完成则不计分。
     */
    const store = useSessionStore();
    store.userSession = makeSession({
      profileCompleted: true,
      displayName: "",
      campusName: null,
    });
    expect(store.profileCompletion).toBe(70);
  });

  it("displayName 仅含空白字符时不算完成", () => {
    const store = useSessionStore();
    store.userSession = makeSession({
      profileCompleted: false,
      displayName: "   ",
      campusName: null,
    });
    expect(store.profileCompletion).toBe(0);
  });

  it("campusName 为空字符串时不算完成", () => {
    const store = useSessionStore();
    store.userSession = makeSession({
      profileCompleted: false,
      displayName: "星野",
      campusName: "",
    });
    // 仅昵称完成：10
    expect(store.profileCompletion).toBe(10);
  });

  // ------------------------------------------------------------------
  // isProfileComplete 修复点（P0 BUG）
  // ------------------------------------------------------------------
  describe("isProfileComplete（P0 BUG 修复：仅判定 profileCompleted）", () => {
    it("profileCompleted=true 时返回 true，不再要求 campus/schedule", () => {
      const store = useSessionStore();
      store.userSession = makeSession({
        profileCompleted: true,
        campusVerified: false,
        scheduleCompleted: false,
      });
      /**
       * 修复前的 bug：原逻辑要求 profileCompleted && campusVerified && scheduleCompleted，
       * 与 session-guard 的 snapshot.profileCompleted 判定不一致，导致用户完成资料后
       * 仍被 LockScreen 锁定。现统一为仅判定 profileCompleted。
       */
      expect(store.isProfileComplete).toBe(true);
    });

    it("profileCompleted=false 时返回 false", () => {
      const store = useSessionStore();
      store.userSession = makeSession({
        profileCompleted: false,
        campusVerified: true,
        scheduleCompleted: true,
      });
      expect(store.isProfileComplete).toBe(false);
    });

    it("userSession 为 null 时返回 false", () => {
      const store = useSessionStore();
      expect(store.isProfileComplete).toBe(false);
    });
  });

  // ------------------------------------------------------------------
  // 边界值保护
  // ------------------------------------------------------------------
  it("profileCompletion 永远在 0-100 范围内", () => {
    const store = useSessionStore();
    // 各种状态组合
    const cases: Array<{ profileCompleted: boolean; displayName: string; campusName: string | null }> = [
      { profileCompleted: false, displayName: "", campusName: null },
      { profileCompleted: true, displayName: "星野", campusName: "北京大学" },
      { profileCompleted: false, displayName: "星野", campusName: "北京大学" },
      { profileCompleted: true, displayName: "", campusName: null },
    ];
    for (const c of cases) {
      store.userSession = makeSession(c);
      expect(store.profileCompletion).toBeGreaterThanOrEqual(0);
      expect(store.profileCompletion).toBeLessThanOrEqual(100);
    }
  });
});

// ------------------------------------------------------------------
// 辅助：构造 UserSession 对象
// ------------------------------------------------------------------
function makeSession(overrides: Partial<UserSession>): UserSession {
  return {
    userId: "1",
    loggedIn: true,
    loginMethod: "wechat",
    displayName: "测试用户",
    phoneBound: false,
    profileCompleted: false,
    campusVerified: false,
    scheduleCompleted: false,
    campusName: null,
    featureFlags: {
      chat_ai_enabled: false,
    },
    ...overrides,
  } as UserSession;
}
