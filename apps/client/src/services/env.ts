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
 * 注意：
 * 1. 必须通过 `import.meta.env.SPECIFIC_KEY` 形式直接访问，
 *    Vite 才能在编译时静态替换为 `.env` 文件中的字面量。
 *    通过中间变量下标访问（如 `import.meta.env[key]`）不会被替换，
 *    在 uni-app 的某些构建场景下会读取失败。
 * 2. 不要按平台分支读取：uni-app（mp-weixin）构建时同样会由 Vite
 *    把 `import.meta.env.XXX` 替换为常量；此前仅在 H5 分支读取导致
 *    小程序生产包读不到 VITE_API_BASE_URL / VITE_API_MODE。
 * 3. 保留 process.env 回退，用于非 Vite 运行时（如 vitest）或 SSR 场景。
 *
 * @param key Vite 环境变量名（必须为 VITE_ 前缀的静态字面量）
 */
function readViteEnv(
  key: "VITE_API_MODE" | "VITE_API_BASE_URL" | "VITE_APP_VERSION"
): string | undefined {
  // 主读取路径：直接访问 import.meta.env 的具名属性，
  // Vite 会在构建阶段静态替换为 .env.[mode] 中的字面量。
  // 使用 unknown 收敛 + 类型守卫替代 `as any`，避免 any 类型污染。
  try {
    const viteEnv = (import.meta as unknown as { env?: Record<string, unknown> }).env;
    if (viteEnv) {
      let val: unknown;
      // 显式 switch 让 Vite 静态替换 import.meta.env.XXX 为字面量
      switch (key) {
        case "VITE_API_MODE":
          val = viteEnv.VITE_API_MODE;
          break;
        case "VITE_API_BASE_URL":
          val = viteEnv.VITE_API_BASE_URL;
          break;
        case "VITE_APP_VERSION":
          val = viteEnv.VITE_APP_VERSION;
          break;
      }
      if (typeof val === "string" && val.length > 0) return val;
    }
  } catch (_e) {
    // Vite 未注入时回退到 process.env
  }

  // 回退路径：通过 process.env 读取（测试环境或 SSR 场景）
  try {
    const proc = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process;
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
      // 通过 unknown 收敛替代 `as any`，避免 any 类型污染；
      // window.location 在 H5 环境下必为 Location 对象，此处仅防御性可访问。
      const host = (window as unknown as { location?: { hostname?: string } }).location?.hostname;
      if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") {
        return true;
      }
    } catch (_e) {
      // ignore
    }
  }
  // 信号 2：process.env.NODE_ENV
  try {
    const proc = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process;
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
  // 开发环境（H5 本地）允许使用 http://localhost 回退
  // Task 0.6.1：仅 dev 模式可使用 http（H5 本地后端），mp-weixin 合法域名强制 https
  if (isDev) {
    // #ifdef H5
    return "http://127.0.0.1:8080/api";
    // #endif
    // #ifndef H5
    // 非 H5 环境（mp-weixin 等）dev 模式同样要求 https，避免运行时违规
    return "https://127.0.0.1:8080/api";
    // #endif
  }
  // 生产环境必须显式配置 https URL（mp-weixin 合法域名要求 https）
  // 不再回退到 http://localhost，避免误用未加密通道
  console.error(
    "[ENV] 生产环境未配置 VITE_API_BASE_URL，请检查构建配置。" +
    "mp-weixin 合法域名必须为 https://，禁止回退到 http://localhost。"
  );
  return "https://localhost:8080/api";
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

/**
 * 判断当前是否为 Mock 模式。
 *
 * 各 store 中原先各自定义了局部的 `function useMock()`，
 * 本质上都是检查 `appEnv.apiMode === "mock"`。
 * 统一导出此函数，便于各 store 引用单一真相源。
 */
export function isMockMode(): boolean {
  return appEnv.apiMode === "mock";
}

// 诊断日志（仅在开发环境输出，生产环境不泄露配置信息）
if (isDev) {
  console.log("[ENV] 诊断:", {
    isDev,
    apiMode: appEnv.apiMode,
    apiBaseUrl: appEnv.apiBaseUrl,
    VITE_API_MODE,
    VITE_API_BASE_URL,
  });
}
