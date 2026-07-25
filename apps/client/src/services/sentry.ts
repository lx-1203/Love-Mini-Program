/**
 * Sentry 监控服务封装。
 *
 * 设计目标：
 * 1. 在 H5 环境下通过 @sentry/vue SDK 上报异常与性能数据；
 * 2. 在 mp-weixin 环境下不加载 Sentry SDK（小程序不支持浏览器 API），
 *    自动降级为 console.error + 上报到后端 /api/error-reports 接口；
 * 3. 对外暴露统一的 captureException(error, context?) 工具函数，
 *    上层无需关心当前运行平台，由本模块内部根据平台分发。
 *
 * 平台检测说明：
 * - H5 环境存在全局 window 对象，mp-weixin 不存在；
 * - 与 services/env.ts 中的 isH5 检测方式保持一致，避免引入额外依赖。
 *
 * 条件编译说明：
 * - @sentry/vue 仅在 H5 端 import，使用 uni-app 的 H5 条件编译注释包裹；
 * - vite-plugin-uni 在构建 mp-weixin 产物时会剥离该注释块中的代码，
 *   避免小程序运行时因访问 window/document 等 API 而报错；
 * - TypeScript 类型检查阶段（vue-tsc）会忽略条件编译注释，正常解析 @sentry/vue 类型。
 */
import type { App } from "vue";
import { appEnv } from "./env";

/* ============================================================
 * 平台与状态标识
 * ============================================================ */

/** 是否为 H5 环境（mp-weixin 无 window 对象） */
const isH5: boolean = typeof window !== "undefined";

/** Sentry 是否已成功初始化（仅 H5 端可能为 true） */
let sentryInitialized = false;

/* ============================================================
 * 环境变量读取
 * ============================================================ */

/**
 * 读取 Vite 注入的 VITE_SENTRY_DSN 环境变量。
 *
 * 与 services/env.ts 中的 readViteEnv 保持一致的读取方式：
 * - vite.config.ts 在构建阶段通过 define 将 process.env.VITE_SENTRY_DSN
 *   替换为 .env 文件中的字面量；
 * - 运行时访问的是字符串常量，无 import.meta 依赖，兼容 mp-weixin。
 *
 * @returns 配置的 Sentry DSN 字符串；未配置时返回空字符串
 */
function readSentryDsn(): string {
  try {
    const val = (process as { env?: Record<string, string | undefined> }).env?.VITE_SENTRY_DSN;
    if (typeof val === "string" && val.trim().length > 0) {
      return val.trim();
    }
  } catch (_e) {
    // process 未定义或读取异常时静默降级
  }
  return "";
}

/* ============================================================
 * Sentry SDK 初始化（仅 H5）
 * ============================================================ */

// #ifdef H5
import * as Sentry from "@sentry/vue";
// #endif

/**
 * 初始化 Sentry 监控。
 *
 * 行为说明：
 * - 仅在 H5 环境下执行实际初始化逻辑（mp-weixin 直接返回，使用自有 reportGlobalError）；
 * - DSN 未配置时跳过初始化，避免无效上报；
 * - tracesSampleRate 设为 0.2，对 20% 的事务采样性能数据；
 * - 集成 browserTracingIntegration，自动收集路由切换、HTTP 请求等性能数据。
 *
 * @param app Vue 应用实例（@sentry/vue 需要绑定到具体 app 以注入错误钩子）
 */
export function initSentry(app: App): void {
  // mp-weixin 环境直接跳过，使用自有 reportGlobalError 通道
  if (!isH5) {
    return;
  }

  const dsn = readSentryDsn();
  if (!dsn) {
    // 未配置 DSN 时不初始化，避免控制台噪声
    console.warn("[Sentry] VITE_SENTRY_DSN 未配置，跳过 Sentry 初始化。");
    return;
  }

  // #ifdef H5
  try {
    Sentry.init({
      app,
      dsn,
      // 性能采样率：20% 的事务会上报性能数据，平衡可观测性与配额成本
      tracesSampleRate: 0.2,
      // 启用浏览器追踪集成：自动采集路由切换、HTTP 请求、点击等性能数据
      integrations: [Sentry.browserTracingIntegration()],
    });
    sentryInitialized = true;
    console.log("[Sentry] 初始化成功。");
  } catch (error) {
    // Sentry 初始化失败不应影响应用启动，仅记录日志
    console.error("[Sentry] 初始化失败：", error);
    sentryInitialized = false;
  }
  // #endif
}

/* ============================================================
 * 异常上报（统一出口）
 * ============================================================ */

/**
 * 上报异常到监控平台。
 *
 * 平台分发逻辑：
 * - H5 环境 + Sentry 已初始化：调用 Sentry.captureException 上报；
 * - 其他情况（mp-weixin 或 Sentry 未初始化）：降级为 console.error +
 *   上报到后端 /api/error-reports 接口。
 *
 * @param error   错误对象或原始值
 * @param context 可选的上下文信息（如来源标识、用户操作阶段等）
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>
): void {
  // #ifdef H5
  if (sentryInitialized) {
    try {
      // context 作为 extra 字段附带上报，便于在 Sentry 后台查看上下文
      Sentry.captureException(error, context ? { extra: context } : undefined);
      return;
    } catch (_e) {
      // Sentry 上报失败时降级到后端上报通道，避免错误丢失
    }
  }
  // #endif

  // mp-weixin 或 Sentry 未初始化时的降级通道：console.error + 后端上报
  if (context !== undefined) {
    console.error("[captureException]", error, context);
  } else {
    console.error("[captureException]", error);
  }

  // 异步上报到后端，不阻塞调用方；失败时静默处理避免循环上报
  void reportErrorToBackend(error, context);
}

/* ============================================================
 * 后端错误上报（mp-weixin 降级方案）
 * ============================================================ */

/**
 * 将错误信息上报到后端 /api/error-reports 接口。
 *
 * 使用场景：
 * - mp-weixin 环境无法使用 Sentry SDK，通过自有接口聚合错误数据；
 * - H5 端 Sentry 初始化失败时作为兜底通道。
 *
 * 实现说明：
 * - 直接使用 uni.request，不经过 services/http.ts 的拦截器链，
 *   避免 401 刷新流程触发跳转登录或循环上报；
 * - 失败时静默 resolve，不抛出异常影响调用方；
 * - payload 包含错误消息、堆栈、上下文、时间戳与平台标识。
 *
 * @param error   错误对象或原始值
 * @param context 可选的上下文信息
 */
async function reportErrorToBackend(
  error: unknown,
  context?: Record<string, unknown>
): Promise<void> {
  try {
    // 规范化错误信息：Error 实例提取 message + stack，其他类型转为字符串
    const payload = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack ?? undefined : undefined,
      name: error instanceof Error ? error.name : undefined,
      context: context ?? {},
      timestamp: new Date().toISOString(),
      platform: isH5 ? "h5" : "mp-weixin",
    };

    // 使用 Promise 包装 uni.request，统一 success/fail 为 resolve
    await new Promise<void>((resolve) => {
      uni.request({
        url: `${appEnv.apiBaseUrl}/error-reports`,
        method: "POST",
        data: payload,
        // 短超时避免错误上报阻塞过久（错误上报不应影响主流程）
        timeout: 5000,
        success: () => resolve(),
        fail: () => resolve(), // 静默失败，不影响调用方
      });
    });
  } catch (_e) {
    // 上报过程中任何异常都静默处理，避免形成"上报失败 -> 触发新错误 -> 再次上报"的循环
  }
}
