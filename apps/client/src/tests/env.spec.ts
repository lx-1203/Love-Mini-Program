import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
// 修复（R4-00148/R4-00205）：环境配置统一入口已收敛至 config/env.ts
import { clientEnv, isDev, resolveApiModeNotice } from "../config/env";

/**
 * 环境配置单元测试
 *
 * 验证点：
 * - clientEnv 必须包含合法的 apiMode 与 apiBaseUrl
 * - isDev 为布尔值
 * - 这些值在 Vite/vitest 环境下由 .env / .env.[mode] 注入
 */
describe("config/env", () => {
  it("应提供合法的 API 模式", () => {
    expect(["real", "mock"]).toContain(clientEnv.apiMode);
  });

  it("应提供非空的 API 基础地址", () => {
    expect(typeof clientEnv.apiBaseUrl).toBe("string");
    expect(clientEnv.apiBaseUrl.trim().length).toBeGreaterThan(0);
  });

  it("isDev 应为布尔值", () => {
    expect(typeof isDev).toBe("boolean");
  });
});

/**
 * 契约轨 P2-4（2026-10-31）：`resolveApiMode()` 里那条「未配置 VITE_API_MODE」的
 * console.warn 原来位于 `if (isDev) return "mock"` 之后 —— 分支互斥，永不执行。
 * 于是 localhost 上跑的 H5 预览会静默使用 mock fixtures，看起来像真后端联调。
 *
 * 这组用例把「选了哪个模式 + 由哪个变量控制」变成可达且可断言的输出。
 */
describe("config/env resolveApiModeNotice（VITE_API_MODE 缺配提示可达性）", () => {
  it("显式配置 real / mock 时不提示、原样采用", () => {
    expect(resolveApiModeNotice(true, "real")).toEqual({ mode: "real", notice: null });
    expect(resolveApiModeNotice(false, "real")).toEqual({ mode: "real", notice: null });
    expect(resolveApiModeNotice(true, "mock")).toEqual({ mode: "mock", notice: null });
    expect(resolveApiModeNotice(false, "mock")).toEqual({ mode: "mock", notice: null });
  });

  it("dev 且未配置 ⇒ 仍默认 mock（合法默认值不变），但必须给出点名变量与模式的提示", () => {
    for (const unset of [undefined, "", "   "]) {
      const result = resolveApiModeNotice(true, unset);
      expect(result.mode).toBe("mock");
      // 缺陷本体就是这个 notice 恒为 null；一旦有人把早退改回无声 return，本行变红
      expect(result.notice, `未配置（${JSON.stringify(unset)}）时必须提示`).not.toBeNull();
      const notice = String(result.notice);
      expect(notice).toContain("VITE_API_MODE"); // 点名可控变量
      expect(notice).toContain("mock");          // 点名本次选择的模式
      expect(notice).toContain("real");          // 点名如何切到真后端
    }
  });

  it("dev 且配置成非法值 ⇒ 说明解析成了什么，而不是静默回落", () => {
    const result = resolveApiModeNotice(true, "REAL");
    expect(result.mode).toBe("mock");
    expect(String(result.notice)).toContain("不是合法取值");
    expect(String(result.notice)).toContain("REAL");
  });

  it("生产构建未配置 ⇒ 默认 real 且不在发布包打印诊断日志（R4-00526/00527）", () => {
    expect(resolveApiModeNotice(false, undefined)).toEqual({ mode: "real", notice: null });
    // 生产里配了非法值：回退 real，并给出提示（提示只在 dev 打印由 resolveApiMode 决定，
    // 这里断言的是内核判定，避免"非法值被当成 mock"的静默降级）
    const invalid = resolveApiModeNotice(false, "mockk");
    expect(invalid.mode).toBe("real");
    expect(String(invalid.notice)).toContain("不是合法取值");
  });

  it("clientEnv.apiMode 必须由同一内核解析得出（防止出现第二条无声路径）", () => {
    expect(["real", "mock"]).toContain(clientEnv.apiMode);
    // vitest 运行在 dev 且未设 VITE_API_MODE 时，clientEnv 必然落在 mock ——
    // 这正是「本地预览其实没连后端」的现场，必须由上面的提示暴露出来。
    if (isDev) {
      expect(clientEnv.apiMode).toBe("mock");
    }
  });
});

/**
 * 微信小程序构建环境变量回归测试
 *
 * 验证点：
 * - .env.mp-weixin 必须存在，因为 uni-app 在 `uni build --platform mp-weixin`
 *   时使用的 mode 为 `mp-weixin`，不会自动加载 .env.production
 * - 该文件必须显式声明 VITE_API_MODE=real（infra #33 有意修改：小程序发布构建
 *   默认走真实后端；mock 仅用于本地 H5 开发调试），并显式声明
 *   VITE_API_BASE_URL 为合法 HTTPS 地址
 */
describe("mp-weixin environment file", () => {
  const envPath = resolve(__dirname, "../../.env.mp-weixin");

  it("应存在 .env.mp-weixin 文件", () => {
    expect(() => readFileSync(envPath, "utf-8")).not.toThrow();
  });

  it("应显式配置 VITE_API_MODE=real（发布构建默认真实后端）", () => {
    const content = readFileSync(envPath, "utf-8");
    expect(content).toMatch(/^VITE_API_MODE=real$/m);
  });

  it("应配置合法的 VITE_API_BASE_URL", () => {
    const content = readFileSync(envPath, "utf-8");
    const baseUrl = content.match(/^VITE_API_BASE_URL=(.+)$/m)?.[1];

    expect(typeof baseUrl).toBe("string");
    expect(baseUrl!.trim().length).toBeGreaterThan(0);
    expect(baseUrl).toMatch(/^https?:\/\//);
  });
});
