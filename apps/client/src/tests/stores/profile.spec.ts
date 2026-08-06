import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

// mock env: forces mock mode for all store data
vi.mock("../../services/env", () => ({
  appEnv: {
    apiMode: "mock",
    apiBaseUrl: "http://127.0.0.1:8080/api",
  },
  isMockMode: () => true,
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
    // P2.6：语音状态上传
    uploadProfileVoice: vi.fn(),
  },
}));

// stub global uni（内存存储：权限持久化测试读写）
const specStorage = new Map<string, unknown>();
(globalThis as any).uni = {
  getStorageSync: (key: string) => (specStorage.has(key) ? specStorage.get(key) : null),
  setStorageSync: (key: string, data: unknown) => {
    specStorage.set(key, data);
  },
  showToast: vi.fn(),
};

import { useProfileStore } from "../../stores/profile";

describe("profile store - 数据加载", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    specStorage.clear();
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
    // 修复（严格模式 noUncheckedIndexedAccess）：courseBlocks[0] / courseBlocks[1] 索引访问返回 T | undefined，
    // 前面 toHaveLength(2) 已确保非空，此处使用非空断言 ! 简化类型。
    expect(store.scheduleProfile!.courseBlocks[0]!.label).toBe("设计课");
    expect(store.scheduleProfile!.courseBlocks[1]!.label).toBe("专题讨论");
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
    // 修复（严格模式 noUncheckedIndexedAccess）：myPosts[0] / [1] / [2] 索引访问返回 T | undefined，
    // 前面 toHaveLength(3) 已确保非空，此处使用非空断言 ! 简化类型。
    expect(store.myPosts[0]!.summary).toContain("橘猫");
    expect(store.myPosts[1]!.summary).toContain("艺术展");
    expect(store.myPosts[2]!.summary).toContain("设计作业");
    // 每条都有 likes/comments/createdAt
    expect(store.myPosts[0]!.likes).toBe(32);
    expect(store.myPosts[0]!.comments).toBe(8);
    expect(store.myPosts[0]!.createdAt).toBeTruthy();
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
    // 修复（严格模式 noUncheckedIndexedAccess）：myPosts[0] 索引访问返回 T | undefined，
    // 前面已 load() 完成，myPosts 非空，此处使用非空断言 !。
    store.myPosts[0]!.summary = "修改后的摘要";

    // 重新 load，应该恢复原始 mock 数据
    await store.load();
    expect(store.basicProfile!.nickname).toBe(originalNickname);
    expect(store.myPosts[0]!.summary).toContain("橘猫");
  });
});

