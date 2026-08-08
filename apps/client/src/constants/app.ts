/**
 * 应用全局常量
 *
 * 集中维护应用级别常量：应用名称、版本、调试标签、登录跳转延迟等。
 * 与 config/app.ts 中的 APP_CONFIG 互补——本文件面向业务模块提供更细粒度的常量。
 *
 * 注意：
 * - 不引入新依赖，仅使用 TypeScript 原生语法
 * - 所有常量使用 `as const` 收窄字面量类型，便于联合类型推断
 * - 注释完整（中文注释），便于团队成员理解维护
 * - SubTask 3.5.2：STORAGE_KEYS 已迁移至 constants/storage-keys.ts，本文件 re-export 保持向后兼容
 */

// STORAGE_KEYS 已迁移至 storage-keys.ts，此处 re-export 保持向后兼容
export { STORAGE_KEYS } from "./storage-keys";

// R4-00207：版本号单源化——APP_INFO.VERSION 引用 config/app.ts 的 APP_CONFIG.APP_VERSION
// （构建环境变量 VITE_APP_VERSION 注入），不再各自维护导致漂移
import { APP_CONFIG } from "../config/app";

/**
 * 应用基本信息。
 *
 * 与 config/app.ts 的 APP_CONFIG 保持一致，作为业务模块的稳定引用入口。
 * 版本号以 config/app.ts（构建注入）为单一来源，勿在此处另写版本字面量。
 */
export const APP_INFO = {
  /** 应用名称 */
  NAME: APP_CONFIG.APP_NAME,
  /** 应用版本号（R4-00207：单一来源 = config/app.ts APP_CONFIG.APP_VERSION） */
  VERSION: APP_CONFIG.APP_VERSION,
  /** 调试日志前缀标签 */
  DEBUG_TAG: APP_CONFIG.DEBUG_TAG,
};

/** 跳转登录页的 Toast 显示时长（毫秒） */
export const LOGIN_TOAST_DURATION_MS = 2000;

/** 跳转登录页的延迟（毫秒）：先展示 Toast 再 reLaunch */
export const LOGIN_REDIRECT_DELAY_MS = 500;
