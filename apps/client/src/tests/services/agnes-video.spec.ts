import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Agnes AI 视频服务单元测试（SubTask 1.4.5）
 *
 * 验证 `services/agnes-video.ts` 的核心行为：
 * 1. 调用后端代理时携带 AI 专用超时（30s）和 skipAuthRefresh=true
 * 2. 后端返回 AI_API_UNAUTHORIZED 业务错误码时，包装为用户友好提示
 * 3. 后端返回 AI_API_ERROR 业务错误码时，包装为"AI 服务暂时不可用"
 * 4. 后端返回 HTTP 401 但无业务错误码时，仍归为 AI_API_UNAUTHORIZED
 * 5. 后端返回 5xx 时归为 AI_API_ERROR
 * 6. 网络/未知异常统一归为 AI_API_ERROR
 *
 * 工程约束：
 * - 不使用 `import.meta.env.DEV`（mp-weixin 不支持）
 * - 不使用 `catch {}` 空绑定（mp-weixin 不兼容）
 */

// ------------------------------------------------------------------
// Mock 依赖：services/http
// ------------------------------------------------------------------
const mockRequest = vi.fn();

vi.mock("../../services/http", () => ({
  request: (...args: unknown[]) => mockRequest(...args),
}));

// Stub 全局 uni
(globalThis as any).uni = {
  showToast: vi.fn(),
};

import {
  callVideoGenerate,
  callImageGenerate,
  checkApiHealth,
} from "../../services/agnes-video";
import { AppApiError } from "../../services/api-error";
import {
  AI_API_TIMEOUT_MS,
  AI_API_UNAUTHORIZED_CODE,
  AI_API_ERROR_CODE,
} from "../../constants/api";

