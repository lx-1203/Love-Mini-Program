import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, generateIdempotencyKey, get, post } from "./http";

/**
 * 幂等键语义测试（api/http.ts 写请求补键）。
 *
 * 基线与小程序端同一份修复（apps/client/src/services/http.ts:239-283）：
 * **幂等键标识「一次逻辑调用」，不是「方法 + 路径 + body」**。
 *
 * 后台的受害形态比客户端更隐蔽：disable/enable、publish/unpublish、pin/unpin 这类
 * **无请求体的状态开关**，两次相反操作的签名（method + path + String(body)）逐字相同，
 * 旧实现按签名缓存在 60s 内复用同一把键 ⇒ 「封禁 → 解封 → 再封禁」的第三刀
 * 被后端 IdempotentInterceptor（Redis `idempotent:{key}:{userId}`，命中即 409）
 * 当成重复投递拦掉，或后一次动作没落地而 UI 仍报成功。
 *
 * 测试手法沿用 http-write-guard.test.ts 的桩（stubGlobal fetch + localStorage），
 * 按投递下标脚本化响应，并**在下标处快照当时的 header**（幂等键在多次投递间是
 * 同一个 Headers 对象，不快照就看不出「重发有没有换键」）。
 */

/** 后端 IdempotentInterceptor.MAX_KEY_LENGTH（apps/api/.../common/IdempotentInterceptor.java） */
const BACKEND_MAX_KEY_LENGTH = 128;

/** 每次 fetch 出网时的入参快照（下标即「本次逻辑调用内的第 N 次投递」）。 */
const sent: { url: string; headers: Headers }[] = [];

/** 当前用例的响应脚本：按投递下标决定返回什么 / 抛什么网络错误。 */
let respond: (index: number) => Response | Error = () => okResponse();

const okResponse = (): Response =>
  ({
    ok: true,
    status: 200,
    json: async () => ({ ok: 1 }),
    text: async () => '{"ok":1}',
  }) as unknown as Response;

const errorResponse = (status: number, message: string): Response =>
  ({
    ok: false,
    status,
    json: async () => ({ message }),
    text: async () => JSON.stringify({ message }),
  }) as unknown as Response;

/**
 * 最小 localStorage 替身（vitest 默认 node 环境没有 window/localStorage）。
 * 返回内部 store，便于用例在投递之间改动 token（模拟「另一个页签重新登录」）。
 */
function installStorage(initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial));
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  });
  return store;
}

function keyOf(index: number): string {
  return sent[index]?.headers.get("Idempotency-Key") ?? "";
}

function authOf(index: number): string {
  return sent[index]?.headers.get("Authorization") ?? "";
}

/** 已登录的 ADMIN：既不会被本地只读预检拦下，也带 token 供 401 用例比对。 */
function loginAsAdmin(store: Map<string, string>, token = "jwt-old") {
  store.set("admin_v2_token", token);
  store.set("admin_v2_user", JSON.stringify({ id: 1, username: "ops", role: "ADMIN" }));
}

const DISABLE = "/v1/admin/users/7/disable";
const ENABLE = "/v1/admin/users/7/enable";

