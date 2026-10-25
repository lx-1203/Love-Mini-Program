import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

vi.mock("../../services/env", () => ({
  appEnv: {
    apiMode: "real",
    apiBaseUrl: "http://127.0.0.1:8080/api",
  },
  isMockMode: () => false,
}));

vi.mock("../../stores/helpers/use-mock", () => ({
  useMock: () => false,
}));

vi.mock("../../services/http", () => ({
  request: vi.fn(),
}));

vi.mock("../../utils/cache-ttl", () => ({
  isCacheFresh: () => false,
  setCachedValue: vi.fn(),
}));

(globalThis as any).uni = {};

import { request } from "../../services/http";
import { useActivityStore } from "../../stores/activity";

const requestMock = vi.mocked(request);

function pageResult(
  number: number,
  rows: Array<Record<string, unknown>>,
  last: boolean,
) {
  return {
    content: rows,
    number,
    size: 10,
    totalElements: last ? number * 10 + rows.length : 20,
    totalPages: last ? number + 1 : 2,
    first: number === 0,
    last,
    numberOfElements: rows.length,
    empty: rows.length === 0,
  };
}

function row(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    title: `活动 ${id}`,
    location: "体育馆",
    scheduleText: "周六 19:00",
    description: "描述",
    enrollmentCount: 12,
    participantAvatars: ["https://cdn.example/avatar.png"],
    status: "open",
    activityDate: "2026-11-08",
    category: "sports",
    coverImage: "https://cdn.example/cover.png",
    isEnrolled: true,
    ...overrides,
  };
}

describe("activity store - 真实活动分页契约", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    requestMock.mockReset();
  });

  it("首屏请求 /activities 的真实 0 基页码并映射完整字段", async () => {
    requestMock.mockResolvedValueOnce(pageResult(0, [row(11)], false));

    const store = useActivityStore();
    await store.fetchActivities(true);

    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestMock).toHaveBeenCalledWith({
      url: "/activities?page=0&size=10",
      method: "GET",
    });
    expect(store.activities).toHaveLength(1);
    expect(store.activities[0]).toMatchObject({
      id: "11",
      title: "活动 11",
      date: "2026-11-08",
      status: "open",
      category: "sports",
      coverImage: "https://cdn.example/cover.png",
      isEnrolled: true,
      enrollCount: 12,
      enrollmentCount: 12,
    });
    expect(store.page).toBe(1);
    expect(store.hasMore).toBe(true);
  });

  it("加载更多请求第二页、按 id 去重、末页停止", async () => {
    requestMock
      .mockResolvedValueOnce(pageResult(0, [row(11), row(12)], false))
      .mockResolvedValueOnce(pageResult(1, [row(12), row(13)], true));

    const store = useActivityStore();
    await store.fetchActivities(true);
    await store.fetchMoreActivities();

    expect(requestMock.mock.calls[1][0]).toEqual({
      url: "/activities?page=1&size=10",
      method: "GET",
    });
    expect(store.activities.map((item) => item.id)).toEqual(["11", "12", "13"]);
    expect(store.page).toBe(2);
    expect(store.hasMore).toBe(false);
  });

  it("空页即使后端未标 last 也停止继续加载", async () => {
    requestMock
      .mockResolvedValueOnce(pageResult(0, [row(11)], false))
      .mockResolvedValueOnce(pageResult(1, [], false));

    const store = useActivityStore();
    await store.fetchActivities(true);
    await store.fetchMoreActivities();

    expect(store.activities.map((item) => item.id)).toEqual(["11"]);
    expect(store.page).toBe(1);
    expect(store.hasMore).toBe(false);
  });

  it("加载更多失败时不推进页码、不污染已加载列表", async () => {
    requestMock
      .mockResolvedValueOnce(pageResult(0, [row(11)], false))
      .mockRejectedValueOnce(new Error("network down"));

    const store = useActivityStore();
    await store.fetchActivities(true);
    await store.fetchMoreActivities();

    expect(store.activities.map((item) => item.id)).toEqual(["11"]);
    expect(store.page).toBe(1);
    expect(store.hasMore).toBe(true);
    expect(store.errorMessage).toContain("network down");
  });
});
