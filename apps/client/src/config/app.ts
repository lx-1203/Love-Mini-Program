/**
 * 应用全局常量配置
 * 集中管理应用名称、版本号、存储键名等
 */
export const APP_CONFIG = {
  /**
   * 应用名称（静态常量，i18n-data-review #15：不随 locale 切换）。
   * 展示场景（导航栏标题、登录页 Logo、分享卡片等）请使用 t("config.app.appName")，
   * 本常量仅供无法访问 i18n 的极少数场景（如 storage key 前缀）作静态引用。
   */
  APP_NAME: '校园恋爱',
  /** 版本号 */
  APP_VERSION: '1.0.0',
  /** 调试模式标签 */
  DEBUG_TAG: '[CampusLove]',
} as const;

/**
 * 本地存储键名统一管理。
 *
 * 修复（R4-00206）：原本文件内的 STORAGE_KEYS 与
 * constants/storage-keys.ts 并存且值不一致（AUTH_TOKEN 曾为
 * 'campus_love_auth_token'，而实际读写使用 'token'），且全量无引用，
 * 属死配置陷阱——未来误引用将读写错误的 token key 导致登录态失效。
 * 已删除，统一使用 constants/storage-keys.ts 的 STORAGE_KEYS：
 *   import { STORAGE_KEYS } from "@/constants/storage-keys";
 */
