/**
 * 应用全局常量配置
 * 集中管理应用名称、版本号、存储键名等
 */

/**
 * 解析应用版本号（R4-00207：版本单源化）。
 *
 * 单一版本来源：构建环境变量 VITE_APP_VERSION（.env VITE_APP_VERSION=v0.1.0），
 * 与 manifest.json versionName（0.1.0）保持一致；未注入时回退到与 manifest 对齐的
 * 默认值，避免 config/app.ts、constants/app.ts 各自维护版本号导致漂移。
 *
 * mp-weixin 兼容：Vite 在构建期静态替换 import.meta.env.VITE_APP_VERSION，
 * 运行时兜底仅作防御。
 */
function resolveAppVersion(): string {
  try {
    const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
    const v = viteEnv?.VITE_APP_VERSION;
    if (typeof v === "string" && v.length > 0) return v;
  } catch (_e) {
    // 环境读取异常时使用默认值
  }
  return "v0.1.0";
}

export const APP_CONFIG = {
  /**
   * 应用名称（静态常量，i18n-data-review #15：不随 locale 切换）。
   * 展示场景（导航栏标题、登录页 Logo、分享卡片等）请使用 t("config.app.appName")，
   * 本常量仅供无法访问 i18n 的极少数场景（如 storage key 前缀）作静态引用。
   */
  APP_NAME: '校园恋爱',
  /**
   * 版本号（R4-00207：由构建环境变量 VITE_APP_VERSION 注入，见 resolveAppVersion）。
   * 修改版本请改 .env / manifest.json，勿在此处硬编码。
   */
  APP_VERSION: resolveAppVersion(),
  /** 调试模式标签 */
  DEBUG_TAG: '[CampusLove]',
};

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
