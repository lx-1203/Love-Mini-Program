import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { STORAGE_KEYS } from "../../constants/storage-keys";

/**
 * P1-1 幂等键语义测试（services/http.ts 写请求自动补键拦截器）。
 *
 * 语义基线（本次修复确立）：**幂等键标识「一次逻辑调用」，而不是「端点 + body」**。
 * - 同 method + 同 URL + 同 body 的两次独立业务动作（收藏 toggle 第 2 次、
 *   关注→取关→再关注、双击发帖）= 两个逻辑操作 ⇒ 必须拿到不同 key，两次都被放行；
 *   旧实现（R4-00168）按 method+URL+body 哈希生成稳定 key，第二次在
 *   后端 @Idempotent（默认 TTL 4h）上撞 409，收藏无法取消、关注无法再关注；
 * - 同一次逻辑调用的**底层重试**（网络层指数退避重试、401 刷新后重发）
 *   必须复用**同一个** key——这才是 @Idempotent 真正要防的「一次操作被投递两次」；
 * - 调用方显式传入的业务幂等键（签到 / 充值 / 解锁 / 活动 / orderId）原样保留，
 *   由业务语义自行决定去重范围，拦截器不覆盖；
 * - GET 不补键（幂等键只服务于写操作）。
 *
 * 测试手法：桩 globalThis.uni.request 捕获每次真正出网的 header，用 sent 数组下标
 * 区分「同一次调用的第 N 次投递」与「第 N 次调用」。
 */

type UniRequestOpts = {
  url: string;
  method?: string;
  header?: Record<string, string>;
  data?: unknown;
  timeout?: number;
  success?: (res: { statusCode: number; data: unknown }) => void;
  fail?: (err: { errMsg: string }) => void;
};

/** 每次 uni.request 调用的入参快照（下标即投递次序） */
const sent: UniRequestOpts[] = [];

/** 当前用例的响应脚本：按投递下标决定成功/失败 */
let respond: (opts: UniRequestOpts, index: number) => void = () => {};

const storage = new Map<string, unknown>();

(globalThis as Record<string, unknown>).uni = {
  request: (opts: UniRequestOpts) => {
    const index = sent.length;
    sent.push(opts);
    // 与真实 uni.request 一致：回调异步派发，避免在 Promise executor 内同步 settle
    queueMicrotask(() => respond(opts, index));
    return { abort: () => {} };
  },
  setStorageSync: (key: string, value: unknown) => {
    storage.set(key, value);
  },
  getStorageSync: (key: string) => (storage.has(key) ? storage.get(key) : ""),
  removeStorageSync: (key: string) => {
    storage.delete(key);
  },
  showToast: () => {},
  reLaunch: () => {},
};

// 桩设置完成后才导入被测模块（http.ts 模块体内不读 uni，导入顺序安全）
import { generateIdempotencyKey, request } from "../../services/http";

/** 取第 index 次投递携带的幂等键 */
function keyOf(index: number): string {
  const header = sent[index]?.header || {};
  return header["Idempotency-Key"] ?? "";
}

/** 取第 index 次投递携带的 Authorization 头 */
function authOf(index: number): string {
  const header = sent[index]?.header || {};
  return header["Authorization"] ?? "";
}

/** 固定成功响应脚本 */
function alwaysOk(opts: UniRequestOpts): void {
  opts.success?.({ statusCode: 200, data: { ok: true } });
}

/** 后端 IdempotentInterceptor 的 MAX_KEY_LENGTH（apps/api/.../IdempotentInterceptor.java） */
const BACKEND_MAX_KEY_LENGTH = 128;

