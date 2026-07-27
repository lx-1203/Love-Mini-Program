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
    // 通过 globalThis 收敛访问 process，避免引入 @types/node；
    // mp-weixin 运行时无 process 对象，运行时判空安全降级。
    const g = globalThis as { process?: { env?: Record<string, string | undefined> } };
    const val = g.process?.env?.VITE_SENTRY_DSN;
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
 * Tag 提取规则：
 * - context.source：错误来源标识（如 "Vue Error"、"http"、"login.wechat"），
 *   会被提升为 Sentry tag，便于在后台按来源筛选；
 * - context.http_url / context.http_status：HTTP 请求相关 tag，
 *   便于按接口 URL 与状态码聚合排查；
 * - 其余字段作为 extra 附带上报，仅用于查看上下文，不参与聚合。
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
      // 从 context 中提取已知字段作为 tag，便于在 Sentry 后台按来源/接口筛选
      const tags: Record<string, string> = {};
      if (context) {
        if (typeof context.source === "string" && context.source.length > 0) {
          tags.source = context.source;
        }
        if (typeof context.http_url === "string" && context.http_url.length > 0) {
          tags.http_url = context.http_url;
        }
        if (typeof context.http_status === "number") {
          tags.http_status = String(context.http_status);
        }
      }

      // 组装 CaptureContext：tags 用于聚合筛选，extra 用于保留完整上下文
      const captureContext: {
        tags?: Record<string, string>;
        extra?: Record<string, unknown>;
      } = {};
      if (Object.keys(tags).length > 0) {
        captureContext.tags = tags;
      }
      if (context && Object.keys(context).length > 0) {
        captureContext.extra = context;
      }

      Sentry.captureException(
        error,
        Object.keys(captureContext).length > 0 ? captureContext : undefined
      );
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
 * 消息上报（captureMessage）
 * ============================================================ */

/**
 * 上报一条文本消息到监控平台。
 *
 * 适用场景：业务关键事件、非异常但需监控的状态（如「登录超时但已重试」）。
 *
 * 平台分发逻辑：
 * - H5 环境 + Sentry 已初始化：调用 Sentry.captureMessage 上报；
 * - 其他情况：降级为 console.info / console.warn / console.error。
 *
 * @param message 文本消息内容
 * @param level   日志级别，默认 "info"；可选 "warning" / "error"
 */
export function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info"
): void {
  // #ifdef H5
  if (sentryInitialized) {
    try {
      // Sentry.captureMessage 第二参数接受 severity 字符串，SDK 内部会规范化
      Sentry.captureMessage(message, level);
      return;
    } catch (_e) {
      // 上报失败静默处理，不影响调用方
    }
  }
  // #endif

  // 降级到 console：根据 level 选择对应 console 方法
  const logger =
    level === "error" ? console.error : level === "warning" ? console.warn : console.info;
  logger("[captureMessage]", message);
}

/* ============================================================
 * 面包屑（Breadcrumb）记录
 * ============================================================ */

/**
 * 添加一条面包屑到 Sentry，便于在异常发生时回溯用户操作路径。
 *
 * 适用场景：
 * - 页面切换（navigation）：记录用户在应用内的跳转路径；
 * - 按钮点击（ui）：记录关键操作触发；
 * - HTTP 请求（http）：由 services/http.ts 自动记录；
 * - 其他业务节点（如 chat_send / payment_click）。
 *
 * 平台分发逻辑：
 * - H5 环境 + Sentry 已初始化：调用 Sentry.addBreadcrumb 上报；
 * - 其他情况：降级为 console.debug，便于开发期查看。
 *
 * @param category 面包屑分类（如 "navigation" / "ui" / "http"）
 * @param message  面包屑文本（如 "page_enter" / "button_click" / "GET /users"）
 * @param data     可选的结构化数据（如 { url, status, id }）
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>
): void {
  // #ifdef H5
  if (sentryInitialized) {
    try {
      Sentry.addBreadcrumb({
        category,
        message,
        // 面包屑级别默认 info，便于在 Sentry 面包屑流中按颜色区分
        level: "info",
        data: data ?? {},
      });
      return;
    } catch (_e) {
      // 静默处理，避免面包屑失败影响业务流程
    }
  }
  // #endif

  // 降级到 console.debug：面包屑是辅助信息，不应使用 error 级别
  if (data !== undefined) {
    console.debug(`[breadcrumb][${category}]`, message, data);
  } else {
    console.debug(`[breadcrumb][${category}]`, message);
  }
}

/* ============================================================
 * 用户身份关联（setUser / clearUser）
 * ============================================================ */

/**
 * 设置当前用户身份到 Sentry，便于在异常发生时关联用户上下文。
 *
 * 适用场景：
 * - 登录成功后调用，将 userId / nickname / role 等信息关联到后续所有上报；
 * - Session 刷新（refreshSession / bootstrap）发现用户已登录时也应调用，
 *   保证 H5 刷新后用户身份不丢失。
 *
 * 平台分发逻辑：
 * - H5 环境 + Sentry 已初始化：调用 Sentry.setUser 上报；
 * - 其他情况：降级为 console.debug，便于开发期排查。
 *
 * @param userId   用户 ID（必填）
 * @param userInfo 可选的用户扩展信息（如 { nickname, role }）
 *                 - nickname 会被映射到 Sentry.User.username；
 *                 - 其他字段（如 role）通过 User 索引签名透传，可在后台按字段筛选。
 */
export function setUser(
  userId: string,
  userInfo?: Record<string, unknown>
): void {
  // #ifdef H5
  if (sentryInitialized) {
    try {
      // 组装 Sentry.User：id 必填，nickname 映射为 username，其余字段透传
      const userPayload: Record<string, unknown> = { id: userId };
      if (userInfo) {
        if (typeof userInfo.nickname === "string") {
          userPayload.username = userInfo.nickname;
        }
        // 其余字段（role 等）通过 User 的 [key: string]: any 索引签名透传
        for (const key of Object.keys(userInfo)) {
          if (key !== "nickname" && !(key in userPayload)) {
            userPayload[key] = userInfo[key];
          }
        }
      }
      Sentry.setUser(userPayload);
      return;
    } catch (_e) {
      // 静默处理，避免 setUser 失败影响业务流程
    }
  }
  // #endif

  // 降级到 console.debug：用户身份变更属于辅助信息
  console.debug("[setUser]", userId, userInfo ?? {});
}

/**
 * 清除当前用户身份。
 *
 * 适用场景：
 * - 退出登录时调用，确保后续上报不再关联已登出的用户；
 * - 用户切换账号场景下，先 clearUser 再 setUser 关联新身份。
 *
 * 平台分发逻辑：
 * - H5 环境 + Sentry 已初始化：调用 Sentry.setUser(null) 清除；
 * - 其他情况：降级为 console.debug。
 */
export function clearUser(): void {
  // #ifdef H5
  if (sentryInitialized) {
    try {
      // Sentry.setUser(null) 会清除当前用户上下文
      Sentry.setUser(null);
      return;
    } catch (_e) {
      // 静默处理
    }
  }
  // #endif

  console.debug("[clearUser]");
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
