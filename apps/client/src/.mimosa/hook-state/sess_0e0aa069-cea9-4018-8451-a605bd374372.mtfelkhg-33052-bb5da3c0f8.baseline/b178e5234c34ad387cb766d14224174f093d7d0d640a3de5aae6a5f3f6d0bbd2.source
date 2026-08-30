/**
 * 客户端环境变量统一访问入口（构建/打包类修复 P3）。
 *
 * 设计目标：
 * 1. 集中封装所有 VITE_ 前缀环境变量的读取逻辑，避免在业务代码中散落 import.meta.env.XXX
 * 2. 提供类型安全的访问接口（明确的 TypeScript 类型声明）
 * 3. 兼容 H5 / mp-weixin 双端：H5 通过 import.meta.env 读取，mp-weixin 通过 process.env 读取
 * 4. 提供合理的默认值与降级策略，避免未配置时崩溃
 *
 * 与 src/services/env.ts 的关系：
 * - src/services/env.ts 是历史实现，保留以兼容现有调用方
 * - src/config/env.ts 是新增的统一入口，新代码应优先使用本文件
 * - 后续可逐步将业务代码迁移至本文件，最终删除 src/services/env.ts
 *
 * 使用示例：
 *   import { clientEnv, isMockMode, isDev } from "@/config/env";
 *   const apiBase = clientEnv.apiBaseUrl;
 *   if (isMockMode()) { /* mock 路径 *\/ }
 */

// Task 35：从 compat/index.ts 引入平台降级函数，避免 env.ts 中散落 #ifdef 条件编译
import { getDevApiBaseUrl } from "../compat";

/** 客户端环境变量键名集合（与 vite.config.ts 的 define 列表保持一致） */
export type ClientEnvKey =
  | "VITE_API_MODE"
  | "VITE_API_BASE_URL"
  | "VITE_APP_VERSION"
  | "VITE_SENTRY_DSN"
  // R4-00244：媒体 URL 是否拼接 token 查询参数（后端改签名 URL 后可关闭）
  | "VITE_MEDIA_TOKEN_QUERY";

/** API 模式枚举 */
export type ApiMode = "real" | "mock";

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
 * 2. mp-weixin 端通过 process.env 读取（vite.config.ts 的 define 已注入）。
 * 3. 保留 process.env 回退，用于非 Vite 运行时（如 vitest）或 SSR 场景。
 *
 * @param key Vite 环境变量名（必须为 VITE_ 前缀的静态字面量）
 */
function readViteEnv(key: ClientEnvKey): string | undefined {
  // 主读取路径：直接访问 import.meta.env 的具名属性，
  // Vite 会在构建阶段静态替换为 .env.[mode] 中的字面量。
  // 使用 unknown 收敛替代 `as any`，避免 any 类型污染。
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
        case "VITE_SENTRY_DSN":
          val = viteEnv.VITE_SENTRY_DSN;
          break;
        case "VITE_MEDIA_TOKEN_QUERY":
          val = viteEnv.VITE_MEDIA_TOKEN_QUERY;
          break;
      }
      if (typeof val === "string" && val.length > 0) return val;
    }
  } catch (_e) {
    // Vite 未注入时回退到 process.env
  }

  // 回退路径：通过 process.env 读取（mp-weixin / 测试环境 / SSR 场景）
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

/** 应用版本号（构建时注入，默认 v0.1.0） */
export const APP_VERSION: string = readViteEnv("VITE_APP_VERSION") ?? "v0.1.0";

/** Sentry DSN（错误监控，未配置时为空字符串，调用方应判断是否非空） */
export const SENTRY_DSN: string = readViteEnv("VITE_SENTRY_DSN") ?? "";

/**
 * 媒体 URL 是否拼接 token 查询参数（R4-00244，默认 true）。
 *
 * 鉴权代理端点（/api/v1/media/...）在 `<image src>` 无法携带 HTTP Header 时
 * 依赖 `?token=xxx` 查询参数鉴权——JWT 会暴露在 Referer / 代理日志 / 网络面板，
 * 属已知权宜方案。后端改签短期签名 URL 后，将环境变量 VITE_MEDIA_TOKEN_QUERY
 * 设为 false 即可关闭拼接（utils/media.ts 消费本配置）。
 */
export const MEDIA_TOKEN_QUERY: boolean = resolveMediaTokenQuery();

function resolveMediaTokenQuery(): boolean {
  const raw = readViteEnv("VITE_MEDIA_TOKEN_QUERY");
  if (raw === undefined) {
    return true;
  }
  return raw === "true" || raw === "1";
}

