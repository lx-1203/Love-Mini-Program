/**
 * 统一本地存储键名常量 (SubTask 3.5.2)
 *
 * 集中管理所有 uni.setStorageSync / uni.getStorageSync 调用使用的 key，
 * 避免在业务代码中散落硬编码字符串导致：
 *   1. 命名冲突或拼写错误
 *   2. key 变更时需全局搜索替换
 *   3. 难以审计哪些数据被持久化
 *
 * 命名约定：
 *   - 全部大写 + 下划线分隔（SCREAMING_SNAKE_CASE）
 *   - 按「业务模块.用途」分组（如 AUTH_TOKEN / CHAT_MESSAGE_STATUS）
 *   - value 使用 "campus_love_<scope>_<purpose>" 形式，确保跨应用唯一
 *
 * 与 constants/app.ts 中 STORAGE_KEYS 的关系：
 *   - 本文件作为统一入口，未来 constants/app.ts 的 STORAGE_KEYS 将由此文件 re-export
 *   - 业务代码应优先 import { STORAGE_KEYS } from "@/constants"
 *
 * 使用示例：
 *   import { STORAGE_KEYS } from "@/constants";
 *   uni.setStorageSync(STORAGE_KEYS.AUTH_TOKEN, token);
 */

/**
 * 全局本地存储键名集合。
 *
 * 注意：修改 value 需要做数据迁移（旧版本写入的数据无法自动迁移到新 key）。
 */
export const STORAGE_KEYS = {
  /* ========== 鉴权与用户会话 ========== */
  /** 用户 Token（JWT，兼容 http.ts 中 TOKEN_STORAGE_KEY） */
  AUTH_TOKEN: "token",
  /** 刷新 Token（用于 JWT 续期） */
  REFRESH_TOKEN: "refresh_token",
  /** 用户信息缓存（避免每次启动重新拉取） */
  USER_CACHE: "campus_love_user_cache",

  /* ========== 引导与首次访问 ========== */
  /** 是否已看过解锁引导 */
  UNLOCK_GUIDE_SHOWN: "unlock_guide_shown",

  /* ========== 聊天模块 ========== */
  /** 消息投递状态（sending/sent/failed）持久化 */
  CHAT_MESSAGE_STATUS: "chat:message-delivery-status",
  /** 聊天草稿（未发送的输入框内容，按会话 ID 分键） */
  CHAT_DRAFT: "chat:draft",
  /** 本地删除消息 ID 集合（2026-08-09 微信语义：删除为本地持久隐藏） */
  DELETED_MESSAGE_IDS: "chat-session:deleted-message-ids",
  /** A2：自定义 TabBar 消息角标未读数（2026-08-13；custom-tab-bar/index.js 的 syncBadge 读取） */
  TABBAR_CHAT_UNREAD: "tabbar_chat_unread",

  /* ========== 寻觅/匹配模块 ========== */
  /** 滑动历史（已喜欢/跳过的人，用于避免重复推荐） */
  DISCOVER_SWIPE_HISTORY: "discover:swipe-history",
  /** 反悔次数（按日重置，每日上限 3 次） */
  DISCOVER_REWIND_COUNT: "discover:rewind-count",
  /** 上次反悔日期（yyyy-MM-dd，用于判断是否需要重置日计数） */
  DISCOVER_REWIND_DATE: "discover:rewind-date",

  /* ========== 村口社区模块 ========== */
  /** 帖子草稿（未发布的发帖内容，含标题/正文/标签） */
  VILLAGE_POST_DRAFT: "village:post-draft",
  /** R4-00232：圈子页当前频道持久化（config/channels.ts 的 LAST_CHANNEL_KEY） */
  VILLAGE_LAST_CHANNEL: "village_last_channel",

  /* ========== 搜索模块（2026-08-11） ========== */
  /** 本地搜索历史（最近 10 条） */
  SEARCH_HISTORY: "search:history",

  /* ========== 注册流程 ========== */
  /** R4-00233：注册身份选择（config/identity.ts 的 USER_IDENTITY_STORAGE_KEY） */
  USER_IDENTITY: "campus-love:user-identity",

  /* ========== 设置与偏好 ========== */
  /** 主题模式（light / dark / warm；2026-08-10 修正：运行时实际值为 campus-love:theme-mode） */
  THEME_MODE: "campus-love:theme-mode",
  /** 作息表功能开关（2026-08-10 收敛 home/settings 两处重复定义） */
  WEEKLY_SCHEDULE_ENABLED: "campus-love:weekly-schedule-enabled",
  /** 隐私设置（stores/profile.ts 持久化） */
  PRIVACY_SETTINGS: "campus-love:privacy-settings",
  /** 语言偏好（zh-CN / en-US） */
  LOCALE: "locale",
  /** 免打扰设置（开始/结束时间/重复模式） */
  DND_SETTING: "dnd_setting",
  /** SubTask 5.5.1：消息通知开关（boolean），持久化到本地，跨启动恢复 */
  NOTIFY_ENABLED: "notify_enabled",
  /** SubTask 5.5.1：隐私模式开关（boolean），持久化到本地，跨启动恢复 */
  PRIVACY_MODE_ENABLED: "privacy_mode_enabled",

  /* ========== 签到与成长 ========== */
  /** 上次签到日期（yyyy-MM-dd，用于判断今日是否已签到） */
  CHECKIN_LAST_DATE: "checkin:last-date",
  /** 连续签到天数（缓存，避免每次拉取） */
  CHECKIN_CONSECUTIVE_DAYS: "checkin:consecutive-days",

  /* ========== 业务功能开关 ========== */
  /** 是否已展示新人引导（首次进入弹窗） */
  NEWBIE_GUIDE_SHOWN: "newbie_guide_shown",
  /** 是否已展示 AI 视频引导 */
  AI_VIDEO_GUIDE_SHOWN: "ai_video_guide_shown",
  /** dev-vip 模拟开关（仅开发环境生效，stores/vip.ts 与 dev 页共用） */
  VIP_SIM_ENABLED: "campus-love:dev-vip-sim",

  /* ========== 安全与设备 ========== */
  /** 已下线（踢出）设备 ID 集合（pages/security 本地演示持久化） */
  KICKED_DEVICES: "security:kicked-devices",
} as const;

/**
 * Storage key 类型（联合类型，便于在工具函数中约束参数。
 *
 * 使用 keyof typeof 收窄，避免手动维护联合类型导致遗漏。
 */
export type StorageKey = keyof typeof STORAGE_KEYS;

/**
 * 获取 Storage key 对应的实际字符串值（用于 uni.getStorageSync 调用）。
 *
 * 与直接 STORAGE_KEYS.XXX 相比，此函数提供了类型安全检查，
 * 拼写错误会在编译时报错而非运行时返回 undefined。
 *
 * @param key - STORAGE_KEYS 的 key 名（如 "AUTH_TOKEN"）
 * @returns 实际存储键名字符串（如 "token"）
 */
export function getStorageKeyString(key: StorageKey): string {
  return STORAGE_KEYS[key];
}
