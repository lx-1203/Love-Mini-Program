import { createSSRApp, type App as VueApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import gsapPlugin from "./plugins/gsap";
import { initSentry, captureException } from "./services/sentry";
import i18n from "./i18n";

/**
 * 全局错误上报函数（统一错误出口）。
 *
 * 修复（P0 BUG）：原实现各处错误仅通过散落的 console.error 输出，
 * 缺少统一上报通道，难以后续接入监控平台或聚合排查。
 * 现提供单一入口 reportGlobalError，供 main.ts 全局错误处理器
 * （app.config.errorHandler / uni.onError / uni.onUnhandledRejection）
 * 和 App.vue 启动 try-catch 共同使用，确保所有未处理错误都通过同一通道输出。
 *
 * 监控平台对接：
 * - 内部调用 captureException（services/sentry.ts），自动适配 H5 / mp-weixin：
 *   - H5 环境：上报到 Sentry（若已配置 VITE_SENTRY_DSN）；
 *   - mp-weixin 环境：console.error + 上报到后端 /api/error-reports 接口；
 * - 同时保留 console.error 本地输出，便于开发期调试。
 *
 * @param source - 错误来源标识（如 "Vue Error"、"App.onLaunch"、"uni.onError"）
 * @param err - 错误对象或原始值
 * @param context - 可选的上下文信息（如 Vue info 字符串、生命周期阶段）
 */
export function reportGlobalError(source: string, err: unknown, context?: unknown): void {
  // 1. 本地控制台输出（H5 与 mp-weixin 均保留，便于开发期调试）
  if (context !== undefined) {
    console.error(`[Global Error][${source}]`, err, context);
  } else {
    console.error(`[Global Error][${source}]`, err);
  }

  // 2. 上报到监控平台：captureException 内部根据平台分发（Sentry / 后端接口）
  //    将 source 与 context 合并为 extra 上下文，便于在 Sentry 后台按来源筛选
  const extra: Record<string, unknown> = { source };
  if (context !== undefined) {
    extra.context = context;
  }
  try {
    captureException(err, extra);
  } catch (_e) {
    // captureException 内部已做容错，此处兜底防止极端情况影响主流程
  }
}

/** 全局错误监听器是否已注册（避免重复注册） */
let globalErrorListenersRegistered = false;

/**
 * 注册小程序全局错误监听器（uni.onError + uni.onUnhandledRejection）。
 *
 * 修复（P0 BUG）：原实现仅在 App.vue 的 onLaunch 中通过 try-catch 捕获启动错误，
 * 缺少对小程序运行时全局错误和未处理 Promise 的统一监听。
 * 现在在 createApp 阶段集中注册，确保所有未捕获的小程序错误和 Promise rejection
 * 都通过 reportGlobalError 上报，与 Vue 错误处理器形成完整的错误监控网。
 *
 * 使用标志位避免重复注册（uni.onError 每次调用都会追加监听器，
 * 在 HMR 或多次 createApp 调用场景下可能重复）。
 */
function registerGlobalErrorListeners(): void {
  if (globalErrorListenersRegistered) return;
  globalErrorListenersRegistered = true;

  // 捕获小程序运行时错误（脚本错误、API 调用错误等）
  if (typeof uni !== "undefined" && typeof uni.onError === "function") {
    try {
      uni.onError((error: string | Error) => {
        reportGlobalError("uni.onError", error);
      });
    } catch (_e) {
      // 注册失败时静默忽略（部分环境可能不支持）
    }
  }

  // 捕获未处理的 Promise rejection
  if (typeof uni !== "undefined" && typeof uni.onUnhandledRejection === "function") {
    try {
      uni.onUnhandledRejection((res: { reason: unknown; promise: Promise<unknown> }) => {
        reportGlobalError("uni.onUnhandledRejection", res.reason);
      });
    } catch (_e) {
      // 注册失败时静默忽略
    }
  }
}

// 微信小程序兼容层：仅在 mp-weixin 环境下动态加载，避免 H5 端 import 报错
async function loadAndPatchWxCompat(): Promise<void> {
  // #ifdef MP-WEIXIN
  try {
    const mod = await import("./compat");
    if (typeof mod.patchDeprecatedApi === "function") {
      mod.patchDeprecatedApi();
    }
  } catch (_e) {
    console.warn("[compat] patchDeprecatedApi failed:", _e);
  }
  // #endif
}

/**
 * 初始化应用监控与国际化。
 *
 * 顺序说明：
 * 1. 先 app.use(i18n)：确保 $t / useI18n 在所有组件中可用；
 * 2. 再 initSentry(app)：Sentry 需要绑定到已挂载插件的 app 实例，
 *    内部会通过 app.config.errorHandler 接管错误钩子（仅在 H5 端实际生效）。
 *
 * @param app Vue 应用实例
 */
function initMonitoringAndI18n(app: VueApp): void {
  // 注册 vue-i18n：提供 $t 全局方法与 useI18n() 组合式 API
  app.use(i18n);

  // 初始化 Sentry 监控（仅 H5 端实际生效；mp-weixin 跳过，使用 reportGlobalError 通道）
  initSentry(app);
}

export function createApp() {
  const app = createSSRApp(App);
  const pinia = createPinia();

  app.use(pinia);
  app.use(gsapPlugin);

  // 注册 i18n 与 Sentry 监控（在 mount 之前完成，确保错误钩子与 $t 可用）
  initMonitoringAndI18n(app);

  // 全局错误处理：捕获 Vue 组件内部未处理的错误
  // 修复：统一通过 reportGlobalError 上报，与小程序运行时错误、未处理 Promise 共享同一出口
  app.config.errorHandler = (err, _instance, info) => {
    reportGlobalError("Vue Error", err, info);
  };

  // 全局警告处理：捕获 Vue 运行时警告（仅开发环境）
  app.config.warnHandler = (msg, _instance, trace) => {
    console.warn("[Vue Warn]", msg, trace);
  };

  // 修复（P0 BUG）：注册小程序全局错误监听器（uni.onError + uni.onUnhandledRejection），
  // 与 app.config.errorHandler 形成完整的错误监控网，覆盖 Vue 之外的运行时错误
  registerGlobalErrorListeners();

  // 在 Vue 应用创建完成后再 patch 微信弃用 API，
  // 避免在 createSSRApp 之前修改 wx 全局对象导致组件作用域初始化异常
  loadAndPatchWxCompat();

  return {
    app,
    pinia,
  };
}
