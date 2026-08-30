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

// mock request
vi.mock("../../services/http", () => ({
  request: vi.fn(),
}));

// stub global uni
(globalThis as any).uni = {};

import { useCircleStore, formatCircleTime } from "../../stores/circle";

describe("circle store - 兴趣圈", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  // ------------------------------------------------------------------
  // fetchCircles()
  // ------------------------------------------------------------------
  it("fetchCircles() 在 mock 模式下加载兴趣圈列表", async () => {
    const store = useCircleStore();
    await store.fetchCircles();

    expect(store.circles.length).toBeGreaterThan(0);
    expect(store.loading).toBe(false);
    expect(store.errorMessage).toBeNull();
  });

  it("fetchCircles() 完成后 loading=false", async () => {
    const store = useCircleStore();
    await store.fetchCircles();
    expect(store.loading).toBe(false);
  });

  // ------------------------------------------------------------------
  // joinedCircles getter
  // ------------------------------------------------------------------
  it("joinedCircles getter 返回已加入的兴趣圈", async () => {
    const store = useCircleStore();
    await store.fetchCircles();

    const joined = store.joinedCircles;
    expect(joined.length).toBeGreaterThan(0);
    expect(joined.every((c) => c.isJoined)).toBe(true);
  });

  // ------------------------------------------------------------------
  // joinCircle()
  // ------------------------------------------------------------------
  it("joinCircle() 加入兴趣圈", async () => {
    const store = useCircleStore();
    await store.fetchCircles();
    const initialJoined = store.joinedCircles.length;

    // 找一个未加入的圈子
    const unjoined = store.circles.find((c) => !c.isJoined);
    if (unjoined) {
      await store.joinCircle(unjoined.id);
      expect(unjoined.isJoined).toBe(true);
      expect(store.joinedCircles.length).toBe(initialJoined + 1);
    }
  });

  it("joinCircle() 成员数+1", async () => {
    const store = useCircleStore();
    await store.fetchCircles();
    const unjoined = store.circles.find((c) => !c.isJoined);
    if (unjoined) {
      const initialCount = unjoined.memberCount;
      await store.joinCircle(unjoined.id);
      expect(unjoined.memberCount).toBe(initialCount + 1);
    }
  });

  it("joinCircle() 空 circleId 抛出错误", async () => {
    const store = useCircleStore();
    await expect(store.joinCircle("")).rejects.toThrow();
    expect(store.errorMessage).not.toBeNull();
  });

  // ------------------------------------------------------------------
  // leaveCircle()
  // ------------------------------------------------------------------
  it("leaveCircle() 退出兴趣圈", async () => {
    const store = useCircleStore();
    await store.fetchCircles();
    const joined = store.circles.find((c) => c.isJoined);
    if (joined) {
      await store.leaveCircle(joined.id);
      expect(joined.isJoined).toBe(false);
    }
  });

  it("leaveCircle() 成员数-1（不低于0）", async () => {
    const store = useCircleStore();
    await store.fetchCircles();
    const joined = store.circles.find((c) => c.isJoined);
    if (joined) {
      const initialCount = joined.memberCount;
      await store.leaveCircle(joined.id);
      expect(joined.memberCount).toBe(Math.max(0, initialCount - 1));
    }
  });

  // ------------------------------------------------------------------
  // fetchTopics()
  // ------------------------------------------------------------------
  it("fetchTopics() 加载兴趣圈的话题列表", async () => {
    const store = useCircleStore();
    await store.fetchCircles();

    // circle-1 在 mock 中有话题
    await store.fetchTopics("circle-1", 1);

    expect(store.currentTopics.length).toBeGreaterThan(0);
    expect(store.loading).toBe(false);
  });

  it("fetchTopics() page=1 时重置 currentTopics", async () => {
    const store = useCircleStore();
    await store.fetchTopics("circle-1", 1);
    expect(store.topicPage).toBe(1);
  });

  it("fetchTopics() 空 circleId 抛出错误", async () => {
    const store = useCircleStore();
    await expect(store.fetchTopics("", 1)).rejects.toThrow();
    expect(store.errorMessage).not.toBeNull();
  });

  // ------------------------------------------------------------------
  // createTopic()
  // ------------------------------------------------------------------
  it("createTopic() 创建新话题并 prepend 到列表", async () => {
    const store = useCircleStore();
    await store.fetchTopics("circle-1", 1);
    const initialCount = store.currentTopics.length;

    const result = await store.createTopic("circle-1", {
      title: "测试话题",
      content: "测试内容",
    });

    expect(result).not.toBeUndefined();
    expect(result!.title).toBe("测试话题");
    expect(store.currentTopics.length).toBe(initialCount + 1);
    expect(store.currentTopics[0]!.title).toBe("测试话题");
  });

  it("createTopic() 空 title 抛出错误", async () => {
    const store = useCircleStore();
    await expect(
      store.createTopic("circle-1", { title: "", content: "内容" }),
    ).rejects.toThrow();
  });

  it("createTopic() 空 content 抛出错误", async () => {
    const store = useCircleStore();
    await expect(
      store.createTopic("circle-1", { title: "标题", content: "" }),
    ).rejects.toThrow();
  });

  // ------------------------------------------------------------------
  // fetchTopicDetail()
  // ------------------------------------------------------------------
  it("fetchTopicDetail() 加载话题详情", async () => {
    const store = useCircleStore();
    await store.fetchTopics("circle-1", 1);
    await store.fetchTopicDetail("topic-1");

    expect(store.currentTopic).not.toBeNull();
    expect(store.currentTopic!.id).toBe("topic-1");
  });

  it("fetchTopicDetail() 空 topicId 抛出错误", async () => {
    const store = useCircleStore();
    await expect(store.fetchTopicDetail("")).rejects.toThrow();
  });

  // ------------------------------------------------------------------
  // fetchReplies() & replyToTopic()
  // ------------------------------------------------------------------
  it("fetchReplies() 加载话题回复列表", async () => {
    const store = useCircleStore();
    await store.fetchReplies("topic-1", 1);
    expect(store.replies.length).toBeGreaterThan(0);
  });

  it("replyToTopic() 添加回复到列表末尾", async () => {
    const store = useCircleStore();
    await store.fetchReplies("topic-1", 1);
    const initialCount = store.replies.length;

    await store.replyToTopic("topic-1", "新回复");
    expect(store.replies.length).toBe(initialCount + 1);
    expect(store.replies[store.replies.length - 1]!.content).toBe("新回复");
  });

  it("replyToTopic() 空内容抛出错误", async () => {
    const store = useCircleStore();
    await expect(store.replyToTopic("topic-1", "")).rejects.toThrow();
  });

  // ------------------------------------------------------------------
  // clearCurrentTopic()
  // ------------------------------------------------------------------
  it("clearCurrentTopic() 清空当前话题和回复", async () => {
    const store = useCircleStore();
    await store.fetchTopicDetail("topic-1");
    await store.fetchReplies("topic-1", 1);

    store.clearCurrentTopic();
    expect(store.currentTopic).toBeNull();
    expect(store.replies).toEqual([]);
  });

  // ------------------------------------------------------------------
  // formatCircleTime 工具函数
  // ------------------------------------------------------------------
  it("formatCircleTime 1分钟内返回 '刚刚'", () => {
    const recent = new Date(Date.now() - 30 * 1000).toISOString();
    expect(formatCircleTime(recent)).toBe("刚刚");
  });

  it("formatCircleTime 1小时内返回 'X分钟前'", () => {
    const recent = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatCircleTime(recent)).toContain("分钟前");
  });

  // ------------------------------------------------------------------
  // 初始状态
  // ------------------------------------------------------------------
  it("初始状态为空", () => {
    const store = useCircleStore();
    expect(store.circles).toEqual([]);
    expect(store.currentTopics).toEqual([]);
    expect(store.currentTopic).toBeNull();
    expect(store.replies).toEqual([]);
    expect(store.loading).toBe(false);
  });
});