// ------------------------------------------------------------------
// Phase Feedback5：语音状态与同校推荐权限
// ------------------------------------------------------------------
describe("profile store - 语音状态与权限（Phase Feedback5）", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    specStorage.clear();
  });

  it("setVoiceStatus 设置 60s 内语音状态", async () => {
    const store = useProfileStore();
    await store.load();

    store.setVoiceStatus("https://example.com/voice.mp3", 42);

    expect(store.voiceStatusUrl).toBe("https://example.com/voice.mp3");
    expect(store.voiceStatusDuration).toBe(42);
  });

  it("setVoiceStatus 超过 60s 时截断为 60s", async () => {
    const store = useProfileStore();
    await store.load();

    store.setVoiceStatus("https://example.com/voice-long.mp3", 120);

    expect(store.voiceStatusDuration).toBe(60);
  });

  it("setVoiceStatus 负数或 0 时长时清空语音状态", async () => {
    const store = useProfileStore();
    await store.load();
    store.setVoiceStatus("https://example.com/voice.mp3", 30);

    store.setVoiceStatus("https://example.com/voice.mp3", 0);

    expect(store.voiceStatusUrl).toBe("");
    expect(store.voiceStatusDuration).toBe(0);
  });

  it("setVoiceStatus 空 URL 时清空语音状态（避免空 URL + 非零时长不一致）", async () => {
    const store = useProfileStore();
    await store.load();
    store.setVoiceStatus("https://example.com/voice.mp3", 30);

    store.setVoiceStatus("", 30);

    expect(store.voiceStatusUrl).toBe("");
    expect(store.voiceStatusDuration).toBe(0);
  });

  it("clearVoiceStatus 清空语音状态", async () => {
    const store = useProfileStore();
    await store.load();
    store.setVoiceStatus("https://example.com/voice.mp3", 20);

    store.clearVoiceStatus();

    expect(store.voiceStatusUrl).toBe("");
    expect(store.voiceStatusDuration).toBe(0);
  });

  // P2.6：uploadVoice 上传语音状态（毫秒转秒 + 60s 收敛）
  it("uploadVoice 上传成功后更新语音状态（毫秒转秒）", async () => {
    const { clientApi } = await import("../../services/api");
    (clientApi.uploadProfileVoice as ReturnType<typeof vi.fn>).mockResolvedValue({
      url: "mock://profile/voice/test.aac",
    });
    const store = useProfileStore();
    await store.load();

    await store.uploadVoice({ name: "test.aac", path: "wxfile://tmp/test.aac" }, 42300);

    expect(store.voiceStatusUrl).toBe("mock://profile/voice/test.aac");
    expect(store.voiceStatusDuration).toBe(42);
    expect(store.errorMessage).toBeNull();
  });

  it("uploadVoice 上传失败时抛出错误并记录 errorMessage", async () => {
    const { clientApi } = await import("../../services/api");
    (clientApi.uploadProfileVoice as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("上传失败")
    );
    const store = useProfileStore();
    await store.load();
    // load() 会预置 mock 语音 URL，失败不应清空已有语音状态
    const beforeUrl = store.voiceStatusUrl;

    await expect(
      store.uploadVoice({ name: "test.aac", path: "wxfile://tmp/test.aac" }, 10000)
    ).rejects.toThrow("上传失败");

    expect(store.errorMessage).toBe("上传失败");
    expect(store.voiceStatusUrl).toBe(beforeUrl);
  });

  it("setAllowSameSchoolRecommend 更新同校推荐权限", async () => {
    const store = useProfileStore();
    await store.load();

    store.setAllowSameSchoolRecommend(true);
    expect(store.allowSameSchoolRecommend).toBe(true);

    store.setAllowSameSchoolRecommend(false);
    expect(store.allowSameSchoolRecommend).toBe(false);
  });

  // Phase 4.5 验收：权限开关状态持久化（mock 模式写入本地存储，load() 时从存储恢复）
  it("权限开关持久化：设置后写入本地存储", async () => {
    const store = useProfileStore();
    await store.load();
    store.setAllowSameSchoolRecommend(true);
    store.setReceiveSameSchoolInfo(false);

    // 验证持久化写入（load() 有 inflight 缓存，直接断言存储内容）
    const saved = uni.getStorageSync("campus-love:privacy-settings") as {
      allowSameSchoolRecommend: boolean;
      receiveSameSchoolInfo: boolean;
    };
    expect(saved.allowSameSchoolRecommend).toBe(true);
    expect(saved.receiveSameSchoolInfo).toBe(false);
  });

  it("setReceiveSameSchoolInfo 更新接收同校信息开关", async () => {
    const store = useProfileStore();
    await store.load();

    store.setReceiveSameSchoolInfo(false);
    expect(store.receiveSameSchoolInfo).toBe(false);

    store.setReceiveSameSchoolInfo(true);
    expect(store.receiveSameSchoolInfo).toBe(true);
  });

  it("load() 在 mock 模式加载默认语音与权限状态", async () => {
    const store = useProfileStore();
    await store.load();

    expect(store.voiceStatusUrl).toBeTruthy();
    expect(store.voiceStatusDuration).toBeGreaterThan(0);
    expect(store.voiceStatusDuration).toBeLessThanOrEqual(60);
    // 默认：不把自己推荐给同校，但接收同校信息
    expect(store.allowSameSchoolRecommend).toBe(false);
    expect(store.receiveSameSchoolInfo).toBe(true);
  });
});
