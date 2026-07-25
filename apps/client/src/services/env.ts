/**
 * 应用环境配置
 *
 * 修复（P0 BUG）：原 safeReadEnv 通过 (import.meta as any).env 中间变量
 * 整体读取再下标访问，在 uni-app vite-plugin-uni 的 H5 dev 模式下
 * 可能无法读取到 VITE_ 前缀变量（Vite 静态替换仅对直接成员访问生效），
 * 导致 apiMode 恒为 "real"、isDev 恒为 false，bootstrap 调用真实 API 失败。
 *
 * 进一步修复（mp-weixin 兼容性）：
 * - 彻底移除客户端代码中的 import.meta 语法，避免 mp-weixin 生产包运行时异常。
 * - vite.config.ts 已通过 Vite define 将 .env 中的 VITE_API_MODE / VITE_API_BASE_URL /
 *   VITE_APP_VERSION 注入为 process.env.XXX 字面量，构建产物中即为字符串常量，
 *   客户端不再依赖 import.meta。
 *
 * 兼容性：H5 与 mp-weixin 双端均能正确解析 VITE_API_MODE 与 isDev。
 */

/** 是否为 H5 环境（mp-weixin 无 window 对象） */
const isH5: boolean = typeof window !== "undefined";

/**
 * 读取 Vite 环境变量（直接访问 process.env.XXX）。
 *
 * 注意：
 * 1. vite.config.ts 在构建阶段通过 `define` 将 process.env.VITE_* 替换为 .env 文件中的字面量，
 *    因此运行时访问的是字符串常量，无需 import.meta。
 * 2. 保留 try/catch 包裹，防止极端情况下（如 SSR 或旧构建工具）process 未定义导致脚本异常。
 * 3. 参数 key 必须为静态字面量，以确保 Vite define 能正确替换对应变量。
 *
 * @param key Vite 环境变量名（必须为 VITE_ 前缀的静态字面量）
 */
function readViteEnv(
  key: "VITE_API_MODE" | "VITE_API_BASE_URL" | "VITE_APP_VERSION"
): string | undefined {
  try {
    let val: unknown;
    // 显式 switch 访问具体字段，与 vite.config.ts 中的 define 键一一对应
    switch (key) {
      case "VITE_API_MODE":
        val = process.env.VITE_API_MODE;
        break;
      case "VITE_API_BASE_URL":
        val = process.env.VITE_API_BASE_URL;
        break;
      case "VITE_APP_VERSION":
        val = process.env.VITE_APP_VERSION;
        break;
    }
    if (typeof val === "string" && val.length > 0) return val;
  } catch (_e) {
    // process 未定义或读取异常时静默降级
  }
  return undefined;
}

/**
 * 是否为开发环境（多信号检测，避免依赖 import.meta.env.DEV）。
 *
 * 检测信号（任一命中即为 dev）：
 * 1. H5 端 location.hostname 为 localhost / 127.0.0.1 / 0.0.0.0
 * 2. process.env.NODE_ENV === "development"（uni-app 编译时注入）
 *
 * 不使用 import.meta.env.DEV：mp-weixin 环境下访问会导致运行时错误。
 */
function resolveIsDev(): boolean {
  // 信号 1：H5 localhost 主机名
  if (isH5) {
    try {
      const host = window.location?.hostname;
      if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") {
        return true;
      }
    } catch (_e) {
      // ignore
    }
  }
  // 信号 2：process.env.NODE_ENV
  try {
    // 通过类型守卫安全访问 globalThis.process，避免在浏览器环境运行时异常
    const proc = (
      typeof globalThis !== "undefined" &&
      typeof (globalThis as { process?: unknown }).process === "object"
        ? (globalThis as { process?: { env?: Record<string, string> } }).process
        : undefined
    );
    if (proc && proc.env && proc.env.NODE_ENV === "development") {
      return true;
    }
  } catch (_e) {
    // ignore
  }
  return false;
}

/**
 * 是否为开发环境。
 *
 * 通过多信号检测（H5 主机名 / NODE_ENV）综合判定，
 * 不依赖 `import.meta.env.DEV`，确保 mp-weixin 环境下也能正常工作。
 */
export const isDev: boolean = resolveIsDev();

/** Vite 环境变量（H5 与 mp-weixin 均可读取） */
const VITE_API_MODE = readViteEnv("VITE_API_MODE");
const VITE_API_BASE_URL = readViteEnv("VITE_API_BASE_URL");

/**
 * 解析 API 基础 URL。
 *
 * 优先使用 VITE_API_BASE_URL 环境变量；未配置时：
 * - 开发环境回退到 `http://127.0.0.1:8080/api`
 * - 生产环境记录错误日志后回退到同一地址（仅用于调试，不应在生产使用）
 *
 * @returns API 基础 URL 字符串
 */
function resolveApiBaseUrl(): string {
  if (VITE_API_BASE_URL && VITE_API_BASE_URL.trim().length > 0) {
    return VITE_API_BASE_URL.trim();
  }
  // 开发环境允许使用 localhost 回退
  if (isDev) {
    return "http://127.0.0.1:8080/api";
  }
  // 生产环境必须显式配置
  console.error(
    "[ENV] 生产环境未配置 VITE_API_BASE_URL，请检查构建配置。" +
    "当前回退到 localhost 仅用于调试，不应在生产使用。"
  );
  return "http://127.0.0.1:8080/api";
}

/**
 * 解析 API 调用模式。
 *
 * 优先使用 VITE_API_MODE 环境变量（"real" / "mock"）；未配置时：
 * - 开发环境默认 mock，便于无后端联调
 * - 生产环境默认 real（更安全，避免误用 mock 数据）
 *
 * @returns "real" 表示调用真实后端 API；"mock" 表示使用本地 Mock 数据
 */
function resolveApiMode(): "real" | "mock" {
  if (VITE_API_MODE === "real" || VITE_API_MODE === "mock") {
    return VITE_API_MODE;
  }
  // 开发环境默认 mock
  if (isDev) {
    return "mock";
  }
  // 生产环境默认 real（更安全）
  console.warn(
    "[ENV] 生产环境未配置 VITE_API_MODE，默认使用 real 模式。" +
    "如需 mock 模式请显式设置 VITE_API_MODE=mock"
  );
  return "real";
}

/**
 * 应用环境配置（运行时只读常量）。
 *
 * - `apiBaseUrl`：API 基础 URL，由 `resolveApiBaseUrl()` 解析
 * - `apiMode`：API 调用模式，由 `resolveApiMode()` 解析
 *
 * 全局共享同一实例，避免重复解析与环境变量抖动。
 */
export const appEnv = {
  apiBaseUrl: resolveApiBaseUrl(),
  apiMode: resolveApiMode(),
} as const;

// 诊断日志（H5 与 mp-weixin 均输出，便于排查 env 解析问题）
try {
  console.log("[ENV] 诊断:", {
    isDev,
    apiMode: appEnv.apiMode,
    apiBaseUrl: appEnv.apiBaseUrl,
    VITE_API_MODE,
    VITE_API_BASE_URL,
  });
} catch (_e) {
  // 控制台不可用时不应影响业务流程
}
