import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

/**
 * MP-R2-CAMPUSINDEX-010：认证状态拉取错误的独立字段（certificationError）。
 *
 * 背景：fetchCertificationStatus 的非 404 失败原先只写共享 errorMessage，而 campus/index.vue
 * 的错误槽绑 topicsError（003/007 的解耦结果），于是「认证拉取失败」被静默渲染成
 * 「未认证 + 认证引导卡」。现拆出 certificationError，errorMessage 同步保留
 * （hub.vue:156/185 的 certLoadFailed 错误条读它）。
 */

vi.mock("../../services/env", () => ({
  appEnv: {
    apiMode: "real",
    apiBaseUrl: "http://127.0.0.1:8080/api",
  },
  isMockMode: () => false,
}));

vi.mock("../../stores/helpers/use-mock", () => ({
  useMock: vi.fn(() => false),
}));

vi.mock("../../services/http", () => ({
  request: vi.fn(),
}));

(globalThis as any).uni = {};

import { request } from "../../services/http";
import { useCampusStore } from "../../stores/campus";
import { AppApiError } from "../../services/api-error";

const okView = {
  id: 1,
  userId: 1,
  schoolName: "清华大学",
  major: "计算机科学",
  studentIdCardUrl: "https://cdn.example.com/card.png",
  status: "APPROVED",
  reviewComment: "",
};

describe("campus store - fetchCertificationStatus 错误拆分", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.mocked(request).mockReset();
  });

  it("非 404 失败：写 certificationError，且不清掉上次成功的认证状态", async () => {
    const store = useCampusStore();
    vi.mocked(request).mockResolvedValueOnce(okView as never);
    await store.fetchCertificationStatus();
    expect(store.certificationStatus).toBe("verified");
    expect(store.certificationError).toBeNull();

    vi.mocked(request).mockRejectedValueOnce(
      new AppApiError({ status: 500, error: "internal_server_error", message: "服务器开小差了" }),
    );
    await store.fetchCertificationStatus();

    // 页面错误槽读独立字段，不再依赖话题错误槽
    expect(store.certificationError).toBe("服务器开小差了");
    // hub.vue 的错误条仍读 errorMessage（本次不能改 hub.vue，字段必须同步写）
    expect(store.errorMessage).toBe("服务器开小差了");
    // 不回退 unverified：徽标/引导卡继续按上次成功结果渲染
    expect(store.certificationStatus).toBe("verified");
    expect(store.certificationInfo?.schoolName).toBe("清华大学");
  });

  it("404（无认证记录）属正常语义：回 unverified 且两枚错误字段都为空", async () => {
    const store = useCampusStore();
    vi.mocked(request).mockRejectedValueOnce(
      new AppApiError({ status: 404, error: "not_found", message: "请求的资源不存在" }),
    );
    await store.fetchCertificationStatus();

    expect(store.certificationStatus).toBe("unverified");
    expect(store.certificationError).toBeNull();
    expect(store.errorMessage).toBeNull();
  });

  it("话题列表错误不占用 certificationError（两槽互不串扰）", async () => {
    const store = useCampusStore();
    vi.mocked(request).mockRejectedValueOnce(
      new AppApiError({ status: 500, error: "internal_server_error", message: "话题加载失败" }),
    );
    await store.fetchCampusTopics("study_help", 1);
    expect(store.topicsError).toBe("话题加载失败");
    expect(store.certificationError).toBeNull();

    vi.mocked(request).mockRejectedValueOnce(
      new AppApiError({ status: 503, error: "service_unavailable", message: "认证加载失败" }),
    );
    await store.fetchCertificationStatus();
    expect(store.certificationError).toBe("认证加载失败");
    // 认证错误不得渲染进话题错误槽（campus/index.vue 的槽绑 topicsError）
    expect(store.topicsError).toBe("话题加载失败");

    // 认证重取成功即清自己的槽，话题槽不受影响
    vi.mocked(request).mockResolvedValueOnce(okView as never);
    await store.fetchCertificationStatus();
    expect(store.certificationError).toBeNull();
    expect(store.topicsError).toBe("话题加载失败");
  });
});
