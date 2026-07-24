import { describe, expect, it } from "vitest";
import { appEnv, isDev } from "../services/env";

/**
 * 环境配置单元测试
 *
 * 验证点：
 * - appEnv 必须包含合法的 apiMode 与 apiBaseUrl
 * - isDev 为布尔值
 * - 这些值在 Vite/vitest 环境下由 .env / .env.[mode] 注入
 */
describe("services/env", () => {
  it("应提供合法的 API 模式", () => {
    expect(["real", "mock"]).toContain(appEnv.apiMode);
  });

  it("应提供非空的 API 基础地址", () => {
    expect(typeof appEnv.apiBaseUrl).toBe("string");
    expect(appEnv.apiBaseUrl.trim().length).toBeGreaterThan(0);
  });

  it("isDev 应为布尔值", () => {
    expect(typeof isDev).toBe("boolean");
  });
});
