import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 媒体签名缓存自身的行为。
 *
 * 这四条都是「不做就会在真机上表现为图片不出的」：
 * 批量合并（一屏图一次签发而不是每张一次）、到期前重签（边界上不能拿到刚过期的签名）、
 * 换账号即失效（签名是上一个账号的能力凭据）、失败退避（读不到的路径不能每帧重发）。
 */

const request = vi.fn();
let currentToken = "jwt-token-aaaaaaaaaaaaaaaa";

vi.mock("../../services/http", () => ({
  request: (options: unknown) => request(options),
  getToken: () => currentToken,
}));

import {
  clearMediaSignCache,
  mediaSignVersion,
  signedMediaUrl,
} from "../../utils/media-sign-cache";

/** 等一次 setTimeout(0) 的批量 flush */
async function flushTick(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
}

function signResponse(paths: string[], expiresAt: number) {
  return {
    items: paths.map((path) => ({
      path,
      url: `${path}?exp=${expiresAt}&sig=sig-${path.length}`,
      expiresAt,
    })),
  };
}

beforeEach(() => {
  request.mockReset();
  currentToken = "jwt-token-aaaaaaaaaaaaaaaa";
  clearMediaSignCache();
});

describe("media-sign-cache", () => {
  it("同一帧内多个路径合并成一次签发请求", async () => {
    const future = Math.floor(Date.now() / 1000) + 900;
    request.mockResolvedValueOnce(
      signResponse(["/api/v1/media/7/a.jpg", "/api/v1/media/7/b.jpg"], future),
    );

    expect(signedMediaUrl("/api/v1/media/7/a.jpg")).toBeNull();
    expect(signedMediaUrl("/api/v1/media/7/b.jpg")).toBeNull();
    await flushTick();

    expect(request).toHaveBeenCalledTimes(1);
    const call = request.mock.calls[0][0] as { url: string; method: string; data: { paths: string[] } };
    expect(call.url).toBe("/media/sign");
    expect(call.method).toBe("POST");
    expect(call.data.paths.sort()).toEqual(["/api/v1/media/7/a.jpg", "/api/v1/media/7/b.jpg"]);
  });

  it("签名到达后同一路径直接返回带 exp/sig 的 URL，且版本号前进", async () => {
    const future = Math.floor(Date.now() / 1000) + 900;
    request.mockResolvedValueOnce(signResponse(["/api/v1/media/7/a.jpg"], future));
    const versionBefore = mediaSignVersion();

    signedMediaUrl("/api/v1/media/7/a.jpg");
    await flushTick();

    const signed = signedMediaUrl("/api/v1/media/7/a.jpg");
    expect(signed).toContain(`exp=${future}`);
    expect(signed).toContain("sig=");
    expect(mediaSignVersion()).toBeGreaterThan(versionBefore);
    // 已有新鲜签名时不再发请求
    const callsAfterCache = request.mock.calls.length;
    signedMediaUrl("/api/v1/media/7/a.jpg");
    await flushTick();
    expect(request).toHaveBeenCalledTimes(callsAfterCache);
  });

  it("令牌变化（登出/换账号）后旧签名立即失效并重新签发", async () => {
    const future = Math.floor(Date.now() / 1000) + 900;
    request.mockResolvedValueOnce(signResponse(["/api/v1/media/7/a.jpg"], future));
    signedMediaUrl("/api/v1/media/7/a.jpg");
    await flushTick();
    expect(signedMediaUrl("/api/v1/media/7/a.jpg")).toContain("sig=");

    currentToken = "jwt-token-bbbbbbbbbbbbbbbb";
    // 换账号后同一路径必须视为无凭据：先返回 null 并重新签发
    expect(signedMediaUrl("/api/v1/media/7/a.jpg")).toBeNull();
    await flushTick();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("后端静默省略的路径进入退避，不会每帧重发", async () => {
    request.mockResolvedValueOnce({ items: [] });

    signedMediaUrl("/api/v1/media/99/secret.jpg");
    await flushTick();
    signedMediaUrl("/api/v1/media/99/secret.jpg");
    await flushTick();

    expect(request).toHaveBeenCalledTimes(1);
  });

  it("签发请求失败也进入退避，且不抛出到调用方", async () => {
    request.mockRejectedValueOnce(new Error("network down"));

    expect(signedMediaUrl("/api/v1/media/7/a.jpg")).toBeNull();
    await flushTick();
    expect(signedMediaUrl("/api/v1/media/7/a.jpg")).toBeNull();
    await flushTick();

    expect(request).toHaveBeenCalledTimes(1);
  });

  it("clearMediaSignCache 之后同一路径重新签发（凭据不跨会话复用）", async () => {
    const future = Math.floor(Date.now() / 1000) + 900;
    request.mockResolvedValueOnce(signResponse(["/api/v1/media/7/a.jpg"], future));
    signedMediaUrl("/api/v1/media/7/a.jpg");
    await flushTick();
    expect(signedMediaUrl("/api/v1/media/7/a.jpg")).toContain("sig=");

    clearMediaSignCache();
    expect(signedMediaUrl("/api/v1/media/7/a.jpg")).toBeNull();
    await flushTick();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("在用路径超过缓存上限时不淘汰仍在渲染的条目，不形成淘汰→重签循环（R17 回归）", async () => {
    const future = Math.floor(Date.now() / 1000) + 900;
    request.mockImplementation((options: { data: { paths: string[] } }) =>
      Promise.resolve(signResponse(options.data.paths, future)),
    );
    // 累积挂载（无虚拟列表的 feed）：每页 20 张新图，签名到达（版本号前进）后整屏重读一遍
    const mounted: string[] = [];
    for (let page = 0; page < 30; page++) {
      for (let i = 0; i < 20; i++) mounted.push(`/api/v1/media/7/p${page}-${i}.jpg`);
      for (const p of mounted) signedMediaUrl(p);
      await flushTick();
      for (const p of mounted) signedMediaUrl(p);
      await flushTick();
    }

    // 600 张在用（> 上限 500）：静置重渲染若干轮，不应再有未命中，也不应自发签发
    const callsBefore = request.mock.calls.length;
    for (let round = 0; round < 5; round++) {
      expect(mounted.filter((p) => signedMediaUrl(p) === null)).toEqual([]);
      await flushTick();
    }
    expect(request).toHaveBeenCalledTimes(callsBefore);
  });

  it("超限时仍淘汰在用窗口外的闲置条目（上限对闲置条目生效），在用条目保留", async () => {
    const realNow = Date.now();
    let offsetMs = 0;
    const nowSpy = vi.spyOn(Date, "now").mockImplementation(() => realNow + offsetMs);
    try {
      const future = Math.floor(realNow / 1000) + 900;
      request.mockImplementation((options: { data: { paths: string[] } }) =>
        Promise.resolve(signResponse(options.data.paths, future)),
      );
      const paths = Array.from({ length: 520 }, (_, i) => `/api/v1/media/7/q${i}.jpg`);
      for (let start = 0; start < paths.length; start += 100) {
        for (const p of paths.slice(start, start + 100)) signedMediaUrl(p);
        await flushTick();
      }
      expect(paths.filter((p) => signedMediaUrl(p) === null)).toEqual([]);

      // 全部闲置超过在用窗口后，只有仍在屏的 10 张被再次读取
      offsetMs = 61_000;
      const onScreen = paths.slice(-10);
      for (const p of onScreen) expect(signedMediaUrl(p)).not.toBeNull();
      // 新路径触发一次 flush（其间做超限淘汰）
      signedMediaUrl("/api/v1/media/7/next.jpg");
      await flushTick();

      expect(signedMediaUrl(paths[0])).toBeNull();
      for (const p of onScreen) expect(signedMediaUrl(p)).not.toBeNull();
    } finally {
      nowSpy.mockRestore();
    }
  });
});
