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
  REFRESH_TOKEN: ["refresh", "token"].join("_"),
  /** 用户信息缓存（避免每次启动重新拉取） */
  USER_CACHE: "campus_love_user_cache",
  /**
   * Session Store 的持久化字段快照（profileBackgroundUrl 等）。
   *
   * 2026-10-31 收编：原为 stores/session.ts 内的私有常量 SESSION_PERSIST_KEY（裸字符串）。
   * 值保持完全一致（无需数据迁移），登记到本表后自动落入下方
   * USER_SCOPED_STORAGE_KEYS，登出/401 强制下线时会被清除——
   * 否则上一账号上传的背景图 URL 会闪现在下一账号的个人主页。
   */
  SESSION_PERSISTED_FIELDS: "session:persistent-fields",

  /* ========== 引导与首次访问 ========== */
  /** 是否已看过解锁引导 */
  UNLOCK_GUIDE_SHOWN: "unlock_guide_shown",

  /* ========== 聊天模块 ========== */
  /** 消息投递状态（sending/sent/failed）持久化 */
  CHAT_MESSAGE_STATUS: "chat:message-delivery-status",
  /**
   * 聊天草稿（未发送的输入框内容，按会话 ID 分键）。
   *
   * 注意：实际写入方 chat-session/index.vue 用的是「前缀 + 会话 ID」的复合键
   * （见下方 CHAT_DRAFT_SESSION_PREFIX），本裸键当前无写入方，保留作历史兼容；
   * 登出清扫同时按本键与复合前缀处理，两者都覆盖。
   */
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
  /**
   * 今日寻觅记录（已看卡片 ID / 是否已挽回 / 上次刷新时间，JSON 串）。
   *
   * 2026-10-31 收编：写入方为 stores/discover/constants.ts 的 STORAGE_KEY
   * （值一致，无需迁移）。登记到本表的原因是它属账号数据——
   * 不清则下一账号会继承上一账号「今天已经看过谁」。
   */
  DISCOVER_DAILY_RECORD: "discover_daily_record",

  /* ========== 村口社区模块 ========== */
  /** 帖子草稿（未发布的发帖内容，含标题/正文/标签） */
  VILLAGE_POST_DRAFT: "village:post-draft",
  /** MP-R1-PUBLISH-004：统一发布页草稿（publish.vue 专用，带 updatedAt） */
  VILLAGE_PUBLISH_DRAFT: "village:publish-draft",
  /** R4-00232：圈子页当前频道持久化（config/channels.ts 的 LAST_CHANNEL_KEY） */
  VILLAGE_LAST_CHANNEL: "village_last_channel",

  /* ========== 定位模块 ========== */
  /** MP-R1-PUBLISH-006：最近一次定位成功解析的城市（nearby 页写入，publish 页读取展示） */
  NEARBY_CITY: "nearby:city",

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

  /* ========== 官方助手 ========== */
  /**
   * 官方助手待消费通知列表（活动报名成功等，utils/assistant-notify.ts 写入）。
   *
   * 2026-10-31 收编：值与 assistant-notify.ts 的 ASSISTANT_ACTIVITY_NOTIFY_KEY 一致。
   * 属账号数据——不清则下一账号会读到上一账号的「报名成功」待消费消息。
   */
  ASSISTANT_ACTIVITY_NOTIFY: "campus-love:assistant-activity-notify",
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

/* ========== 用户级 / 设备级分区（2026-10-31 P1：登出必须清空账号数据） ========== */

/**
 * 设备级存储键（**跨账号保留**）——唯一豁免清单。
 *
 * 判定标准：值描述的是「这台设备的使用偏好/一次性提示」，与具体账号无关，
 * 换账号后保留才是正确体验（主题、语言、免打扰时段、已看过的新手引导…）。
 *
 * ⚠️ 默认相反：凡是不在此清单里的 STORAGE_KEYS 条目，一律视为**用户级**、
 * 登出时被清除（见 USER_SCOPED_STORAGE_KEYS）。也就是说，往 STORAGE_KEYS
 * 里新增一个 key 的人不需要「记得」去某个地方登记——没登记进豁免清单
 * 就等于会被清掉，漏清的方向天然是安全的那一侧。
 */
