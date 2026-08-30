import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

// mock report-api 以避免触发真实 http 调用
// 使用 vi.hoisted 保证 mock 函数在 vi.mock 工厂执行前已初始化（vi.mock 自身被提升到文件顶部）
const { mockReportTarget } = vi.hoisted(() => ({
  mockReportTarget: vi.fn(),
}));
vi.mock("../../services/report-api", () => ({
  reportTarget: mockReportTarget,
}));

// stub global uni
(globalThis as any).uni = {};

import { useReportStore } from "../../stores/report";

describe("report store - 举报", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  // ------------------------------------------------------------------
  // 初始状态
  // ------------------------------------------------------------------
  it("初始状态 submitting=false, errorMessage=null", () => {
    const store = useReportStore();
    expect(store.submitting).toBe(false);
    expect(store.errorMessage).toBeNull();
  });

  // ------------------------------------------------------------------
  // reportTarget() - 成功
  // ------------------------------------------------------------------
  it("reportTarget() 成功时返回举报记录", async () => {
    const mockResponse = { id: 1, success: true };
    mockReportTarget.mockResolvedValue(mockResponse);

    const store = useReportStore();
    const result = await store.reportTarget("POST", 100, "垃圾广告", "测试描述");

    expect(result).toEqual(mockResponse);
    expect(mockReportTarget).toHaveBeenCalledWith("POST", 100, "垃圾广告", "测试描述");
    expect(store.submitting).toBe(false);
    expect(store.errorMessage).toBeNull();
  });

  it("reportTarget() 调用期间 submitting=true", async () => {
    let resolvePromise: (val: unknown) => void;
    mockReportTarget.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );

    const store = useReportStore();
    const promise = store.reportTarget("POST", 1, "原因");
    expect(store.submitting).toBe(true);

    resolvePromise!({ id: 1 });
    await promise;
    expect(store.submitting).toBe(false);
  });

  // ------------------------------------------------------------------
  // reportTarget() - 失败
  // ------------------------------------------------------------------
  it("reportTarget() 失败时设置 errorMessage 并抛出", async () => {
    const error = new Error("网络错误");
    mockReportTarget.mockRejectedValue(error);

    const store = useReportStore();
    await expect(store.reportTarget("POST", 1, "原因")).rejects.toThrow("网络错误");

    expect(store.errorMessage).toBe("网络错误");
    expect(store.submitting).toBe(false);
  });

  it("reportTarget() 失败且无 message 时使用默认错误文案", async () => {
    mockReportTarget.mockRejectedValue("unknown");

    const store = useReportStore();
    await expect(store.reportTarget("POST", 1, "原因")).rejects.toThrow();

    expect(store.errorMessage).toBeTruthy();
    expect(store.submitting).toBe(false);
  });

  // ------------------------------------------------------------------
  // clearError()
  // ------------------------------------------------------------------
  it("clearError() 清除错误状态", async () => {
    mockReportTarget.mockRejectedValue(new Error("err"));

    const store = useReportStore();
    await expect(store.reportTarget("POST", 1, "原因")).rejects.toThrow();
    expect(store.errorMessage).not.toBeNull();

    store.clearError();
    expect(store.errorMessage).toBeNull();
  });

  // ------------------------------------------------------------------
  // 各种举报目标类型
  // ------------------------------------------------------------------
  it("reportTarget() 支持 POST 类型", async () => {
    mockReportTarget.mockResolvedValue({ id: 1 });
    const store = useReportStore();
    await store.reportTarget("POST", "post-123", "垃圾广告");
    expect(mockReportTarget).toHaveBeenCalledWith("POST", "post-123", "垃圾广告", undefined);
  });

  it("reportTarget() 支持 CHAT 类型", async () => {
    mockReportTarget.mockResolvedValue({ id: 2 });
    const store = useReportStore();
    await store.reportTarget("CHAT", "chat-456", "骚扰");
    expect(mockReportTarget).toHaveBeenCalledWith("CHAT", "chat-456", "骚扰", undefined);
  });

  it("reportTarget() 支持 USER 类型", async () => {
    mockReportTarget.mockResolvedValue({ id: 3 });
    const store = useReportStore();
    await store.reportTarget("USER", "user-789", "违规用户");
    expect(mockReportTarget).toHaveBeenCalledWith("USER", "user-789", "违规用户", undefined);
  });

  it("reportTarget() 传递 description 可选参数", async () => {
    mockReportTarget.mockResolvedValue({ id: 4 });
    const store = useReportStore();
    await store.reportTarget("POST", 1, "原因", "详细描述");
    expect(mockReportTarget).toHaveBeenCalledWith("POST", 1, "原因", "详细描述");
  });
});
