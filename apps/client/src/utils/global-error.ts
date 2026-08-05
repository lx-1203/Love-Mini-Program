/**
 * 全局错误统一上报入口。
 *
 * 拆分为独立模块（替代原 main.ts 内定义）以消除 App.vue ↔ main.ts 循环依赖：
 * main.ts import App.vue（根组件），App.vue 若反向 import main.ts 的导出，
 * 在 ES module（H5/vite）下会触发 "Cannot access 'App' before initialization"。
 * mp-weixin 因 uni-app 编译方式不同未暴露该问题，但 H5 平台必须切断循环。
 */
import { captureException } from "../services/sentry";

/**
 * 全局错误上报函数（统一错误出口）。
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
