import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

// mock clientApi 以避免触发真实 http 调用
// 使用 vi.hoisted 保证 mock 函数在 vi.mock 工厂执行前已初始化（vi.mock 自身被提升到文件顶部）
const {
  mockListSubmissions,
  mockCreateFeedbackIssue,
  mockCreateSuggestion,
  mockCreateActivityProposal,
} = vi.hoisted(() => ({
  mockListSubmissions: vi.fn(),
  mockCreateFeedbackIssue: vi.fn(),
  mockCreateSuggestion: vi.fn(),
  mockCreateActivityProposal: vi.fn(),
}));

vi.mock("../../services/api", () => ({
  clientApi: {
    listSubmissions: mockListSubmissions,
    createFeedbackIssue: mockCreateFeedbackIssue,
    createSuggestion: mockCreateSuggestion,
    createActivityProposal: mockCreateActivityProposal,
  },
}));

// stub global uni
(globalThis as any).uni = {};

import { useFeedbackStore } from "../../stores/feedback";

describe("feedback store - 反馈提交", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  // ------------------------------------------------------------------
  // load()
  // ------------------------------------------------------------------
  it("load() 成功加载反馈列表", async () => {
    const mockData = [{ id: 1, type: "issue", content: "测试问题" }];
    mockListSubmissions.mockResolvedValue(mockData);

    const store = useFeedbackStore();
    await store.load();

    expect(store.submissions).toEqual(mockData);
    expect(store.loading).toBe(false);
    expect(store.errorMessage).toBeNull();
  });

  it("load() 支持按 type 筛选", async () => {
    mockListSubmissions.mockResolvedValue([]);
    const store = useFeedbackStore();
    await store.load({ type: "issue" });

    expect(mockListSubmissions).toHaveBeenCalledWith({ type: "issue" });
  });

  it("load() 失败时设置 errorMessage", async () => {
    mockListSubmissions.mockRejectedValue(new Error("网络错误"));
    const store = useFeedbackStore();
    await store.load();

    expect(store.errorMessage).toBe("网络错误");
    expect(store.loading).toBe(false);
  });

  it("load() 失败且无 message 时使用默认错误文案", async () => {
    mockListSubmissions.mockRejectedValue("unknown error");
    const store = useFeedbackStore();
    await store.load();

    expect(store.errorMessage).toBe("加载反馈列表失败");
  });

  // ------------------------------------------------------------------
  // submitIssue()
  // ------------------------------------------------------------------
  it("submitIssue() 成功返回 true 并刷新列表", async () => {
    mockCreateFeedbackIssue.mockResolvedValue({ id: 1 });
    mockListSubmissions.mockResolvedValue([{ id: 1, type: "issue" }]);

    const store = useFeedbackStore();
    const result = await store.submitIssue({
      type: "bug",
      content: "页面打不开",
    });

    expect(result).toBe(true);
    expect(mockCreateFeedbackIssue).toHaveBeenCalledWith({
      type: "bug",
      content: "页面打不开",
    });
    expect(mockListSubmissions).toHaveBeenCalled();
  });

  it("submitIssue() 失败返回 false 并设置 errorMessage", async () => {
    mockCreateFeedbackIssue.mockRejectedValue(new Error("提交失败"));

    const store = useFeedbackStore();
    const result = await store.submitIssue({
      type: "bug",
      content: "测试",
    });

    expect(result).toBe(false);
    expect(store.errorMessage).toBe("提交失败");
  });

  // ------------------------------------------------------------------
  // submitSuggestion()
  // ------------------------------------------------------------------
  it("submitSuggestion() 成功返回 true", async () => {
    mockCreateSuggestion.mockResolvedValue({ id: 2 });
    mockListSubmissions.mockResolvedValue([]);

    const store = useFeedbackStore();
    const result = await store.submitSuggestion({
      content: "建议增加夜间模式",
    });

    expect(result).toBe(true);
    expect(mockCreateSuggestion).toHaveBeenCalledWith({
      content: "建议增加夜间模式",
    });
  });

  it("submitSuggestion() 失败返回 false", async () => {
    mockCreateSuggestion.mockRejectedValue(new Error("提交建议失败"));

    const store = useFeedbackStore();
    const result = await store.submitSuggestion({
      content: "建议",
    });

    expect(result).toBe(false);
    expect(store.errorMessage).toBe("提交建议失败");
  });

  // ------------------------------------------------------------------
  // submitActivityProposal()
  // ------------------------------------------------------------------
  it("submitActivityProposal() 成功返回 true", async () => {
    mockCreateActivityProposal.mockResolvedValue({ id: 3 });
    mockListSubmissions.mockResolvedValue([]);

    const store = useFeedbackStore();
    const result = await store.submitActivityProposal({
      title: "周末户外",
      description: "一起去户外徒步",
    });

    expect(result).toBe(true);
    expect(mockCreateActivityProposal).toHaveBeenCalledWith({
      title: "周末户外",
      description: "一起去户外徒步",
    });
  });

  it("submitActivityProposal() 失败返回 false", async () => {
    mockCreateActivityProposal.mockRejectedValue(new Error("提案提交失败"));

    const store = useFeedbackStore();
    const result = await store.submitActivityProposal({
      title: "测试",
    });

    expect(result).toBe(false);
    expect(store.errorMessage).toBe("提案提交失败");
  });

  // ------------------------------------------------------------------
  // loading 状态
  // ------------------------------------------------------------------
  it("操作期间 loading=true，完成后 loading=false", async () => {
    let resolvePromise: (val: unknown) => void;
    mockListSubmissions.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );

    const store = useFeedbackStore();
    const promise = store.load();
    expect(store.loading).toBe(true);

    resolvePromise!([]);
    await promise;
    expect(store.loading).toBe(false);
  });

  // ------------------------------------------------------------------
  // clearError()
  // ------------------------------------------------------------------
  it("clearError() 清除错误状态", async () => {
    mockListSubmissions.mockRejectedValue(new Error("err"));
    const store = useFeedbackStore();
    await store.load();
    expect(store.errorMessage).not.toBeNull();

    store.clearError();
    expect(store.errorMessage).toBeNull();
  });
});
