import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

// mock env: forces mock mode for all store data
vi.mock("../../services/env", () => ({
  appEnv: {
    apiMode: "mock",
    apiBaseUrl: "http://127.0.0.1:8080/api",
  },
}));

// mock clientApi 以避免触发真实 http service 副作用
// mock 模式下 load() 不会调用 clientApi，但 import 阶段仍会加载
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

// stub global uni
(globalThis as any).uni = {
  getStorageSync: vi.fn(() => null),
  setStorageSync: vi.fn(),
  showToast: vi.fn(),
};

import { useProfileStore } from "../../stores/profile";

describe("profile store - 数据加载", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  // ------------------------------------------------------------------
  // load() - 基本资料
  // ------------------------------------------------------------------
  it("load() 在 mock 模式下加载基本资料", async () => {
    const store = useProfileStore();
    await store.load();

    expect(store.basicProfile).not.toBeNull();
    expect(store.basicProfile!.nickname).toBe("星野");
    expect(store.basicProfile!.bio).toBe("安静、好奇，更喜欢一对一慢慢聊。");
    expect(store.basicProfile!.grade).toBe("大三");
    expect(store.basicProfile!.pronouns).toBe("她/她");
  });

  // ------------------------------------------------------------------
  // load() - 校区资料
  // ------------------------------------------------------------------
  it("load() 在 mock 模式下加载校区资料", async () => {
    const store = useProfileStore();
    await store.load();

    expect(store.campusProfile).not.toBeNull();
    expect(store.campusProfile!.city).toBe("广州");
    expect(store.campusProfile!.campusName).toBe("南校区");
    expect(store.campusProfile!.department).toBe("工业设计");
    expect(store.campusProfile!.verificationStatus).toBe("draft");
  });

  // ------------------------------------------------------------------
  // load() - 日程资料
  // ------------------------------------------------------------------
  it("load() 在 mock 模式下加载日程资料", async () => {
    const store = useProfileStore();
    await store.load();

    expect(store.scheduleProfile).not.toBeNull();
    expect(store.scheduleProfile!.preferredCampusArea).toBe("图书馆和北草坪");
    expect(store.scheduleProfile!.preferredTimeWindows).toEqual(["今晚", "本周"]);
    expect(store.scheduleProfile!.courseBlocks).toHaveLength(2);
    expect(store.scheduleProfile!.courseBlocks[0].label).toBe("设计课");
    expect(store.scheduleProfile!.courseBlocks[1].label).toBe("专题讨论");
  });

  // ------------------------------------------------------------------
  // load() - 个人统计数据
  // ------------------------------------------------------------------
  it("load() 在 mock 模式下加载个人统计数据", async () => {
    const store = useProfileStore();
    await store.load();

    expect(store.profileStats).not.toBeNull();
    expect(store.profileStats!.followers).toBe(16);
    expect(store.profileStats!.following).toBe(28);
    expect(store.profileStats!.likes).toBe(104);
    expect(store.profileStats!.visitors).toBe(50);
    expect(store.profileStats!.posts).toBe(12);
    // 兼容字段
    expect(store.profileStats!.followersCount).toBe(16);
    expect(store.profileStats!.followingCount).toBe(28);
    expect(store.profileStats!.likesCount).toBe(104);
    expect(store.profileStats!.visitorsCount).toBe(50);
  });

  // ------------------------------------------------------------------
  // load() - VIP 状态
  // ------------------------------------------------------------------
  it("load() 在 mock 模式下加载 VIP 状态（默认未开通）", async () => {
    const store = useProfileStore();
    await store.load();

    expect(store.vipStatus).not.toBeNull();
    expect(store.vipStatus!.isVip).toBe(false);
    expect(store.vipStatus!.planName).toBe("");
    expect(store.vipStatus!.expireDate).toBeNull();
  });

  // ------------------------------------------------------------------
  // load() - 我的动态列表
  // ------------------------------------------------------------------
  it("load() 在 mock 模式下加载我的动态列表", async () => {
    const store = useProfileStore();
    await store.load();

    expect(store.myPosts).toHaveLength(3);
    expect(store.myPosts[0].summary).toContain("橘猫");
    expect(store.myPosts[1].summary).toContain("艺术展");
    expect(store.myPosts[2].summary).toContain("设计作业");
    // 每条都有 likes/comments/createdAt
    expect(store.myPosts[0].likes).toBe(32);
    expect(store.myPosts[0].comments).toBe(8);
    expect(store.myPosts[0].createdAt).toBeTruthy();
  });

  // ------------------------------------------------------------------
  // load() - 状态字段
  // ------------------------------------------------------------------
  it("load() 加载完成后 loading 恢复 false，errorMessage 为 null", async () => {
    const store = useProfileStore();
    await store.load();

    expect(store.loading).toBe(false);
    expect(store.errorMessage).toBeNull();
  });

  it("load() 初始状态 loading 为 false", () => {
    const store = useProfileStore();
    expect(store.loading).toBe(false);
    expect(store.errorMessage).toBeNull();
    expect(store.basicProfile).toBeNull();
    expect(store.campusProfile).toBeNull();
  });

  // ------------------------------------------------------------------
  // fetchProfile() - load 的语义别名
  // ------------------------------------------------------------------
  it("fetchProfile() 是 load 的别名，加载所有资料", async () => {
    const store = useProfileStore();
    await store.fetchProfile();

    expect(store.basicProfile).not.toBeNull();
    expect(store.campusProfile).not.toBeNull();
    expect(store.scheduleProfile).not.toBeNull();
    expect(store.profileStats).not.toBeNull();
    expect(store.vipStatus).not.toBeNull();
    expect(store.myPosts).toHaveLength(3);
    expect(store.loading).toBe(false);
  });

  // ------------------------------------------------------------------
  // loadStats() - 单独加载统计数据
  // ------------------------------------------------------------------
  it("loadStats() 在 mock 模式下加载统计数据", async () => {
    const store = useProfileStore();
    await store.loadStats();

    expect(store.profileStats).not.toBeNull();
    expect(store.profileStats!.followers).toBe(16);
    expect(store.profileStats!.following).toBe(28);
    expect(store.profileStats!.likes).toBe(104);
    expect(store.profileStats!.visitors).toBe(50);
    expect(store.profileStats!.posts).toBe(12);
    expect(store.errorMessage).toBeNull();
  });

  // ------------------------------------------------------------------
  // 深拷贝验证：修改 store 数据不影响下次 load 的 mock 数据
  // ------------------------------------------------------------------
  it("load() 返回的 mock 数据是深拷贝，修改不影响下次加载", async () => {
    const store = useProfileStore();
    await store.load();
    const originalNickname = store.basicProfile!.nickname;

    // 修改 store 中的数据
    store.basicProfile!.nickname = "修改后的名字";
    store.myPosts[0].summary = "修改后的摘要";

    // 重新 load，应该恢复原始 mock 数据
    await store.load();
    expect(store.basicProfile!.nickname).toBe(originalNickname);
    expect(store.myPosts[0].summary).toContain("橘猫");
  });
});
