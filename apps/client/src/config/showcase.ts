/**
 * 超级管理员展示模式（Showcase Mode）
 *
 * 用于「全功能展示版」：以演示者身份看到并使用所有功能。
 * - 仅当构建时注入 VITE_SHOWCASE_MODE=true 才激活（独立包，与正式版严格隔离）
 * - 激活后：功能开关全开（含 VIP/视频通话）、守卫旁路、展示入口可见
 * - 正式构建无该变量 → 完全不包含展示逻辑
 *
 * 实现要点：
 * - 读取 VITE_SHOWCASE_MODE 遵循 src/config/env.ts 的 Vite 静态替换约定
 *   （直接访问 import.meta.env 具名属性，经 switch 静态替换）
 * - applyShowcaseMode() 在 main.ts createApp() mount 前调用，全局只执行一次
 * - 静态 import featureFlags（feature-flags 不反向依赖本模块，无循环依赖）
 */

import { featureFlags } from "./feature-flags";
import { isDev } from "./env";

/**
 * 读取 Vite 环境变量（静态替换专用）。
 * 与 src/config/env.ts 的 readViteEnv 同构，但仅暴露展示模式所需键。
 *
 * 关键：必须直接访问 `import.meta.env.VITE_SHOWCASE_MODE` 具名属性，
 * Vite 才会在编译时静态替换为 `.env.[mode]` 中的字面量（"true" / "false"）。
 * 通过中间变量（如 `import.meta.env[key]` 或先取 `.env` 再下标访问）不会被替换，
 * 在 mp-weixin 运行时会读取失败。process.env 仅作测试/SSR 回退。
 */
function readShowcaseFlag(): boolean {
  // 主读取路径：直接访问 import.meta.env 具名属性，Vite 构建时静态替换为字面量
  try {
    const env = import.meta.env;
    if (env) {
      // Vite 静态替换：此处会被替换为 "true" / "false" / undefined
      const val = env.VITE_SHOWCASE_MODE;
      if (typeof val === "string" && val.length > 0) {
        return val === "true" || val === "1";
      }
    }
  } catch (_e) {
    // Vite 未注入时回退到 process.env
  }

  // 回退路径：通过 process.env 读取（mp-weixin / 测试环境 / SSR）
  try {
    const proc = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process;
    if (proc && proc.env) {
      const val = proc.env.VITE_SHOWCASE_MODE;
      if (typeof val === "string" && val.length > 0) {
        return val === "true" || val === "1";
      }
    }
  } catch (_e) {
    // ignore
  }

  return false;
}

/** 是否为展示模式（构建期常量，正式包恒为 false） */
export const isShowcaseMode: boolean = readShowcaseFlag();

/**
 * 应用展示模式：将功能开关全部置 true，使所有功能（含 VIP/视频通话等）
 * 在展示版中可见可用。仅展示构建调用，正式包不包含。
 */
export function applyShowcaseMode(): void {
  if (!isShowcaseMode) return;

  featureFlags.membershipEnabled = true;
  featureFlags.heartSignalEnabled = true;
  featureFlags.villageSameCityEnabled = true;

  // 仅开发环境输出诊断日志，生产环境不泄露
  if (isDev) {
    console.warn("[Showcase] 展示模式已启用：全部功能开关置 true");
  }
}
