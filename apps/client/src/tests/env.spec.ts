import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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

/**
 * 微信小程序构建环境变量回归测试
 *
 * 验证点：
 * - .env.mp-weixin 必须存在，因为 uni-app 在 `uni build --platform mp-weixin`
 *   时使用的 mode 为 `mp-weixin`，不会自动加载 .env.production
 * - 该文件必须显式声明 VITE_API_MODE=mock，保证微信小程序构建产物默认走 mock 模式，
 *   避免真实后端不可达导致卡片数据加载失败
 */
describe("mp-weixin environment file", () => {
  const envPath = resolve(__dirname, "../../.env.mp-weixin");

  it("应存在 .env.mp-weixin 文件", () => {
    expect(() => readFileSync(envPath, "utf-8")).not.toThrow();
  });

  it("应显式配置 VITE_API_MODE=mock", () => {
    const content = readFileSync(envPath, "utf-8");
    expect(content).toMatch(/^VITE_API_MODE=mock$/m);
  });

  it("应配置合法的 VITE_API_BASE_URL", () => {
    const content = readFileSync(envPath, "utf-8");
    const baseUrl = content.match(/^VITE_API_BASE_URL=(.+)$/m)?.[1];

    expect(typeof baseUrl).toBe("string");
    expect(baseUrl!.trim().length).toBeGreaterThan(0);
    expect(baseUrl).toMatch(/^https?:\/\//);
  });
});
