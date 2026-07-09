import { beforeEach, describe, expect, it, vi } from "vitest";

// mock env: forces mock mode for all store data
vi.mock("../../services/env", () => ({
  appEnv: {
    apiMode: "mock",
    apiBaseUrl: "http://127.0.0.1:8080/api",
  },
}));

// stub global uni
(globalThis as any).uni = {
  vibrateShort: vi.fn(),
  showToast: vi.fn(),
  getStorageSync: vi.fn(() => null),
  setStorageSync: vi.fn(),
};

describe("checkin store", () => {
  let useCheckInStore: typeof import("../../stores/checkin").useCheckInStore;

  beforeEach(async () => {
    vi.clearAllMocks();
    // 重置模块缓存以重置 checkin store 模块级 mockCheckInStatus 变量
    // 确保每个测试用例都从初始未签到状态开始
    vi.resetModules();
    const { createPinia, setActivePinia } = await import("pinia");
    setActivePinia(createPinia());
    const mod = await import("../../stores/checkin");
    useCheckInStore = mod.useCheckInStore;
  });

  // ------------------------------------------------------------------
  // fetchStatus
  // ------------------------------------------------------------------
  it("fetchStatus 加载初始未签到状态", async () => {
    const store = useCheckInStore();
    await store.fetchStatus();

    expect(store.checkedIn).toBe(false);
    expect(store.consecutiveDays).toBe(0);
    expect(store.extraRecommendations).toBe(0);
    expect(store.loading).toBe(false);
    expect(store.errorMessage).toBeNull();
  });

  // ------------------------------------------------------------------
  // checkIn
  // ------------------------------------------------------------------
  it("checkIn 首次签到成功，连续天数 +1，触发动画", async () => {
    const store = useCheckInStore();
    await store.checkIn();

    expect(store.checkedIn).toBe(true);
    expect(store.consecutiveDays).toBe(1);
    expect(store.extraRecommendations).toBe(5);
    expect(store.extraRecommendQuota).toBe(5);
    expect(store.hotTopicsUnlocked).toBe(true);
    expect(store.newUsersUnlocked).toBe(true);
    expect(store.hotTopicCount).toBe(3);
    expect(store.newUserCount).toBe(2);
    expect(store.showSuccessAnimation).toBe(true);
    expect(store.checkingIn).toBe(false);
    expect(store.errorMessage).toBeNull();
  });

  it("重复签到不增加连续天数（已签到状态保护）", async () => {
    const store = useCheckInStore();
    // 首次签到
    await store.checkIn();
    expect(store.consecutiveDays).toBe(1);

    // 再次签到：由于 checkedIn 已为 true，consecutiveDays 不变
    await store.checkIn();
    expect(store.consecutiveDays).toBe(1);
    expect(store.checkedIn).toBe(true);
  });

  it("fetchStatus 读取签到后状态", async () => {
    const store = useCheckInStore();
    await store.checkIn(); // 签到
    await store.fetchStatus(); // 重新读取

    expect(store.checkedIn).toBe(true);
    expect(store.consecutiveDays).toBe(1);
    expect(store.extraRecommendations).toBe(5);
  });

  // ------------------------------------------------------------------
  // 签到成功动画
  // ------------------------------------------------------------------
  it("签到成功后 3 秒自动收起动画", async () => {
    vi.useFakeTimers();
    try {
      const store = useCheckInStore();
      await store.checkIn();

      expect(store.showSuccessAnimation).toBe(true);

      // 快进 3 秒
      vi.advanceTimersByTime(3000);
      expect(store.showSuccessAnimation).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  // ------------------------------------------------------------------
  // getters
  // ------------------------------------------------------------------
  it("hasCheckedIn 反映签到状态", async () => {
    const store = useCheckInStore();
    expect(store.hasCheckedIn).toBe(false);

    await store.checkIn();
    expect(store.hasCheckedIn).toBe(true);
  });

  it("consecutiveDaysText 连续签到天数展示文本", async () => {
    const store = useCheckInStore();
    expect(store.consecutiveDaysText).toBe("");

    await store.checkIn();
    expect(store.consecutiveDaysText).toBe("已连续签到 1 天");
  });

  it("extraRecommendationsText 额外推荐次数展示文本", async () => {
    const store = useCheckInStore();
    expect(store.extraRecommendationsText).toBe("");

    await store.checkIn();
    expect(store.extraRecommendationsText).toBe("今日剩余次数+5");
  });

  it("extraQuotaText 签到权益配额展示文本", async () => {
    const store = useCheckInStore();
    expect(store.extraQuotaText).toBe("");

    await store.checkIn();
    expect(store.extraQuotaText).toBe("今日额外推荐配额 +5");
  });

  it("hotTopicsText 热门话题入口展示文本", async () => {
    const store = useCheckInStore();
    expect(store.hotTopicsText).toBe("");

    await store.checkIn();
    expect(store.hotTopicsText).toBe("今日热门话题 (3)");
  });

  it("newUsersText 新入圈用户入口展示文本", async () => {
    const store = useCheckInStore();
    expect(store.newUsersText).toBe("");

    await store.checkIn();
    expect(store.newUsersText).toBe("新入圈用户 (2)");
  });
});
