import { beforeEach, describe, expect, it, vi } from "vitest";
import { clientEnv } from "../../config/env";

/**
 * P0-2 收口最后一寸（客户端侧）：媒体 URL 不再携带会话凭据。
 *
 * 历史行为是 resolveMediaUrl 把**完整 24 小时会话 JWT** 拼成 `?token=…`，
 * 于是凭据常驻浏览器历史与上游代理/CDN 日志。现改为后端
 * POST /api/v1/media/sign 签发的能力型 URL（逐路径绑定 + 15 分钟过期）。
 *
 * 本文件的重点是那条**安全性质**：real 档下 resolveMediaUrl 的输出里
 * 永远不许再出现 `token=`。签名缓存本身的行为在 media-sign-cache.spec.ts 里测。
 */

const signedMediaUrl = vi.fn();
const mediaSignVersion = vi.fn(() => 0);

vi.mock("../../utils/media-sign-cache", () => ({
  signedMediaUrl: (path: string) => signedMediaUrl(path),
  mediaSignVersion: () => mediaSignVersion(),
  prefetchMediaSignatures: vi.fn(),
  clearMediaSignCache: vi.fn(),
}));

import { resolveMediaUrl } from "../../utils/media";

const API_ROOT = (clientEnv.apiBaseUrl || "").replace(/\/api\/?$/, "");

function withApiMode(mode: "real" | "mock", fn: () => void): void {
  const env = clientEnv as unknown as { apiMode: string };
  const before = env.apiMode;
  env.apiMode = mode;
  try {
    fn();
  } finally {
    env.apiMode = before;
  }
}

beforeEach(() => {
  signedMediaUrl.mockReset();
  signedMediaUrl.mockReturnValue(null);
  mediaSignVersion.mockClear();
});

describe("resolveMediaUrl 改用能力型签名 URL", () => {
  it("real 档且签名已到：返回带 exp/sig 的 URL，且不含任何 token 参数", () => {
    signedMediaUrl.mockReturnValue(
      "/api/v1/media/7/202610/a.jpg?exp=1893456000&sig=deadbeefdeadbeefdeadbeefdeadbeef",
    );

    withApiMode("real", () => {
      const resolved = resolveMediaUrl("/api/v1/media/7/202610/a.jpg");

      expect(resolved).toContain("exp=1893456000");
      expect(resolved).toContain("sig=deadbeef");
      expect(resolved).not.toContain("token=");
    });
  });

  it("real 档但签名未到：返回原 URL 而不是把 JWT 顶上（正向对照：凭据不出现在 URL）", () => {
    withApiMode("real", () => {
      const resolved = resolveMediaUrl("/api/v1/media/7/202610/a.jpg");

      expect(resolved).not.toContain("token=");
      expect(signedMediaUrl).toHaveBeenCalledWith("/api/v1/media/7/202610/a.jpg");
    });
  });

  it("/uploads/... 重写为代理 URL 后同样只问签名、不拼凭据", () => {
    withApiMode("real", () => {
      const resolved = resolveMediaUrl("/uploads/9/202612/b.jpg");

      expect(resolved).not.toContain("token=");
      expect(signedMediaUrl).toHaveBeenCalledWith("/api/v1/media/9/202612/b.jpg");
    });
  });

  it("按路径查签名（不是按整条 URL），保证与后端签发时逐字一致", () => {
    withApiMode("real", () => {
      resolveMediaUrl("/api/v1/media/123/202611/x.png");
      resolveMediaUrl("/uploads/123/202611/x.png");
    });

    const queried = signedMediaUrl.mock.calls.map((call) => call[0]);
    expect(queried).toEqual([
      "/api/v1/media/123/202611/x.png",
      "/api/v1/media/123/202611/x.png",
    ]);
  });

  it("mock 档完全不问签名（这些档不依赖后端，媒体走包内资源）", () => {
    withApiMode("mock", () => {
      resolveMediaUrl("/api/v1/media/7/202610/a.jpg");
    });

    expect(signedMediaUrl).not.toHaveBeenCalled();
  });

  it("读版本号建立响应式依赖：否则签名异步到达后图片不会补上", () => {
    withApiMode("real", () => {
      resolveMediaUrl("/api/v1/media/7/202610/a.jpg");
    });

    expect(mediaSignVersion).toHaveBeenCalled();
  });

  it("公开应用资产不需要签名（app-assets 本就 permitAll）", () => {
    withApiMode("real", () => {
      const resolved = resolveMediaUrl("/api/v1/media/app-assets/generated/a.png");
      expect(resolved).not.toContain("token=");
    });
    expect(signedMediaUrl).not.toHaveBeenCalled();
  });
});
