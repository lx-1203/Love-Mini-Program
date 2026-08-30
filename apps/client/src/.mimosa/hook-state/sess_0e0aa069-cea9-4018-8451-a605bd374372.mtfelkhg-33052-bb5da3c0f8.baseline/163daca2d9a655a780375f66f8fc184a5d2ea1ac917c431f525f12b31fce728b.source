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

import { useCampusStore } from "../../stores/campus";

describe("campus store - 校园话题", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  // ------------------------------------------------------------------
  // fetchCampusTopics()
  // ------------------------------------------------------------------
  it("fetchTopics() 在 mock 模式下加载话题列表", async () => {
    const store = useCampusStore();
    await store.fetchCampusTopics("study_help", 1);

    expect(store.topics.length).toBeGreaterThan(0);
    expect(store.loading).toBe(false);
    expect(store.errorMessage).toBeNull();
  });

  it("fetchTopics() 完成后 loading=false", async () => {
    const store = useCampusStore();
    await store.fetchCampusTopics("study_help", 1);
    expect(store.loading).toBe(false);
  });

  // ------------------------------------------------------------------
  // fetchCampusTopicDetail()
  // ------------------------------------------------------------------
  it("fetchTopicDetail() 加载话题详情", async () => {
    const store = useCampusStore();
    await store.fetchCampusTopics("study_help", 1);
    if (store.topics.length > 0) {
      const topicId = store.topics[0]!.id;
      await store.fetchCampusTopicDetail(topicId);
      expect(store.currentTopic).not.toBeNull();
    }
  });

  // ------------------------------------------------------------------
  // createCampusTopic()
  // ------------------------------------------------------------------
  it("createTopic() 创建新话题并 prepend 到列表", async () => {
    const store = useCampusStore();
    await store.fetchCampusTopics("study_help", 1);
    const initialCount = store.topics.length;

    await store.createCampusTopic({
      category: "study_help",
      title: "测试话题",
      content: "测试内容",
      isAnonymous: false,
    });

    expect(store.topics.length).toBe(initialCount + 1);
    expect(store.topics[0]!.title).toBe("测试话题");
  });

  it("createTopic() 空 title 抛出错误", async () => {
    const store = useCampusStore();
    await expect(
      store.createCampusTopic({
        category: "study_help",
        title: "",
        content: "内容",
        isAnonymous: false,
      }),
    ).rejects.toThrow();
  });

  it("createTopic() 空 content 抛出错误", async () => {
    const store = useCampusStore();
    await expect(
      store.createCampusTopic({
        category: "study_help",
        title: "标题",
        content: "",
        isAnonymous: false,
      }),
    ).rejects.toThrow();
  });

  // ------------------------------------------------------------------
  // fetchCampusReplies()
  // ------------------------------------------------------------------
  it("fetchReplies() 加载话题回复列表", async () => {
    const store = useCampusStore();
    await store.fetchCampusTopics("study_help", 1);
    if (store.topics.length > 0) {
      const topicId = store.topics[0]!.id;
      await store.fetchCampusReplies(topicId, 1);
      // mock 中至少不报错
      expect(store.errorMessage).toBeNull();
    }
  });

  // ------------------------------------------------------------------
  // replyToCampusTopic()
  // ------------------------------------------------------------------
  it("replyToTopic() 添加回复到列表", async () => {
    const store = useCampusStore();
    await store.fetchCampusTopics("study_help", 1);
    if (store.topics.length > 0) {
      const topicId = store.topics[0]!.id;
      await store.fetchCampusReplies(topicId, 1);
      const initialCount = store.replies.length;

      await store.replyToCampusTopic(topicId, "新回复内容");
      expect(store.replies.length).toBe(initialCount + 1);
    }
  });

  it("replyToTopic() 空内容抛出错误", async () => {
    const store = useCampusStore();
    await expect(store.replyToCampusTopic("topic-1", "")).rejects.toThrow();
  });

  // ------------------------------------------------------------------
  // 初始状态
  // ------------------------------------------------------------------
  it("初始状态 topics=[], currentTopic=null, replies=[]", () => {
    const store = useCampusStore();
    expect(store.topics).toEqual([]);
    expect(store.currentTopic).toBeNull();
    expect(store.replies).toEqual([]);
    expect(store.loading).toBe(false);
    expect(store.errorMessage).toBeNull();
  });
});
