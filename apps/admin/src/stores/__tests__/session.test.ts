import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

/**
 * 管理员会话 Store 单元测试
 *
 * 覆盖角色判断逻辑：
 * - 生产环境（非 DEV）：role === "ADMIN" 才允许登录
 * - 小写 'admin' / 'user' 应被拒绝（修复后统一为大写）
 * - role === "USER" 应被拒绝（非管理员）
 *
 * 注意：admin 应用目前未配置 vitest，此测试为前置工件，
 * 添加 vitest 依赖后可通过 `vitest run` 执行。
 */

// mock import.meta.env：模拟生产环境（DEV=false）以测试真实登录路径
vi.mock("import.meta.env", () => ({
  DEV: false,
  VITE_API_BASE_URL: "http://127.0.0.1:8080/api",
}));

// mock fetch：模拟后端 /auth/admin/login 响应
const mockFetch = vi.fn();
(globalThis as any).fetch = mockFetch;

// mock localStorage
const storageData: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: vi.fn((key: string) => storageData[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    storageData[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete storageData[key];
  }),
  clear: vi.fn(() => {
    Object.keys(storageData).forEach((k) => delete storageData[k]);
  }),
};

import { useSessionStore } from "../session";

describe("session store - 角色判断逻辑", () => {
  beforeEach(() => {
    // 重置 pinia 和 mock 状态
    setActivePinia(createPinia());
    Object.keys(storageData).forEach((k) => delete storageData[k]);
    vi.clearAllMocks();
  });

  it("生产环境：role='ADMIN' 且 token 有效 → 登录成功", async () => {
    // Arrange：后端返回大写 ADMIN 角色
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: "valid-jwt-token",
        user: { id: 1, username: "admin", displayName: "系统管理员", role: "ADMIN" },
      }),
    });

    // Act
    const store = useSessionStore();
    const result = await store.login({ username: "admin", password: "Admin@2026" });

    // Assert
    expect(result).toBe(true);
    expect(store.user?.role).toBe("ADMIN");
    expect(store.token).toBe("valid-jwt-token");
  });

  it("生产环境：role='admin'（小写）→ 登录失败（修复后应拒绝小写角色）", async () => {
    // Arrange：后端返回小写 admin 角色（数据未迁移的异常场景）
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: "valid-jwt-token",
        user: { id: 1, username: "admin", displayName: "系统管理员", role: "admin" },
      }),
    });

    // Act & Assert：小写 'admin' 不匹配大写 'ADMIN'，应抛出错误
    const store = useSessionStore();
    await expect(
      store.login({ username: "admin", password: "Admin@2026" })
    ).rejects.toThrow("非管理员账号，禁止登录");
  });

  it("生产环境：role='USER' → 登录失败（非管理员禁止登录）", async () => {
    // Arrange：普通用户角色
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: "valid-jwt-token",
        user: { id: 2, username: "normal", displayName: "普通用户", role: "USER" },
      }),
    });

    // Act & Assert
    const store = useSessionStore();
    await expect(
      store.login({ username: "normal", password: "password" })
    ).rejects.toThrow("非管理员账号，禁止登录");
  });

  it("生产环境：role='user'（小写）→ 登录失败", async () => {
    // Arrange
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: "valid-jwt-token",
        user: { id: 2, username: "normal", displayName: "普通用户", role: "user" },
      }),
    });

    // Act & Assert
    const store = useSessionStore();
    await expect(
      store.login({ username: "normal", password: "password" })
    ).rejects.toThrow("非管理员账号，禁止登录");
  });

  it("生产环境：缺少 token → 登录失败", async () => {
    // Arrange：后端返回 user 但无 token
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { id: 1, username: "admin", displayName: "系统管理员", role: "ADMIN" },
      }),
    });

    // Act & Assert
    const store = useSessionStore();
    await expect(
      store.login({ username: "admin", password: "Admin@2026" })
    ).rejects.toThrow("非管理员账号，禁止登录");
  });

  it("生产环境：缺少 user 对象 → 登录失败", async () => {
    // Arrange：后端返回 token 但无 user
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: "valid-jwt-token",
      }),
    });

    // Act & Assert
    const store = useSessionStore();
    await expect(
      store.login({ username: "admin", password: "Admin@2026" })
    ).rejects.toThrow("非管理员账号，禁止登录");
  });

  it("生产环境：后端返回 401 → 登录失败并抛出服务端错误信息", async () => {
    // Arrange：后端返回 401 未授权
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "用户名或密码错误" }),
    });

    // Act & Assert
    const store = useSessionStore();
    await expect(
      store.login({ username: "admin", password: "wrong-password" })
    ).rejects.toThrow("用户名或密码错误");
  });
});