describe("admin http 幂等键语义（一键一逻辑调用）", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    sent.length = 0;
    respond = () => okResponse();
    const store = installStorage();
    loginAsAdmin(store);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        // 快照当时的 header：http.ts 多次投递复用同一个 Headers 对象，
        // 不在此处拷贝就观察不到「重发时键是否被换掉」。
        sent.push({ url: String(url), headers: new Headers(init?.headers) });
        const out = respond(sent.length - 1);
        if (out instanceof Error) throw out;
        return out;
      })
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ----------------------------------------------------------------
  // (a) 缺陷本身：同一 ID 上的不同逻辑操作，在旧 60s 签名缓存内共用一把键
  // ----------------------------------------------------------------
  it("(a) 同一路径的两次无体 POST 拿到不同 key（旧签名缓存在 TTL 内复用同一把）", async () => {
    await expect(post(DISABLE)).resolves.toBeTruthy();
    await expect(post(DISABLE)).resolves.toBeTruthy();

    expect(sent).toHaveLength(2);
    expect(keyOf(0)).toBeTruthy();
    expect(keyOf(1)).toBeTruthy();
    // 旧实现：两次都是 `POST /v1/admin/users/7/disable ` 签名 → 同一个 key → 第三次 409
    expect(keyOf(0)).not.toBe(keyOf(1));
    expect(keyOf(0).length).toBeLessThanOrEqual(BACKEND_MAX_KEY_LENGTH);
  });

  it("(a) 封禁 → 解封 → 再封禁（60s TTL 内）第三次不被自己的第一次撞键", async () => {
    // 冻结时钟并推进 30s：旧实现的缓存 TTL 是 60s，这一段时间差正是缺陷的成立条件
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-30T10:00:00Z"));

    await expect(post(DISABLE)).resolves.toBeTruthy();
    await vi.advanceTimersByTimeAsync(30_000);
    await expect(post(ENABLE)).resolves.toBeTruthy();
    await vi.advanceTimersByTimeAsync(10_000);
    await expect(post(DISABLE)).resolves.toBeTruthy();

    expect(sent).toHaveLength(3);
    expect(keyOf(0)).not.toBe(keyOf(2));
    expect(keyOf(1)).not.toBe(keyOf(2));
  });

  it("(a) 同 method + 同 path + 同 body 的两次调用同样是两把键（body 哈希方案已废弃）", async () => {
    const payload = { reason: "同一段处置说明" };
    await expect(post("/v1/admin/reports/3/handle", payload)).resolves.toBeTruthy();
    await expect(post("/v1/admin/reports/3/handle", payload)).resolves.toBeTruthy();

    expect(sent).toHaveLength(2);
    expect(keyOf(0)).not.toBe(keyOf(1));
  });

  // ----------------------------------------------------------------
  // (b) 同一次逻辑调用的原地重试：换投递不换键
  // ----------------------------------------------------------------
  it("(b) 网络层失败后的原地重试复用同一把 key（重试仍是同一次操作）", async () => {
    respond = (index) => (index === 0 ? new Error("Connection reset") : okResponse());

    await expect(post(DISABLE, undefined, undefined, { retry: 1 })).resolves.toBeTruthy();

    expect(sent).toHaveLength(2);
    expect(keyOf(0)).toBeTruthy();
    expect(keyOf(1)).toBe(keyOf(0));
  });

  it("(b) 重试次数用尽前每次投递都是同一把 key，用尽后仍按网络错误抛出", async () => {
    respond = () => new Error("Connection reset");

    const err = await post(DISABLE, undefined, undefined, { retry: 2 }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(0);

    // 一次逻辑调用 = 1 次首发 + 2 次重试 = 3 次投递，三投同键
    expect(sent).toHaveLength(3);
    expect(keyOf(0)).toBe(keyOf(1));
    expect(keyOf(1)).toBe(keyOf(2));

    // 另起一次调用 = 新的逻辑操作，即便签名逐字相同也换一把新键
    await post(DISABLE, undefined, undefined, { retry: 1 }).catch(() => undefined);
    expect(sent).toHaveLength(5);
    expect(keyOf(3)).toBe(keyOf(4));
    expect(keyOf(3)).not.toBe(keyOf(0));
  });

  it("(b) 显式业务键在原地重试后保持不变", async () => {
    respond = (index) => (index === 0 ? new Error("Connection reset") : okResponse());

    await expect(
      post("/v1/admin/orders/9/refund", { amount: 1 }, undefined, {
        idempotencyKey: "REFUND-ORDER-9",
        retry: 1,
      })
    ).resolves.toBeTruthy();

    expect(sent).toHaveLength(2);
    expect(keyOf(0)).toBe("REFUND-ORDER-9");
    expect(keyOf(1)).toBe("REFUND-ORDER-9");
  });

  // ----------------------------------------------------------------
  // (c) 401 换 token 重发：只换 Authorization，幂等键原样继承
  // ----------------------------------------------------------------
  it("(c) 401 后凭据已被别处更新时重发一次，复用同一把 key 且只换 Authorization", async () => {
    // 模拟「另一个页签重新登录」：401 落地时 localStorage 里的 token 已被换成新的
    respond = (index) => {
      if (index === 0) {
        localStorage.setItem("admin_v2_token", "jwt-new");
        return errorResponse(401, "登录已过期");
      }
      return okResponse();
    };

    await expect(post(DISABLE)).resolves.toBeTruthy();

    expect(sent).toHaveLength(2);
    expect(keyOf(1)).toBe(keyOf(0));
    expect(authOf(0)).toBe("Bearer jwt-old");
    expect(authOf(1)).toBe("Bearer jwt-new");
    // 重发成功 ⇒ 没有触发登出
    expect(localStorage.getItem("admin_v2_token")).toBe("jwt-new");
  });

  it("(c) 401 且凭据没变时仍只发一次并登出跳转（不重发、不死循环）", async () => {
    respond = () => errorResponse(401, "登录已过期");

    const err = await post(DISABLE).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(401);

    expect(sent).toHaveLength(1);
    expect(localStorage.getItem("admin_v2_token")).toBeNull();
  });

  // ----------------------------------------------------------------
  // (d) 显式业务键：调用方真持有业务键时按业务语义去重（能力保留，不再是默认）
  // ----------------------------------------------------------------
  it("(d) 显式传入的 Idempotency-Key 原样透传，两次同键不被自动换新", async () => {
    await expect(
      post("/v1/admin/activities/1/publish", undefined, undefined, { idempotencyKey: "PUB-1-A" })
    ).resolves.toBeTruthy();
    await expect(
      post("/v1/admin/activities/1/publish", undefined, undefined, { idempotencyKey: "PUB-1-A" })
    ).resolves.toBeTruthy();
    // 不带显式键的同端点调用则拿到新键
    await expect(post("/v1/admin/activities/1/publish")).resolves.toBeTruthy();

    expect(sent).toHaveLength(3);
    expect(keyOf(0)).toBe("PUB-1-A");
    expect(keyOf(1)).toBe("PUB-1-A");
    expect(keyOf(2)).not.toBe("PUB-1-A");
  });

  it("(d) GET 不附带幂等键（键只服务于写操作）", async () => {
    await expect(get("/v1/admin/users", { page: 0 })).resolves.toBeTruthy();

    expect(sent).toHaveLength(1);
    expect(keyOf(0)).toBe("");
    expect(authOf(0)).toBe("Bearer jwt-old");
  });

  // ----------------------------------------------------------------
  // (e) 键生成器：唯一性 + 长度上限 + 方法前缀
  // ----------------------------------------------------------------
  it("(e) generateIdempotencyKey 同一运行内不产生重复键且满足后端 128 字符上限", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const key = generateIdempotencyKey("POST");
      expect(key.length).toBeGreaterThan(0);
      expect(key.length).toBeLessThanOrEqual(BACKEND_MAX_KEY_LENGTH);
      seen.add(key);
    }
    expect(seen.size).toBe(2000);
  });

  it("(e) 无 WebCrypto 的环境（旧内核/嵌入页）仍不重复", () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");
    Object.defineProperty(globalThis, "crypto", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    try {
      const seen = new Set<string>();
      for (let i = 0; i < 2000; i++) seen.add(generateIdempotencyKey("PUT"));
      expect(seen.size).toBe(2000);
    } finally {
      if (descriptor) Object.defineProperty(globalThis, "crypto", descriptor);
      else delete (globalThis as Record<string, unknown>).crypto;
    }
  });

  it("(e) 键携带方法名，便于服务端按端点排查 Redis 幂等键归属", () => {
    expect(generateIdempotencyKey("DELETE").startsWith("idem-DELETE-")).toBe(true);
  });
});
