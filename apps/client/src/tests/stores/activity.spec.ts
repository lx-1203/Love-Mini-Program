import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

// mock env
vi.mock("../../services/env", () => ({
  appEnv: {
    apiMode: "mock",
    apiBaseUrl: "http://127.0.0.1:8080/api",
  },
  isMockMode: () => true,
}));

// mock useMock
vi.mock("../../stores/helpers/use-mock", () => ({
  useMock: () => true,
}));

// mock clientApi 与 request
vi.mock("../../services/api", () => ({
  clientApi: {
    getActivityRecommendations: vi.fn(),
  },
}));

vi.mock("../../services/http", () => ({
  request: vi.fn(),
}));

// stub global uni
(globalThis as any).uni = {};

import { useActivityStore } from "../../stores/activity";

describe("activity store - 线下活动", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  // ------------------------------------------------------------------
  // fetchActivities()
  // ------------------------------------------------------------------
  it("fetchActivities() 在 mock 模式下加载活动列表", async () => {
    const store = useActivityStore();
    await store.fetchActivities();

    expect(store.activities.length).toBeGreaterThan(0);
    expect(store.loading).toBe(false);
    expect(store.errorMessage).toBeNull();
  });

  it("fetchActivities() 完成后 loading=false", async () => {
    const store = useActivityStore();
    await store.fetchActivities();
    expect(store.loading).toBe(false);
  });

  it("fetchActivities() 加载后 page=1, hasMore=false (mock)", async () => {
    const store = useActivityStore();
    await store.fetchActivities();

    expect(store.page).toBe(1);
    expect(store.hasMore).toBe(false);
  });

  // ------------------------------------------------------------------
  // hasActivities getter
  // ------------------------------------------------------------------
  it("hasActivities getter 返回 true 当有活动时", async () => {
    const store = useActivityStore();
    await store.fetchActivities();
    expect(store.hasActivities).toBe(true);
  });

  it("hasActivities getter 返回 false 当无活动时", () => {
    const store = useActivityStore();
    expect(store.hasActivities).toBe(false);
  });

  // ------------------------------------------------------------------
  // fetchMoreActivities()
  // ------------------------------------------------------------------
  it("fetchMoreActivities() 在 mock 模式下标记 hasMore=false", async () => {
    const store = useActivityStore();
    await store.fetchActivities();
    // mock 模式下 fetchMore 直接返回 hasMore=false
    await store.fetchMoreActivities();
    expect(store.hasMore).toBe(false);
  });

  it("fetchMoreActivities() loading 时不重复调用", async () => {
    const store = useActivityStore();
    store.loading = true;
    await store.fetchMoreActivities();
    // 不应改变状态
    expect(store.page).toBe(1);
  });

  it("fetchMoreActivities() hasMore=false 时不调用", async () => {
    const store = useActivityStore();
    store.hasMore = false;
    await store.fetchMoreActivities();
    expect(store.page).toBe(1);
  });

  // ------------------------------------------------------------------
  // enrollActivity()
  // ------------------------------------------------------------------
  it("enrollActivity() 切换报名状态（mock 模式）", async () => {
    const store = useActivityStore();
    await store.fetchActivities();
    const unenrolled = store.activities.find((a) => !a.isEnrolled);
    if (unenrolled) {
      await store.enrollActivity(unenrolled.id);
      expect(unenrolled.isEnrolled).toBe(true);
    }
  });

  it("enrollActivity() 报名后 enrollCount+1", async () => {
    const store = useActivityStore();
    await store.fetchActivities();
    const unenrolled = store.activities.find((a) => !a.isEnrolled);
    if (unenrolled) {
      const initialCount = unenrolled.enrollCount;
      await store.enrollActivity(unenrolled.id);
      expect(unenrolled.enrollCount).toBe(initialCount + 1);
    }
  });

  it("enrollActivity() 不存在的活动 id 不报错", async () => {
    const store = useActivityStore();
    await store.fetchActivities();
    await store.enrollActivity("non-existent");
    // 应静默返回，不抛出错误
    expect(store.errorMessage).toBeNull();
  });

  it("已报名活动再次 enroll 切换为取消报名", async () => {
    const store = useActivityStore();
    await store.fetchActivities();
    const enrolled = store.activities.find((a) => a.isEnrolled);
    if (enrolled) {
      await store.enrollActivity(enrolled.id);
      expect(enrolled.isEnrolled).toBe(false);
    }
  });

  // ------------------------------------------------------------------
  // 初始状态
  // ------------------------------------------------------------------
  it("初始状态 activities=[], loading=false, page=1, hasMore=true", () => {
    const store = useActivityStore();
    expect(store.activities).toEqual([]);
    expect(store.loading).toBe(false);
    expect(store.page).toBe(1);
    expect(store.hasMore).toBe(true);
  });
});
