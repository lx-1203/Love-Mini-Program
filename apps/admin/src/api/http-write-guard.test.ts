import { beforeEach, describe, expect, it, vi } from "vitest";
import { del, get, post, put, ApiError } from "./http";

/**
 * 只读角色（AUDITOR）在 HTTP 层的本地拦截。
 *
 * 后台有 20 多个写页面，逐个藏按钮迟早漏一个；本测试守住的是「无论视图有没有接
 * v-if="canWrite"，只读角色都发不出写请求」这条下限，正向对照是同一份码下
 * ADMIN 与「无本地会话」两种情况必须照常发出请求——否则这条门等于全拦。
 */

/** 最小 localStorage 替身（vitest 默认 node 环境没有 window/localStorage）。 */
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

const okResponse = {
  ok: true,
  status: 200,
  json: async () => ({ ok: 1 }),
  text: async () => '{"ok":1}',
} as unknown as Response;

function lastFetchHeaders(): Headers {
  const calls = vi.mocked(fetch).mock.calls;
  const call = calls[calls.length - 1];
  return new Headers((call?.[1] as RequestInit | undefined)?.headers);
}

describe("admin http 只读角色写拦截", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    vi.stubGlobal("fetch", vi.fn(async () => okResponse));
  });

  it("AUDITOR 会话下的写请求不发往网络，且给出可解释的只读错误", async () => {
    installStorage({ admin_v2_user: JSON.stringify({ id: 9, username: "aud", role: "AUDITOR" }) });

    for (const write of [
      () => post("/v1/admin/whispers/1/reply", { text: "hi" }),
      () => put("/v1/admin/configs/site", { a: 1 }),
      () => del("/v1/admin/sensitive-words/3"),
    ]) {
      await expect(write()).rejects.toThrow(/只读/);
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("拦截抛出的是 ApiError(403)，视图既有的 catch 分支能直接展示", async () => {
    installStorage({ admin_v2_user: JSON.stringify({ role: "auditor" }) });
    const err = await post("/v1/admin/activities/1/publish").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(403);
  });

  it("ADMIN / SUPER_ADMIN 照常发出写请求并带 Idempotency-Key", async () => {
    for (const role of ["ADMIN", "SUPER_ADMIN"]) {
      installStorage({ admin_v2_user: JSON.stringify({ role }) });
      await expect(post("/v1/admin/activities/1/publish")).resolves.toBeTruthy();
    }
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(lastFetchHeaders().get("Idempotency-Key")).toMatch(/\S/);
  });

  it("AUDITOR 的读请求不受影响", async () => {
    installStorage({ admin_v2_user: JSON.stringify({ role: "AUDITOR" }) });
    await expect(get("/v1/admin/users?page=0")).resolves.toBeTruthy();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("本地无会话记录时写请求照常发出（登录/登出不能被误伤）", async () => {
    installStorage();
    await expect(post("/v1/auth/admin/login", { username: "u", password: "p" })).resolves.toBeTruthy();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("会话记录损坏按只读处理（fail-closed），而非放行", async () => {
    installStorage({ admin_v2_user: "{not-json" });
    await expect(put("/v1/admin/schools/1", { name: "x" })).rejects.toThrow(/只读/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("未知角色一律只读，含空串与未预期角色名", async () => {
    for (const role of ["", "AUDIT", "GUEST", "support"]) {
      installStorage({ admin_v2_user: JSON.stringify({ role }) });
      await expect(post("/v1/admin/reports/1/handle", {})).rejects.toThrow(/只读/);
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("角色大小写与前后空白不影响判定", async () => {
    installStorage({ admin_v2_user: JSON.stringify({ role: " super_admin " }) });
    await expect(del("/v1/admin/menus/1")).resolves.toBeTruthy();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
