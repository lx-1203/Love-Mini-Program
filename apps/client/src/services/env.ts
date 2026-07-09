/**
 * 应用环境配置
 *
 * 修复（P0 BUG）：原 safeReadEnv 通过 (import.meta as any).env 中间变量
 * 整体读取再下标访问，在 uni-app vite-plugin-uni 的 H5 dev 模式下
 * 可能无法读取到 VITE_ 前缀变量（Vite 静态替换仅对直接成员访问生效），
 * 导致 apiMode 恒为 "real"、isDev 恒为 false，bootstrap 调用真实 API 失败。
 *
 * 现改为：
 * - 直接读取 import.meta.env 的具体命名属性（Vite 静态替换为字面量）
 * - isDev 多信号检测（H5 localhost 主机名 + process.env.NODE_ENV），
 *   避免使用 import.meta.env.DEV（mp-weixin 不支持，per project_memory）
 * - mp-weixin 端通过 process.env 读取 VITE_ 变量（uni-app 编译时注入）
 *
 * 兼容性：H5 与 mp-weixin 双端均能正确解析 VITE_API_MODE 与 isDev。
 */

/** 是否为 H5 环境（mp-weixin 无 window 对象） */
const isH5: boolean = typeof window !== "undefined";

/**
 * 读取 Vite 环境变量（按 key 直接访问 import.meta.env 具体属性）。
 *
 * 注意：必须通过 `import.meta.env.SPECIFIC_KEY` 形式直接访问，
 * Vite 才能在编译时静态替换为字面量；通过中间变量下标访问
 * （如 `import.meta.env[key]`）不会被替换，dev 模式下虽能运行，
 * 但在 uni-app 的某些构建场景下会读取失败。
 *
 * @param key Vite 环境变量名（必须为 VITE_ 前缀的静态字面量）
 */
function readViteEnv(
  key: "VITE_API_MODE" | "VITE_API_BASE_URL" | "VITE_APP_VERSION"
): string | undefined {
  // H5 端：Vite 注入 import.meta.env，直接访问具体属性可被静态替换
  if (isH5) {
    try {
      let val: unknown;
      // 显式 switch 让 Vite 静态替换 import.meta.env.XXX 为字面量
      switch (key) {
        case "VITE_API_MODE":
          val = (import.meta as any).env.VITE_API_MODE;
          break;
        case "VITE_API_BASE_URL":
          val = (import.meta as any).env.VITE_API_BASE_URL;
          break;
        case "VITE_APP_VERSION":
          val = (import.meta as any).env.VITE_APP_VERSION;
          break;
      }
      if (typeof val === "string" && val.length > 0) return val;
    } catch (_e) {
      // ignore
    }
  }
  // mp-weixin 端：通过 process.env 读取（uni-app vite-plugin-uni 编译时注入）
  try {
    const proc = (globalThis as any).process;
    if (proc && proc.env) {
      const val = proc.env[key];
      if (typeof val === "string" && val.length > 0) return val;
    }
  } catch (_e) {
    // ignore
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
      const host = (window as any).location?.hostname;
      if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") {
        return true;
      }
    } catch (_e) {
      // ignore
    }
  }
  // 信号 2：process.env.NODE_ENV
  try {
    const proc = (globalThis as any).process;
    if (proc && proc.env && proc.env.NODE_ENV === "development") {
      return true;
    }
  } catch (_e) {
    // ignore
  }
  return false;
}

/** 是否为开发环境 */
export const isDev: boolean = resolveIsDev();

/** Vite 环境变量（H5 与 mp-weixin 均可读取） */
const VITE_API_MODE = readViteEnv("VITE_API_MODE");
const VITE_API_BASE_URL = readViteEnv("VITE_API_BASE_URL");

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

export const appEnv = {
  apiBaseUrl: resolveApiBaseUrl(),
  apiMode: resolveApiMode(),
} as const;

// 诊断日志（仅 H5，便于排查 env 解析问题）
if (isH5) {
  console.log("[ENV] 诊断:", {
    isDev,
    apiMode: appEnv.apiMode,
    apiBaseUrl: appEnv.apiBaseUrl,
    VITE_API_MODE,
    VITE_API_BASE_URL,
  });
}
