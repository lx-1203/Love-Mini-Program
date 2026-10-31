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
    // bootstrap 失效 token 用例需走 real 分支（mock 分支不调 clientApi）
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
    logout: vi.fn(),
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
  getStorageInfoSync: vi.fn(() => ({ keys: [], currentSize: 0, limitSize: 0 })),
  showToast: vi.fn(),
};

import {
  STORAGE_KEYS,
  DEVICE_SCOPED_STORAGE_KEYS,
} from "../../constants/storage-keys";

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
      displayName: "林晓",
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
      displayName: "林晓",
      campusName: "北京大学",
    });
    expect(store.profileCompletion).toBe(30);
  });

  it("仅 displayName 完成时返回 10（昵称权重）", () => {
    const store = useSessionStore();
    store.userSession = makeSession({
      profileCompleted: false,
      displayName: "林晓",
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
      displayName: "林晓",
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
      { profileCompleted: true, displayName: "林晓", campusName: "北京大学" },
      { profileCompleted: false, displayName: "林晓", campusName: "北京大学" },
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
    displayName: "林晓",
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

  // 2026-08-23 行为变更（session store R4-00166 收紧）：检测到失效 token 时仅清除
  // 并落地未登录态，不再自动游客重登（防止真实模式数据串号，用户需手动走体验号入口）。
  it("storage 残留过期 token 且 getSession 返回 loggedIn=false 时，清 token 并落地未登录态（不自动游客重登）", async () => {
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
    // 不再自动切换体验账号（R4-00166：避免 A 用户 token 失效后被当体验账号写入数据）
    expect(loginAsGuest).not.toHaveBeenCalled();
    // 落地为未登录态
    expect(store.userSession?.loggedIn ?? false).toBe(false);
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
// P1 修复 1（2026-10-31）：登出必须清掉账号级本地存储
// P2 修复 6（2026-10-31）：冷启动非鉴权关键调用不得否决会话
// ------------------------------------------------------------------
describe("session store - logout 本地存储清理（P1 修复 1）", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("logout 移除用户级存储键（草稿/搜索历史/隐藏消息 ID/已看记录/定位城市…）", async () => {
    const removeStorageSync = vi.mocked(uni.removeStorageSync);
    const store = useSessionStore();
    store.userSession = makeSession({ loggedIn: true });

    await store.logout();

    for (const key of [
      STORAGE_KEYS.CHAT_DRAFT,
      STORAGE_KEYS.DELETED_MESSAGE_IDS,
      STORAGE_KEYS.DISCOVER_SWIPE_HISTORY,
      STORAGE_KEYS.SEARCH_HISTORY,
      STORAGE_KEYS.VILLAGE_POST_DRAFT,
      STORAGE_KEYS.NEARBY_CITY,
      // 本次收编登记的真实写入键
      STORAGE_KEYS.DISCOVER_DAILY_RECORD,
      STORAGE_KEYS.ASSISTANT_ACTIVITY_NOTIFY,
      STORAGE_KEYS.SESSION_PERSISTED_FIELDS,
      STORAGE_KEYS.TABBAR_CHAT_UNREAD,
      STORAGE_KEYS.CHECKIN_LAST_DATE,
    ]) {
      expect(removeStorageSync, `登出应清除 ${key}`).toHaveBeenCalledWith(key);
    }
  });

  it("logout 不清设备级偏好（主题/语言/引导已读标记跨账号保留）", async () => {
    const removeStorageSync = vi.mocked(uni.removeStorageSync);
    const store = useSessionStore();

    await store.logout();

    for (const key of DEVICE_SCOPED_STORAGE_KEYS) {
      expect(removeStorageSync, `设备级键 ${key} 不应被清除`).not.toHaveBeenCalledWith(key);
    }
  });

  it("后端登出接口异常时本地清理照常执行（登出不依赖远端成功）", async () => {
    vi.mocked(clientApi.logout).mockRejectedValue(new Error("后端 500"));
    const removeStorageSync = vi.mocked(uni.removeStorageSync);
    const store = useSessionStore();

    await store.logout();

    expect(removeStorageSync).toHaveBeenCalledWith(STORAGE_KEYS.SEARCH_HISTORY);
    expect(store.userSession).toBeNull();
  });
});

describe("session store - 冷启动关键/非关键调用解耦（P2 修复 6）", () => {
  const onlineSession = makeSession({
    userId: "user-1001",
    loggedIn: true,
    displayName: "林晓",
    profileCompleted: true,
    campusName: "北京大学",
  });

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.mocked(uni.getStorageSync).mockReturnValue(null);
    vi.mocked(clientApi.getLoginHero).mockResolvedValue(MOCK_LOGIN_HERO as any);
    vi.mocked(clientApi.getSession).mockResolvedValue(onlineSession as any);
  });

  /**
   * 修复前：getLoginHero 与 getSession 写在同一个 Promise.all，
   * hero（营销位）500 ⇒ 整块 reject 落到 bootstrap 的 catch ⇒
   * isOffline=true 且 userSession=null——/auth/me 明明成功，
   * 用户每次启动都被视觉打成「离线/未登录」。
   */
  it("getLoginHero 失败但 /auth/me 成功时：会话成立、不判离线", async () => {
    vi.mocked(clientApi.getLoginHero).mockRejectedValue(new Error("hero 配置接口 500"));

    const store = useSessionStore();
    await store.bootstrap();

    expect(store.userSession?.loggedIn).toBe(true);
    expect(store.userSession?.userId).toBe("user-1001");
    expect(store.isOffline).toBe(false);
    expect(store.errorMessage).toBeNull();
    // loginHero 保持缺省（pages/login/index.vue 有 i18n 兜底文案），不因此登出
    expect(store.loginHero).toBeNull();
  });

  it("getLoginHero 失败时仍会调用 getSession（两者并发、互不否决）", async () => {
    vi.mocked(clientApi.getLoginHero).mockRejectedValue(new Error("hero 挂了"));

    const store = useSessionStore();
    await store.bootstrap();

    expect(clientApi.getSession).toHaveBeenCalledTimes(1);
    expect(clientApi.getLoginHero).toHaveBeenCalledTimes(1);
  });

  it("getSession（/auth/me）失败仍是致命错误：按原语义进入离线", async () => {
    vi.mocked(clientApi.getSession).mockRejectedValue(new Error("网络不可达"));

    const store = useSessionStore();
    await store.bootstrap();

    expect(store.isOffline).toBe(true);
    expect(store.userSession).toBeNull();
  });

  it("两个调用都成功时行为不变（主视觉正常写入）", async () => {
    const store = useSessionStore();
    await store.bootstrap();

    expect(store.loginHero).not.toBeNull();
    expect(store.userSession?.loggedIn).toBe(true);
    expect(store.isOffline).toBe(false);
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
