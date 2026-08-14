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
    apiMode: "real",
    apiBaseUrl: "http://127.0.0.1:8080/api",
  },
  // bootstrap 失效 token 用例需走 real 分支（mock 分支不调 clientApi）
  isMockMode: () => false,
  isDev: false,
}));

// 2026-08-10 修复（R4-00205 env 迁移后测试失配）：session store 的 useMock()
// 来自 ../config/env（helpers/use-mock），测试此前只 mock 了旧路径 services/env，
// 导致 bootstrap 误走 mock 分支。此处补充 config/env 的 mock。
vi.mock("../../config/env", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    isMockMode: () => false,
    // R4-00166：失效 token 自动游客重登仅限 mock/开发模式（真实模式静默登出），
    // 本用例验证重登逻辑，故模拟开发环境。
    isDev: true,
    isShowcaseMode: false,
  };
});

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
  loginAsGuest: vi.fn(),
}));

(globalThis as any).uni = {
  getStorageSync: vi.fn(() => null),
  setStorageSync: vi.fn(),
  removeStorageSync: vi.fn(),
  showToast: vi.fn(),
};

import { MOCK_LOGIN_HERO } from "../../features/login/hero";

import { useSessionStore } from "../../stores/session";
import { clientApi } from "../../services/api";
import { loginAsGuest } from "../../services/auth";
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

describe("session store - bootstrap 失效 token 自动重登（401 雪崩修复）", () => {
  const guestSession = makeSession({
    userId: "user-1001",
    displayName: "体验用户",
    profileCompleted: true,
    campusVerified: true,
    scheduleCompleted: true,
    campusName: "北京大学",
  });

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    // 默认：storage 无 token（getSession 返回未登录态）
    vi.mocked(uni.getStorageSync).mockReturnValue(null);
    vi.mocked(clientApi.getLoginHero).mockResolvedValue(MOCK_LOGIN_HERO as any);
  });

  it("storage 残留过期 token 且 getSession 返回 loggedIn=false 时，清 token 并自动游客重登", async () => {
    const getStorageSync = vi.mocked(uni.getStorageSync);
    const removeStorageSync = vi.mocked(uni.removeStorageSync);

    // 场景复现：storage 里有昨天留下的过期 token（存储键为 "token"）
    getStorageSync.mockImplementation((key: string) =>
      key === "token" ? "expired-token-123" : null
    );
    vi.mocked(clientApi.getSession).mockResolvedValue(
      makeSession({ loggedIn: false, userId: null, token: null }) as any
    );
    vi.mocked(loginAsGuest).mockResolvedValue(guestSession as any);

    const store = useSessionStore();
    await store.bootstrap();

    // 过期 token 已被清除
    expect(removeStorageSync).toHaveBeenCalledWith("token");
    // 已用体验账号重新登录
    expect(loginAsGuest).toHaveBeenCalledTimes(1);
    expect(store.userSession?.loggedIn).toBe(true);
    expect(store.userSession?.userId).toBe("user-1001");
  });

  it("无本地 token 且 getSession 返回未登录时，不触发游客重登", async () => {
    vi.mocked(clientApi.getSession).mockResolvedValue(
      makeSession({ loggedIn: false, userId: null, token: null }) as any
    );

    const store = useSessionStore();
    await store.bootstrap();

    expect(loginAsGuest).not.toHaveBeenCalled();
    expect(store.userSession?.loggedIn).toBe(false);
  });

  it("token 仍有效（loggedIn=true）时，不触发游客重登", async () => {
    vi.mocked(uni.getStorageSync).mockReturnValue("valid-token-456");
    vi.mocked(clientApi.getSession).mockResolvedValue(guestSession as any);

    const store = useSessionStore();
    await store.bootstrap();

    expect(loginAsGuest).not.toHaveBeenCalled();
    expect(store.userSession?.userId).toBe("user-1001");
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
