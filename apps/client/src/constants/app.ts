/**
 * 应用全局常量
 *
 * 集中维护应用级别常量：应用名称、版本、调试标签、统一存储键名等。
 * 与 config/app.ts 中的 APP_CONFIG 互补——本文件面向业务模块提供更细粒度的常量。
 *
 * 注意：
 * - 不引入新依赖，仅使用 TypeScript 原生语法
 * - 所有常量使用 `as const` 收窄字面量类型，便于联合类型推断
 * - 注释完整（中文注释），便于团队成员理解维护
 */

/**
 * 应用基本信息。
 *
 * 与 config/app.ts 的 APP_CONFIG 字段保持一致，作为业务模块的稳定引用入口。
 * 修改时请同步更新 config/app.ts。
 */
export const APP_INFO = {
  /** 应用名称 */
  NAME: "校园恋爱",
  /** 应用版本号 */
  VERSION: "1.0.0",
  /** 调试日志前缀标签 */
  DEBUG_TAG: "[CampusLove]",
} as const;

/**
 * 全局本地存储键名统一管理。
 *
 * 为避免散落在各模块的硬编码 storage key 字符串导致命名冲突或拼写错误，
 * 统一在此声明所有跨模块复用的存储键。
 *
 * 业务模块专属的存储键（如 chat:message-delivery-status）请在对应业务常量文件中声明。
 */
export const STORAGE_KEYS = {
  /** 是否已看过解锁引导 */
  UNLOCK_GUIDE_SHOWN: "unlock_guide_shown",
  /** 用户 Token（兼容 http.ts 中 TOKEN_STORAGE_KEY） */
  AUTH_TOKEN: "token",
  /** 刷新 Token（兼容 http.ts 中 REFRESH_TOKEN_KEY） */
  REFRESH_TOKEN: "refresh_token",
  /** 用户信息缓存 */
  USER_CACHE: "campus_love_user_cache",
} as const;

/** 跳转登录页的 Toast 显示时长（毫秒） */
export const LOGIN_TOAST_DURATION_MS = 2000;

/** 跳转登录页的延迟（毫秒）：先展示 Toast 再 reLaunch */
export const LOGIN_REDIRECT_DELAY_MS = 500;
