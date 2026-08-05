import { createSSRApp, type App as VueApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import gsapPlugin from "./plugins/gsap";
import { initSentry } from "./services/sentry";
import i18n from "./i18n";
// Phase R1：AbortController polyfill（mp-weixin 基础库无原生实现）
// 注意：只 import 函数，不调用 patchDeprecatedApi（wx 相关逻辑仍走 MP-WEIXIN 条件分支）
import { installAbortControllerPolyfill } from "./compat";
import { reportGlobalError } from "./utils/global-error";

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
  // Phase R1：注入全局 AbortController polyfill（mp-weixin 基础库无原生实现），
  // 必须在任何 store / service 首次实例化（new AbortController）之前执行。
  // 该模块可在任意平台安全 import（内部幂等：已有原生实现则跳过）。
  // 注：compat 模块顶层仅导出函数，无副作用，不触发 wx 访问。
  installAbortControllerPolyfill();

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