describe("services/agnes-video - SubTask 1.4.5 AI 服务错误处理", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ----------------------------------------------------------------
  // 场景 1：成功调用 - 携带 AI 专用超时与 skipAuthRefresh
  // ----------------------------------------------------------------
  it("callVideoGenerate 成功时使用 AI 专用超时（30s）与 skipAuthRefresh=true", async () => {
    const fakeResponse = { id: "v-1", status: "queued", videoUrl: "https://x.com/v.mp4" };
    mockRequest.mockResolvedValueOnce(fakeResponse);

    const result = await callVideoGenerate({ prompt: "校园春景" });

    expect(result).toEqual(fakeResponse);
    expect(mockRequest).toHaveBeenCalledTimes(1);
    const callArg = mockRequest.mock.calls[0]![0] as Record<string, unknown>;
    expect(callArg.timeout).toBe(AI_API_TIMEOUT_MS);
    expect(callArg.skipAuthRefresh).toBe(true);
    expect(callArg.url).toBe("/ai/video/generate");
    expect(callArg.method).toBe("POST");
  });

  it("callImageGenerate 成功时使用 AI 专用超时与 skipAuthRefresh=true", async () => {
    const fakeResponse = { data: [{ url: "https://x.com/i.png" }] };
    mockRequest.mockResolvedValueOnce(fakeResponse);

    const result = await callImageGenerate({ prompt: "校园风景" });

    expect(result).toEqual(fakeResponse);
    expect(mockRequest).toHaveBeenCalledTimes(1);
    const callArg = mockRequest.mock.calls[0]![0] as Record<string, unknown>;
    expect(callArg.timeout).toBe(AI_API_TIMEOUT_MS);
    expect(callArg.skipAuthRefresh).toBe(true);
    expect(callArg.url).toBe("/ai/image/generate");
  });

  it("checkApiHealth 成功时使用 AI 专用超时与 skipAuthRefresh=true", async () => {
    const fakeResponse = { code: "ok", message: "healthy", data: { status: "ok" } };
    mockRequest.mockResolvedValueOnce(fakeResponse);

    const result = await checkApiHealth();

    expect(result).toEqual(fakeResponse);
    const callArg = mockRequest.mock.calls[0]![0] as Record<string, unknown>;
    expect(callArg.timeout).toBe(AI_API_TIMEOUT_MS);
    expect(callArg.skipAuthRefresh).toBe(true);
    expect(callArg.url).toBe("/ai/health");
    expect(callArg.method).toBe("GET");
  });

  // ----------------------------------------------------------------
  // 场景 2：上游 AI 401（API Key 未配置/失效）→ AI_API_UNAUTHORIZED
  // ----------------------------------------------------------------
  it("后端返回 AI_API_UNAUTHORIZED 业务错误码时，包装为用户友好提示，不触发登录跳转", async () => {
    const upstreamError = new AppApiError({
      status: 401,
      error: AI_API_UNAUTHORIZED_CODE,
      message: "AI 服务未授权",
    });
    mockRequest.mockRejectedValueOnce(upstreamError);

    await expect(callVideoGenerate({ prompt: "x" })).rejects.toMatchObject({
      name: "AppApiError",
      status: 401,
      error: AI_API_UNAUTHORIZED_CODE,
      message: expect.stringContaining("AI 服务未授权"),
    });
  });

  it("AI_API_UNAUTHORIZED 错误应携带 operation 上下文", async () => {
    const upstreamError = new AppApiError({
      status: 401,
      error: AI_API_UNAUTHORIZED_CODE,
      message: "AI 服务未授权",
    });
    mockRequest.mockRejectedValueOnce(upstreamError);

    try {
      await callImageGenerate({ prompt: "x" });
      throw new Error("应抛出 AppApiError");
    } catch (e) {
      expect(e).toBeInstanceOf(AppApiError);
      const err = e as AppApiError;
      expect(err.error).toBe(AI_API_UNAUTHORIZED_CODE);
      // details 中应包含 operation 字段，便于日志追踪
      expect(err.details).toEqual(
        expect.objectContaining({ operation: "image" })
      );
    }
  });

  // ----------------------------------------------------------------
  // 场景 3：上游 AI 5xx/网络异常 → AI_API_ERROR
  // ----------------------------------------------------------------
  it("后端返回 AI_API_ERROR 业务错误码时，包装为'AI 服务暂时不可用'", async () => {
    const upstreamError = new AppApiError({
      status: 502,
      error: AI_API_ERROR_CODE,
      message: "AI 上游异常",
    });
    mockRequest.mockRejectedValueOnce(upstreamError);

    await expect(callVideoGenerate({ prompt: "x" })).rejects.toMatchObject({
      name: "AppApiError",
      status: 502,
      error: AI_API_ERROR_CODE,
      message: expect.stringContaining("AI 服务暂时不可用"),
    });
  });

  // ----------------------------------------------------------------
  // 场景 4：HTTP 401 但无 AI 业务错误码（防御性处理）
  // ----------------------------------------------------------------
  it("HTTP 401 但未带 AI 业务错误码时，仍归为 AI_API_UNAUTHORIZED", async () => {
    const plainAuthError = new AppApiError({
      status: 401,
      error: "unauthorized", // 普通 JWT 401
      message: "登录已过期",
    });
    mockRequest.mockRejectedValueOnce(plainAuthError);

    await expect(callVideoGenerate({ prompt: "x" })).rejects.toMatchObject({
      name: "AppApiError",
      status: 401,
      error: AI_API_UNAUTHORIZED_CODE,
    });
  });

  // ----------------------------------------------------------------
  // 场景 5：5xx 错误归为 AI_API_ERROR
  // ----------------------------------------------------------------
  it("HTTP 500 错误归为 AI_API_ERROR", async () => {
    const serverError = new AppApiError({
      status: 500,
      error: "server_error",
      message: "Internal Server Error",
    });
    mockRequest.mockRejectedValueOnce(serverError);

    await expect(callImageGenerate({ prompt: "x" })).rejects.toMatchObject({
      name: "AppApiError",
      status: 500,
      error: AI_API_ERROR_CODE,
    });
  });

  // ----------------------------------------------------------------
  // 场景 6：网络异常（status=0）归为 AI_API_ERROR
  // ----------------------------------------------------------------
  it("网络异常（status=0）归为 AI_API_ERROR", async () => {
    const networkError = new AppApiError({
      status: 0,
      error: "network",
      message: "网络请求失败",
    });
    mockRequest.mockRejectedValueOnce(networkError);

    await expect(checkApiHealth()).rejects.toMatchObject({
      name: "AppApiError",
      status: 0,
      error: AI_API_ERROR_CODE,
    });
  });

  // ----------------------------------------------------------------
  // 场景 7：原生 Error（非 AppApiError）统一归为 AI_API_ERROR
  // ----------------------------------------------------------------
  it("原生 Error 统一归为 AI_API_ERROR", async () => {
    const rawError = new Error("网络断开");
    mockRequest.mockRejectedValueOnce(rawError);

    await expect(callVideoGenerate({ prompt: "x" })).rejects.toMatchObject({
      name: "AppApiError",
      status: 0,
      error: AI_API_ERROR_CODE,
      message: expect.stringContaining("AI 服务暂时不可用"),
    });
  });

  // ----------------------------------------------------------------
  // 场景 8：400 业务错误保留原状（参数错误等）
  // ----------------------------------------------------------------
  it("HTTP 400 业务错误保留原状，不归为 AI_API_ERROR/AI_API_UNAUTHORIZED", async () => {
    const badRequest = new AppApiError({
      status: 400,
      error: "bad_request",
      message: "prompt 不能为空",
    });
    mockRequest.mockRejectedValueOnce(badRequest);

    await expect(callVideoGenerate({ prompt: "" })).rejects.toMatchObject({
      name: "AppApiError",
      status: 400,
      error: "bad_request",
      message: "prompt 不能为空",
    });
  });

  // ----------------------------------------------------------------
  // 场景 9：默认参数填充
  // ----------------------------------------------------------------
  it("callVideoGenerate 未传 duration/style/resolution 时使用默认值", async () => {
    mockRequest.mockResolvedValueOnce({ id: "v-1", status: "ok" });

    await callVideoGenerate({ prompt: "x" });

    const callArg = mockRequest.mock.calls[0]![0] as Record<string, unknown>;
    const data = callArg.data as Record<string, unknown>;
    expect(data.duration).toBe(5);
    expect(data.style).toBe("campus");
    expect(data.resolution).toBe("720p");
  });

  it("callImageGenerate 未传 n/size 时使用默认值", async () => {
    mockRequest.mockResolvedValueOnce({ data: [{ url: "x" }] });

    await callImageGenerate({ prompt: "x" });

    const callArg = mockRequest.mock.calls[0]![0] as Record<string, unknown>;
    const data = callArg.data as Record<string, unknown>;
    expect(data.n).toBe(1);
    expect(data.size).toBe("1024x1024");
  });
});