/** Vite 环境变量（H5 与 mp-weixin 均可读取） */
const VITE_API_MODE = readViteEnv("VITE_API_MODE");
const VITE_API_BASE_URL = readViteEnv("VITE_API_BASE_URL");

function resolveApiBaseUrl(): string {
  if (VITE_API_BASE_URL && VITE_API_BASE_URL.trim().length > 0) {
    return VITE_API_BASE_URL.trim();
  }
  // 开发环境（H5 本地）允许使用 http://localhost 回退
  // Task 0.6.1：仅 dev 模式可使用 http（H5 本地后端），mp-weixin 合法域名强制 https
  // Task 35：平台降级逻辑统一收敛到 compat/index.ts 的 getDevApiBaseUrl()
  if (isDev) {
    return getDevApiBaseUrl();
  }
  // 生产环境必须显式配置 https URL（mp-weixin 合法域名要求 https）
  // 修复（R4-00149）：原实现注释承诺「不再回退到 http://localhost」，代码却仍
  // console.error 后静默回退到 https://localhost:8080/api 假地址，注释与实现矛盾，
  // 生产包会带着错误地址启动、所有请求 404/超时且难以排查。
  // 现与 services/env.ts 行为对齐：直接抛错阻止应用启动，让构建/发布时立刻暴露
  // 配置缺失；dev 回退（getDevApiBaseUrl）保留。
  throw new Error(
    "[ENV] 生产环境未配置 VITE_API_BASE_URL，应用拒绝启动。请通过 .env.production 配置 https 接口地址（mp-weixin 合法域名必须为 https://），禁止回退到 localhost。"
  );
}

function resolveApiMode(): ApiMode {
  if (VITE_API_MODE === "real" || VITE_API_MODE === "mock") {
    return VITE_API_MODE;
  }
  // 开发环境默认 mock
  if (isDev) {
    return "mock";
  }
  // 生产环境默认 real（更安全）
  // 配置缺失诊断日志仅在开发环境输出（R4-00526/00527）
  if (isDev) {
    console.warn(
      "[ENV] 生产环境未配置 VITE_API_MODE，默认使用 real 模式。" +
        "如需 mock 模式请显式设置 VITE_API_MODE=mock"
    );
  }
  return "real";
}

/**
 * 客户端环境配置快照（应用启动时一次性解析，避免重复读取）。
 * 调用方应直接消费此对象的字段，而非反复调用 readViteEnv。
 */
export const clientEnv = {
  /** API 基础地址 */
  apiBaseUrl: resolveApiBaseUrl(),
  /** API 模式（real / mock） */
  apiMode: resolveApiMode(),
  /** 应用版本号 */
  appVersion: APP_VERSION,
  /** Sentry DSN（空字符串表示未配置） */
  sentryDsn: SENTRY_DSN,
  /** 是否为开发环境 */
  isDev,
  /** 媒体 URL 是否拼接 token 查询参数（R4-00244） */
  mediaTokenQuery: MEDIA_TOKEN_QUERY,
} as const;

/**
 * 判断当前是否为 Mock 模式。
 *
 * 各 store 中原先各自定义了局部的 `function useMock()`，
 * 本质上都是检查 `clientEnv.apiMode === "mock"`。
 * 统一导出此函数，便于各 store 引用单一真相源。
 */
export function isMockMode(): boolean {
  return clientEnv.apiMode === "mock";
}

/**
 * 判断当前是否为 Real 模式（接入真实后端 API）。
 * 与 isMockMode 互补，便于业务代码语义化判断。
 */
export function isRealMode(): boolean {
  return clientEnv.apiMode === "real";
}

/**
 * 判断 Sentry 错误监控是否已启用（DSN 非空即视为启用）。
 * 调用方应在初始化 Sentry 前先调用此函数，避免空 DSN 触发 Sentry 警告。
 */
export function isSentryEnabled(): boolean {
  return SENTRY_DSN.length > 0;
}

// 诊断日志（仅在开发环境输出，生产环境不泄露配置信息）
if (isDev) {
  // 修复 no-console：诊断日志改用 console.warn（允许的方法），保留开发期排查能力
  console.warn("[ENV] 诊断:", {
    isDev,
    apiMode: clientEnv.apiMode,
    apiBaseUrl: clientEnv.apiBaseUrl,
    appVersion: clientEnv.appVersion,
    sentryEnabled: isSentryEnabled(),
  });
}