export const DEVICE_SCOPED_STORAGE_KEYS = [
  /* 引导与首次访问（一次性提示，不含内容） */
  STORAGE_KEYS.UNLOCK_GUIDE_SHOWN,
  STORAGE_KEYS.NEWBIE_GUIDE_SHOWN,
  STORAGE_KEYS.AI_VIDEO_GUIDE_SHOWN,
  /* 视图偏好（上一账号看了哪个频道/开关，属设备使用习惯） */
  STORAGE_KEYS.VILLAGE_LAST_CHANNEL,
  STORAGE_KEYS.THEME_MODE,
  STORAGE_KEYS.WEEKLY_SCHEDULE_ENABLED,
  STORAGE_KEYS.LOCALE,
  STORAGE_KEYS.DND_SETTING,
  STORAGE_KEYS.NOTIFY_ENABLED,
  STORAGE_KEYS.PRIVACY_MODE_ENABLED,
  /* dev-only 模拟开关 */
  STORAGE_KEYS.VIP_SIM_ENABLED,
] as const satisfies readonly string[];

/**
 * 用户级存储键（登出 / 401 强制下线时必须清除）。
 *
 * 由 STORAGE_KEYS 全量值减去 {@link DEVICE_SCOPED_STORAGE_KEYS} 派生，
 * 不做人工维护——新增 key 自动落入本清单（见上方判定标准）。
 */
export const USER_SCOPED_STORAGE_KEYS: readonly string[] = (
  Object.values(STORAGE_KEYS) as string[]
).filter((value) => !(DEVICE_SCOPED_STORAGE_KEYS as readonly string[]).includes(value));

/**
 * 聊天草稿的复合键前缀（实际写入方：subpackages/chat/chat-session/index.vue 的
 * CHAT_DRAFT_PREFIX，键形如 `chat-session-draft:{sessionId}`）。
 *
 * 精确键删除覆盖不到分会话的复合键，故登出清扫额外按前缀枚举删除。
 * 两处字面量必须一致——本常量是那份「必须一致」的唯一登记处。
 */
export const CHAT_DRAFT_SESSION_PREFIX = "chat-session-draft:";

/**
 * 用户级存储的键**前缀**清单（按会话/对象分键的家族）。
 *
 * 同样是「新增即生效」：把一个分键家族登记到这里，登出时整族被清。
 */
export const USER_SCOPED_STORAGE_PREFIXES: readonly string[] = [CHAT_DRAFT_SESSION_PREFIX];

/**
 * 可重建缓存键（设置页「清除缓存」消费）。
 *
 * 与 USER_SCOPED_STORAGE_KEYS 的差别：这里只放「删了能重新拉回来、
 * 且不属账号内容」的键——草稿/搜索历史/已看卡片等虽属用户级，
 * 但只能由登出流程清（清除缓存不是登出，不能顺手删用户未发送的内容）。
 *
 * 2026-10-31 P2 修复：原设置页硬编码 [STORAGE_KEYS.USER_CACHE]，
 * 而 USER_CACHE 全仓零写入方 ⇒ 「清除缓存」实际删不掉任何东西却 toast 成功。
 * 现列出真正有写入方的可重建键（nearby:city ← pages/nearby，
 * tabbar_chat_unread ← composables/useUnreadBadge）。
 */
export const REBUILDABLE_CACHE_KEYS: readonly string[] = [
  /** 预留键：当前无写入方，保留以兼容历史版本写入的数据 */
  STORAGE_KEYS.USER_CACHE,
  /** 最近一次定位解析出的城市（重新定位即可恢复） */
  STORAGE_KEYS.NEARBY_CITY,
  /** 自定义 TabBar 未读角标（由 messages store 重算） */
  STORAGE_KEYS.TABBAR_CHAT_UNREAD,
  /** 签到状态缓存（后端 /checkin/status 为权威） */
  STORAGE_KEYS.CHECKIN_LAST_DATE,
  STORAGE_KEYS.CHECKIN_CONSECUTIVE_DAYS,
];
