import { beforeEach, describe, expect, it, vi } from "vitest";

// 通过 vi.hoisted 创建可在 vi.mock 工厂中引用的可控 mock：
// - useMockMock: 默认返回 true（mock 模式），可在特定测试中改为 false 走真实 API 路径
// - getSocialProgressMock: 在 useMock=false 时返回受控 promise，验证 loading 时序
const { useMockMock, getSocialProgressMock } = vi.hoisted(() => ({
  useMockMock: vi.fn(() => true),
  getSocialProgressMock: vi.fn(),
}));

// mock env: forces mock mode for all store data
vi.mock("../../services/env", () => ({
  appEnv: {
    apiMode: "mock",
    apiBaseUrl: "http://127.0.0.1:8080/api",
  },
  isMockMode: () => true,
}));

// mock useMock：默认返回 true（mock 模式），特定测试可覆盖为 false 走真实 API 路径
vi.mock("../../stores/helpers/use-mock", () => ({
  useMock: useMockMock,
}));

// mock clientApi：在 useMock=false 时使用受控 promise 验证 loading 时序
vi.mock("../../services/api", () => ({
  clientApi: {
    getSocialProgress: getSocialProgressMock,
  },
}));

// stub global uni
(globalThis as any).uni = {
  vibrateShort: vi.fn(),
  showToast: vi.fn(),
  getStorageSync: vi.fn(() => null),
  setStorageSync: vi.fn(),
};

describe("social-progress store", () => {
  let useSocialProgressStore: typeof import("../../stores/social-progress").useSocialProgressStore;

  beforeEach(async () => {
    vi.clearAllMocks();
    // 重置 useMock 与 getSocialProgress 的自定义实现，确保默认行为：
    // - useMockMock 默认返回 true（mock 模式），让大部分测试走 mock 数据路径
    // - getSocialProgressMock 默认无返回值，仅在 loading 时序测试中覆盖
    useMockMock.mockReset();
    useMockMock.mockReturnValue(true);
    getSocialProgressMock.mockReset();
    vi.resetModules();
    const { createPinia, setActivePinia } = await import("pinia");
    setActivePinia(createPinia());
    const mod = await import("../../stores/social-progress");
    useSocialProgressStore = mod.useSocialProgressStore;
  });

  // ------------------------------------------------------------------
  // 初始状态
  // ------------------------------------------------------------------
  it("初始状态：progress 为 null，loading 为 false，errorMessage 为 null", () => {
    const store = useSocialProgressStore();
    expect(store.progress).toBeNull();
    expect(store.loading).toBe(false);
    expect(store.errorMessage).toBeNull();
  });

  // ------------------------------------------------------------------
  // fetchProgress（mock 模式）
  // ------------------------------------------------------------------
  it("fetchProgress 加载 mock 数据成功", async () => {
    const store = useSocialProgressStore();
    await store.fetchProgress();
    expect(store.progress).not.toBeNull();
    expect(store.progress?.currentTier).toBe("L1_EXPOSURE");
    expect(store.progress?.tierLabel).toBe("发现心动");
    expect(store.progress?.exposureCount).toBe(0);
    expect(store.progress?.progressPercentage).toBe(0);
    expect(store.loading).toBe(false);
    expect(store.errorMessage).toBeNull();
  });

  it("fetchProgress 执行期间 loading=true", async () => {
    // 切换到真实 API 路径以制造可观察的 loading 时序：
    // mock 模式下 fetchProgress 全同步执行（无 await），
    // 调用方拿到 Promise 时 loading 已被 finally 置回 false，
    // 无法验证「执行期间 loading=true」的语义。
    useMockMock.mockReturnValue(false);

    // 用受控 Promise 模拟异步 API，使 fetchProgress 在 await 处挂起
    let resolveApi!: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolveApi = resolve;
    });
    getSocialProgressMock.mockReturnValue(pendingPromise);

    const store = useSocialProgressStore();
    const fetchPromise = store.fetchProgress();
    // fetchProgress 已同步执行到 await clientApi.getSocialProgress() 处，
    // 此时 loading=true，等待 API resolve
    expect(store.loading).toBe(true);

    // resolve API，fetchProgress 继续，finally 将 loading 置回 false
    resolveApi({
      currentTier: "L1_EXPOSURE",
      tierLabel: "发现心动",
      exposureCount: 0,
      likeCount: 0,
      matchCount: 0,
      chatCount: 0,
      circleCount: 0,
      activityCount: 0,
      nextAction: "去寻觅，发现心动的人",
      progressPercentage: 0,
    });
    await fetchPromise;
    expect(store.loading).toBe(false);
  });

  // ------------------------------------------------------------------
  // 计算属性
  // ------------------------------------------------------------------
  it("currentTierIndex 初始为 -1（progress 为 null）", () => {
    const store = useSocialProgressStore();
    expect(store.currentTierIndex).toBe(-1);
  });

  it("currentTierIndex 加载 mock 数据后为 0（L1_EXPOSURE 在首位）", async () => {
    const store = useSocialProgressStore();
    await store.fetchProgress();
    expect(store.currentTierIndex).toBe(0);
  });

  it("progressPercentage 初始为 0", () => {
    const store = useSocialProgressStore();
    expect(store.progressPercentage).toBe(0);
  });

  it("progressPercentage 加载 mock 数据后为 0（mock 数据 0%）", async () => {
    const store = useSocialProgressStore();
    await store.fetchProgress();
    expect(store.progressPercentage).toBe(0);
  });

  it("nextAction 初始为空字符串", () => {
    const store = useSocialProgressStore();
    expect(store.nextAction).toBe("");
  });

  it("nextAction 加载 mock 数据后包含行动建议", async () => {
    const store = useSocialProgressStore();
    await store.fetchProgress();
    expect(store.nextAction).toBeTruthy();
    expect(typeof store.nextAction).toBe("string");
    expect(store.nextAction.length).toBeGreaterThan(0);
  });

  it("isMaxLevel 初始为 false（progress 为 null）", () => {
    const store = useSocialProgressStore();
    expect(store.isMaxLevel).toBe(false);
  });

  it("isMaxLevel 加载 mock 数据后为 false（L1_EXPOSURE 不是最高层）", async () => {
    const store = useSocialProgressStore();
    await store.fetchProgress();
    expect(store.isMaxLevel).toBe(false);
  });

  // ------------------------------------------------------------------
  // 静态配置（TIER_META）
  // ------------------------------------------------------------------
  it("tierNames 包含 6 层升温路径", () => {
    const store = useSocialProgressStore();
    expect(store.tierNames).toBeTruthy();
    expect(store.tierNames.L1_EXPOSURE).toBeTruthy();
    expect(store.tierNames.L2_ATTENTION).toBeTruthy();
    expect(store.tierNames.L3_MATCH).toBeTruthy();
    expect(store.tierNames.L4_COMMUNICATION).toBeTruthy();
    expect(store.tierNames.L5_CIRCLE).toBeTruthy();
    expect(store.tierNames.L6_SCENE).toBeTruthy();
  });

  it("tierNames 每层包含 label/icon/desc", () => {
    const store = useSocialProgressStore();
    const l1 = store.tierNames.L1_EXPOSURE;
    expect(l1.label).toBe("发现心动");
    expect(l1.icon).toBeTruthy();
    expect(l1.desc).toBeTruthy();
  });
});
