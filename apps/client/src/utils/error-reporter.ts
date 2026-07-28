/**
 * 全局错误上报函数（统一错误出口）。
 *
 * 修复（P0 BUG）：原实现各处错误仅通过散落的 console.error 输出，
 * 缺少统一上报通道，难以后续接入监控平台或聚合排查。
 * 现提供单一入口 reportGlobalError，供 main.ts 全局错误处理器
 * （app.config.errorHandler / uni.onError / uni.onUnhandledRejection）
 * 和 App.vue 启动 try-catch 共同使用，确保所有未处理错误都通过同一通道输出。
 *
 * 架构设计（P0 BUG 修复）：此函数独立于 main.ts 存放，避免 main.ts ↔ App.vue
 * 循环依赖导致 App 在 TDZ 中初始化为 undefined，造成 H5 白屏。
 * 依赖链变为：
 *   main.ts → App.vue → utils/error-reporter.ts → services/sentry.ts → services/env.ts
 * 各模块均无反向引用，打破原循环。
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
import { captureException } from "../services/sentry";

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
