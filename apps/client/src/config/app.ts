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

/** 本地存储键名统一管理 */
export const STORAGE_KEYS = {
  /** 是否已看过解锁引导 */
  UNLOCK_GUIDE_SHOWN: 'unlock_guide_shown',
  /** 用户 Token */
  AUTH_TOKEN: 'campus_love_auth_token',
  /** 用户信息缓存 */
  USER_CACHE: 'campus_love_user_cache',
} as const;
