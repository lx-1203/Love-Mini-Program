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
};

let responseBody = "";
let responseStatus = 200;

(globalThis as Record<string, unknown>).uni = {
  uploadFile: (options: UploadOptions) => {
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

describe("uploadProfileVoice 解包后端上传响应", () => {
  beforeEach(() => {
    responseStatus = 200;
  });

  it("接受后端 ApiResponse 信封并从 data.url 取出语音 URL", async () => {
    responseBody = JSON.stringify({
      success: true,
      data: {
        url: "/api/v1/media/voice/202610/voice-1.m4a",
        mime: "audio/mp4",
        size: 1024,
        durationMs: 15000,
      },
    });

    const result = await clientApi.uploadProfileVoice(
      { path: "/tmp/voice.m4a" },
      15000,
    );

    expect(result).toEqual({
      url: "/api/v1/media/voice/202610/voice-1.m4a",
    });
  });

  it("兼容扁平 {url} 响应", async () => {
    responseBody = JSON.stringify({ url: "/api/v1/media/voice/flat.m4a" });

    const result = await clientApi.uploadProfileVoice(
      { path: "/tmp/voice.m4a" },
      15000,
    );

    expect(result.url).toBe("/api/v1/media/voice/flat.m4a");
  });

  it("响应缺少语音 URL 时明确失败，不返回 undefined", async () => {
    responseBody = JSON.stringify({ success: true, data: { mime: "audio/mp4" } });

    await expect(
      clientApi.uploadProfileVoice({ path: "/tmp/voice.m4a" }, 15000),
    ).rejects.toThrow("上传响应缺少语音 URL");
  });
});
