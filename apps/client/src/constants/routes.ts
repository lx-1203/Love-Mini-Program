/**
 * 统一页面路径常量 (SubTask 3.5.1)
 *
 * 集中维护 uni-app 客户端所有页面跳转路径，避免在业务代码中
 * 散落硬编码字符串（如 "/pages/discover/index"）导致：
 *   1. 页面路径变更时需全局搜索替换，容易遗漏
 *   2. 拼写错误难以发现，运行时才暴露
 *   3. 跳转代码可读性差，无法集中维护
 *
 * 命名约定：
 *   - 顶层按业务模块分组（TAB / DISCOVER / VILLAGE / CHAT / PROFILE / ...）
 *   - 路径必须以 "/pages/" 开头（uni.navigateTo 约定）
 *   - 与 pages.json 保持一致，新增页面时同步更新
 *
 * 使用示例：
 *   import { ROUTES } from "@/constants";
 *   uni.navigateTo({ url: ROUTES.DISCOVER.HISTORY });
 */

/**
 * 所有页面路径常量集合。
 *
 * 与 src/pages.json 中的 path 字段一一对应，新增页面时需同步更新。
 */
export const ROUTES = {
  /** TabBar 主页面 */
  TAB: {
    /** 匹配页（寻觅） */
    DISCOVER: "/pages/discover/index",
    /** 圈子页（村口） */
    VILLAGE: "/pages/village/index",
    /** 首页 */
    HOME: "/pages/home/index",
    /** 消息页 */
    CHAT: "/pages/chat/index",
    /** 我的页 */
    PROFILE: "/pages/profile/index",
  },

  /** 登录 */
  LOGIN: "/pages/login/index",

  /** 寻觅模块 */
  DISCOVER: {
    /** 历史记录页 */
    HISTORY: "/pages/discover/history",
    /** 视频播放页 */
    VIDEO_PLAYER: "/pages/discover/video-player",
  },

  /** 喜欢模块 */
  LIKES: {
    /** 喜欢页（互相喜欢列表） */
    INDEX: "/pages/likes/index",
  },

  /** 村口社区模块 */
  VILLAGE: {
    /** 发帖页 */
    POST: "/pages/village/post",
    /** 帖子详情页 */
    DETAIL: "/pages/village/detail",
    /** 标签帖子列表页 */
    TAG_POSTS: "/pages/village/tag-posts",
  },

  /** 消息模块 */
  MESSAGES: {
    /** 消息列表页 */
    INDEX: "/pages/messages/index",
    /** 官方号会话页（Phase Feedback3 P2.4） */
    OFFICIAL_CHAT: "/pages/official-chat/index",
  },

  /** 聊天模块 */
  CHAT: {
    /** 聊天会话页 */
    SESSION: "/pages/chat-session/index",
    /** 红包页 */
    RED_PACKET: "/pages/chat/red-packet",
    /** 视频通话页 */
    VIDEO_CALL: "/pages/chat/video-call",
  },

  /** 个人资料模块 */
  PROFILE: {
    /** 我的页 */
    INDEX: "/pages/profile/index",
    /** 访客页 */
    VISITORS: "/pages/profile/visitors",
    /** 相册页 */
    ALBUM: "/pages/profile/album",
  },

  /** 圈子模块 */
  CIRCLES: {
    /** 圈子首页 */
    INDEX: "/pages/circles/index",
    /** 话题列表 */
    TOPICS: "/pages/circles/topics",
    /** 话题详情 */
    TOPIC_DETAIL: "/pages/circles/topic-detail",
    /** 发话题 */
    POST_TOPIC: "/pages/circles/post-topic",
  },

  /** 校园模块 */
  CAMPUS: {
    /** 校园首页 */
    INDEX: "/pages/campus/index",
    /** 发校园话题 */
    POST_TOPIC: "/pages/campus/post-topic",
    /** 话题详情 */
    TOPIC_DETAIL: "/pages/campus/topic-detail",
    /** 校园认证 */
    CERTIFICATION: "/pages/campus/certification",
  },

  /** 每日一问 */
  DAILY_QUESTION: "/pages/daily-question/index",

  /** 商城 */
  SHOP: "/pages/shop/index",

  /** 设置模块 */
  SETTINGS: {
    /** 设置首页 */
    INDEX: "/pages/settings/index",
    /** 免打扰设置 */
    DND: "/pages/settings/dnd",
  },

  /** 实名认证 */
  VERIFICATION: "/pages/verification/index",

  /** 心动信号 */
  HEART_SIGNALS: "/pages/heart-signals/index",

  /** VIP 模块 */
  VIP: {
    /** VIP 主页 */
    INDEX: "/pages/vip/index",
    /** 红包页 */
    RED_PACKET: "/pages/vip/red-packet",
    /** 兑换码 */
    PROMO_CODE: "/pages/vip/promo-code",
    /** 账单 */
    BILLS: "/pages/vip/bills",
  },

  /** 反馈历史 */
  FEEDBACK_HISTORY: "/pages/feedback/history",

  /** 活动详情（任务 E2） */
  ACTIVITY_DETAIL: "/pages/activities/detail",

  /** 恋爱中心模块（任务 E3） */
  LOVE_CENTER: {
    /** 恋爱中心首页 */
    INDEX: "/pages/love-center/index",
    /** 附近的人 */
    NEARBY: "/pages/love-center/nearby",
    /** MBTI 人格测试 */
    MBTI: "/pages/love-center/mbti",
    /** 恋爱咨询课程 */
    CONSULTING: "/pages/love-center/consulting",
  },

  /** 开发者页面 */
  DEV: "/pages/dev/index",
} as const;

/**
 * SubPackage 页面路径（按分业务模块组织，对应 pages.json 的 subPackages）。
 *
 * 注意：分包页面路径需使用完整路径（含分包根路径前缀），
 * 如 "/subpackages/setup/profile/index"，与 uni.navigateTo/redirectTo 的 url 参数约定一致。
 */
export const SUBPACKAGE_ROUTES = {
  /** setup-progress 分包（root: subpackages/setup） */
  SETUP_PROGRESS: {
    PROFILE: "/subpackages/setup/profile/index",
    CAMPUS: "/subpackages/setup/campus/index",
    SCHEDULE: "/subpackages/setup/schedule/index",
    RECOMMEND_PREF: "/subpackages/setup/recommend-pref/index",
  },
  /** support 分包（root: subpackages/support） */
  SUPPORT: {
    FEEDBACK: "/subpackages/support/feedback/index",
  },
  /** discover-feed 分包（root: subpackages/discover） */
  DISCOVER_FEED: {
    DISCUSSIONS: "/subpackages/discover/discussions/index",
    ACTIVITIES: "/subpackages/discover/activities/index",
  },
  /** legal 分包（root: subpackages/legal） */
  LEGAL: {
    PRIVACY: "/subpackages/legal/privacy/index",
    AGREEMENT: "/subpackages/legal/agreement/index",
  },
} as const;

/** 默认首页路径（应用启动时跳转） */
export const DEFAULT_HOME_ROUTE = ROUTES.TAB.HOME;

/** 登录页路径 */
export const LOGIN_ROUTE = ROUTES.LOGIN;

/** TabBar 页面路径列表（用于判断是否使用 switchTab） */
export const TAB_BAR_ROUTES: readonly string[] = [
  ROUTES.TAB.DISCOVER,
  ROUTES.TAB.VILLAGE,
  ROUTES.TAB.HOME,
  ROUTES.TAB.CHAT,
  ROUTES.TAB.PROFILE,
] as const;