describe("services/http 幂等键语义（P1-1：一键一逻辑操作）", () => {
  beforeEach(() => {
    sent.length = 0;
    storage.clear();
    respond = alwaysOk;
    // 默认处于已登录态：写端点 @PreAuthorize 要求携带 token
    storage.set(STORAGE_KEYS.AUTH_TOKEN, "jwt-old");
  });

  // ----------------------------------------------------------------
  // 1. 收藏 toggle：第二次点击是「取消收藏」，必须被放行
  // ----------------------------------------------------------------
  it("连续两次相同 POST favorite（同 URL 同 body）拿到不同 key，两次都被发出", async () => {
    await request({ url: "/village/posts/7/favorite", method: "POST" });
    await request({ url: "/village/posts/7/favorite", method: "POST" });

    expect(sent).toHaveLength(2);
    const first = keyOf(0);
    const second = keyOf(1);
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(first).not.toBe(second);
    expect(first.length).toBeLessThanOrEqual(BACKEND_MAX_KEY_LENGTH);
  });

  // ----------------------------------------------------------------
  // 2. 关注 → 取关 → 再关注：第二次关注不能被第一次的 key 拦成 409
  // ----------------------------------------------------------------
  it("follow → unfollow → follow 两次 POST follow 的 key 不同", async () => {
    await request({ url: "/users/42/follow", method: "POST" });
    await request({ url: "/users/42/follow", method: "DELETE" });
    await request({ url: "/users/42/follow", method: "POST" });

    expect(sent).toHaveLength(3);
    expect(keyOf(0)).toBeTruthy();
    expect(keyOf(2)).toBeTruthy();
    expect(keyOf(0)).not.toBe(keyOf(2));
    // DELETE 也纳入自动补键范围（后端 DELETE /follow 同样标了 @Idempotent）
    expect(keyOf(1)).toBeTruthy();
  });

  // ----------------------------------------------------------------
  // 3. 同 body 重复提交：仍是两个独立逻辑操作
  // ----------------------------------------------------------------
  it("同 method + 同 URL + 同 body 的两次调用生成不同 key（body 哈希方案已废弃）", async () => {
    const payload = { issueType: "BUG", content: "同一段反馈文本" };
    await request({ url: "/feedback/issues", method: "POST", data: payload });
    await request({ url: "/feedback/issues", method: "POST", data: payload });

    expect(sent).toHaveLength(2);
    expect(keyOf(0)).not.toBe(keyOf(1));
  });

  // ----------------------------------------------------------------
  // 4. 网络层重试：同一次逻辑调用的第 2 次投递必须复用原 key
  // ----------------------------------------------------------------
  it("网络层错误自动重试复用同一个 key（防「一次操作投递两次」）", async () => {
    respond = (opts, index) => {
      if (index === 0) {
        opts.fail?.({ errMsg: "request:fail timeout" });
      } else {
        opts.success?.({ statusCode: 200, data: { ok: true } });
      }
    };

    await request({
      url: "/village/posts/7/favorite",
      method: "POST",
      retry: 1,
    });

    expect(sent).toHaveLength(2);
    expect(keyOf(1)).toBe(keyOf(0));
  }, 10000);

  // ----------------------------------------------------------------
  // 5. 401 刷新后重发：复用原 key，只换 Authorization
  // ----------------------------------------------------------------
  it("401 刷新令牌后的重发复用同一个 key", async () => {
    respond = (opts, index) => {
      if (index === 0) {
        opts.success?.({
          statusCode: 401,
          data: { error: "unauthorized", message: "登录已过期" },
        });
      } else if (index === 1) {
        // 刷新端点自身是一枚新的逻辑操作，必须自带（且唯一）的 key
        expect(opts.url).toContain("/auth/refresh");
        expect(keyOf(1)).toBeTruthy();
        expect(keyOf(1)).not.toBe(keyOf(0));
        opts.success?.({ statusCode: 200, data: { token: "jwt-new" } });
      } else {
        opts.success?.({ statusCode: 200, data: { ok: true } });
      }
    };

    await request({ url: "/village/posts/7/favorite", method: "POST" });

    expect(sent).toHaveLength(3);
    // 第 3 次投递 = 原请求用新 token 重发
    expect(keyOf(2)).toBe(keyOf(0));
    expect(authOf(0)).toBe("Bearer jwt-old");
    expect(authOf(2)).toBe("Bearer jwt-new");
  });

  // ----------------------------------------------------------------
  // 6. 显式业务幂等键：原样透传，两次相同 key 仍按业务语义去重
  // ----------------------------------------------------------------
  it("调用方显式传入的 Idempotency-Key（签到/充值/解锁/活动）不被覆盖", async () => {
    const manual = "checkin-2026-10-25";
    await request({
      url: "/growth/check-in",
      method: "POST",
      headers: { "Idempotency-Key": manual },
    });
    await request({
      url: "/growth/check-in",
      method: "POST",
      headers: { "Idempotency-Key": manual },
    });

    expect(sent).toHaveLength(2);
    expect(keyOf(0)).toBe(manual);
    expect(keyOf(1)).toBe(manual);
  });

  it("显式业务键在网络重试后依然保持不变", async () => {
    respond = (opts, index) => {
      if (index === 0) {
        opts.fail?.({ errMsg: "request:fail timeout" });
      } else {
        opts.success?.({ statusCode: 200, data: { ok: true } });
      }
    };

    await request({
      url: "/wallet/deduct",
      method: "POST",
      data: { amount: 10 },
      headers: { "Idempotency-Key": "UNLOCK-PROFILE-1001" },
      retry: 1,
    });

    expect(sent).toHaveLength(2);
    expect(keyOf(0)).toBe("UNLOCK-PROFILE-1001");
    expect(keyOf(1)).toBe("UNLOCK-PROFILE-1001");
  }, 10000);

  // ----------------------------------------------------------------
  // 7. GET 不补键
  // ----------------------------------------------------------------
  it("GET 请求不附带 Idempotency-Key", async () => {
    await request({ url: "/auth/me", method: "GET" });

    expect(sent).toHaveLength(1);
    expect(sent[0].header?.["Idempotency-Key"]).toBeUndefined();
    // 认证头照常附加
    expect(authOf(0)).toBe("Bearer jwt-old");
  });

  // ----------------------------------------------------------------
  // 8. 键生成器：唯一性 + 长度上限
  // ----------------------------------------------------------------
  it("generateIdempotencyKey 在同一运行内不产生重复键且满足后端 128 字符上限", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const key = generateIdempotencyKey("POST");
      expect(key.length).toBeGreaterThan(0);
      expect(key.length).toBeLessThanOrEqual(BACKEND_MAX_KEY_LENGTH);
      seen.add(key);
    }
    expect(seen.size).toBe(2000);
  });

  it("generateIdempotencyKey 在缺少 crypto 的环境（mp-weixin）下仍不重复", () => {
    // 模拟无 WebCrypto 的运行时：randomUUID 与 getRandomValues 都不可用
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
    Object.defineProperty(globalThis, "crypto", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    try {
      const seen = new Set<string>();
      for (let i = 0; i < 2000; i++) {
        seen.add(generateIdempotencyKey("PUT"));
      }
      expect(seen.size).toBe(2000);
    } finally {
      if (descriptor) {
        Object.defineProperty(globalThis, "crypto", descriptor);
      } else {
        delete (globalThis as Record<string, unknown>).crypto;
      }
    }
  });

  it("generateIdempotencyKey 携带方法名，便于服务端排查 Redis 键归属", () => {
    expect(generateIdempotencyKey("DELETE").startsWith("idem-DELETE-")).toBe(true);
  });
});

describe("后端 @Idempotent 文档与实现一致（P1-1 docs fix）", () => {
  const source = readFileSync(
    resolve(
      __dirname,
      "../../../../api/src/main/java/com/campuslove/api/common/Idempotent.java"
    ),
    "utf-8"
  );

  it("类注释的默认 TTL 与 DEFAULT_TTL_SECONDS 一致（4 小时，非 24 小时）", () => {
    expect(source).toContain("DEFAULT_TTL_SECONDS = 4L * 3600");
    expect(source).toContain("TTL：默认 4 小时");
    expect(source).not.toMatch(/24\s*小时/);
  });
});
