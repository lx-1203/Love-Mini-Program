/**
 * 应用全局常量配置
 * 集中管理应用名称、版本号、存储键名等
 */
export const APP_CONFIG = {
  /** 应用名称 */
  APP_NAME: '校园恋爱',
  /** 版本号 */
  APP_VERSION: '1.0.0',
  /** 调试模式标签 */
  DEBUG_TAG: '[CampusLove]',
} as const;

/** 本地存储键名统一管理 */
export const STORAGE_KEYS = {
  /** 是否已看过社交引导 */
  SOCIAL_ONBOARDING_SEEN: 'campus_love_social_onboarding_seen',
  /** 是否已看过解锁引导 */
  UNLOCK_GUIDE_SHOWN: 'unlock_guide_shown',
  /** 用户 Token */
  AUTH_TOKEN: 'campus_love_auth_token',
  /** 用户信息缓存 */
  USER_CACHE: 'campus_love_user_cache',
} as const;
