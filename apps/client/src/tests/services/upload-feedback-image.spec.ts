import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../services/env", () => ({
  appEnv: {
    apiMode: "real",
    apiBaseUrl: "http://127.0.0.1:8080/api",
  },
  isDev: false,
  isMockMode: () => false,
}));

type UploadOptions = {
  success?: (res: { statusCode: number; data: string }) => void;
  fail?: (err: { errMsg: string }) => void;
  header?: Record<string, string>;
};

let responseBody = "";
let responseStatus = 200;
/** 捕获最近一次 uni.uploadFile 的请求头，供幂等键断言使用 */
let lastHeader: Record<string, string> = {};

(globalThis as Record<string, unknown>).uni = {
  uploadFile: (options: UploadOptions) => {
    lastHeader = options.header ?? {};
    queueMicrotask(() =>
      options.success?.({ statusCode: responseStatus, data: responseBody }),
    );
    return { abort: () => {} };
  },
  getStorageSync: () => "",
  setStorageSync: () => {},
  removeStorageSync: () => {},
  showToast: () => {},
  reLaunch: () => {},
};

import { clientApi } from "../../services/api";

/**
 * P1-7 的同类漏修点：反馈图片上传。
 *
 * 后端 POST /api/v1/feedback/images 返回 ApiResponse 信封
 * （FeedbackController#uploadImage → ApiResponse.ok(UploadedImageResult)），
 * 而 uni.uploadFile 不走 http.ts 的自动解包，所以不解包时调用方
 * （subpackages/support/feedback/index.vue 的 `if (!result?.url) throw`）
 * 在真机上传成功后仍必然报错。
 */
describe("uploadFeedbackImage 解包后端上传响应", () => {
  beforeEach(() => {
    responseStatus = 200;
    lastHeader = {};
  });

  it("接受后端 ApiResponse 信封并从 data.url 取出图片 URL", async () => {
    responseBody = JSON.stringify({
      code: 0,
      message: "ok",
      data: { url: "/uploads/7/202610/uuid.png", size: 4096 },
    });

    const result = await clientApi.uploadFeedbackImage({
      path: "/tmp/shot.png",
    });

    expect(result).toEqual({ url: "/uploads/7/202610/uuid.png" });
  });

  it("兼容扁平 {url} 响应", async () => {
    responseBody = JSON.stringify({ url: "/uploads/flat.png" });

    const result = await clientApi.uploadFeedbackImage({ path: "/tmp/shot.png" });

    expect(result.url).toBe("/uploads/flat.png");
  });

  it("信封里 data 为 null 时明确失败，不把 undefined 交给调用方", async () => {
    responseBody = JSON.stringify({ code: 0, message: "ok", data: null });

    await expect(
      clientApi.uploadFeedbackImage({ path: "/tmp/shot.png" }),
    ).rejects.toThrow("反馈图片上传响应缺少资源 URL");
  });

  it("响应完全没有 URL 字段时同样失败（正向对照：不是静默返回 undefined）", async () => {
    responseBody = JSON.stringify({ code: 0, message: "ok", data: { size: 1 } });

    await expect(
      clientApi.uploadFeedbackImage({ path: "/tmp/shot.png" }),
    ).rejects.toThrow(/缺少资源 URL/);
  });

  it("同一文件连续两次上传使用不同的幂等键（4h TTL 内不得撞 409）", async () => {
    responseBody = JSON.stringify({ code: 0, data: { url: "/uploads/a.png" } });
    const sameFile = { path: "/tmp/same-name.png", name: "same-name.png" };

    await clientApi.uploadFeedbackImage(sameFile);
    const firstKey = lastHeader["Idempotency-Key"];
    await clientApi.uploadFeedbackImage(sameFile);
    const secondKey = lastHeader["Idempotency-Key"];

    expect(firstKey).toMatch(/\S/);
    expect(secondKey).toMatch(/\S/);
    expect(secondKey).not.toBe(firstKey);
  });
});
