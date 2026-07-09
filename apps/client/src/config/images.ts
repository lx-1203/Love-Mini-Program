/**
 * 图片资源路径配置
 * 集中管理所有静态图片路径，统一修改入口
 *
 * 实际文件位于 src/static/assets/ 目录下，构建后映射到 /static/assets/。
 * 以下路径与磁盘文件一一对应，修改时请同步检查文件是否存在。
 *
 * 使用方式：import { IMAGE_PATHS } from "@/config/images";
 * 禁止在页面/组件中硬编码 "/static/assets/..." 字符串。
 */
const STATIC_BASE = '/static/assets';
const IMAGES = STATIC_BASE + '/images';
const AVATAR_BASE = IMAGES + '/avatars';
const ICONS_BASE = STATIC_BASE + '/icons';

export const IMAGE_PATHS = {
  POST_PLACEHOLDER: IMAGES + '/posts/post-placeholder.jpg',
  DEFAULT_AVATAR: STATIC_BASE + '/default-avatar.jpg',

  AVATARS: {
    AVATAR_1: AVATAR_BASE + '/avatar-1.jpg',
    AVATAR_2: AVATAR_BASE + '/avatar-2.jpg',
    AVATAR_3: AVATAR_BASE + '/avatar-3.jpg',
    AVATAR_4: AVATAR_BASE + '/avatar-4.jpg',
    AVATAR_5: AVATAR_BASE + '/avatar-5.jpg',
    AVATAR_6: AVATAR_BASE + '/avatar-6.jpg',
    AVATAR_7: AVATAR_BASE + '/avatar-7.jpg',
    AVATAR_8: AVATAR_BASE + '/avatar-8.jpg',
    AVATAR_9: AVATAR_BASE + '/avatar-9.jpg',
    AVATAR_10: AVATAR_BASE + '/avatar-10.jpg',
    AVATAR_11: AVATAR_BASE + '/avatar-11.jpg',
    AVATAR_12: AVATAR_BASE + '/avatar-12.jpg',
    DEFAULT: STATIC_BASE + '/default-avatar.jpg',
  },

  POSTS: {
    CAMPUS_LIBRARY: IMAGES + '/posts/campus-library.jpg',
    POST_PLACEHOLDER: IMAGES + '/posts/post-placeholder.jpg',
    POST_1: IMAGES + '/posts/post-1.jpg',
    POST_2: IMAGES + '/posts/post-2.jpg',
    POST_3: IMAGES + '/posts/post-3.jpg',
    POST_4: IMAGES + '/posts/post-4.jpg',
    POST_5: IMAGES + '/posts/post-5.jpg',
    POST_6: IMAGES + '/posts/post-6.jpg',
    POST_7: IMAGES + '/posts/post-7.jpg',
    POST_8: IMAGES + '/posts/post-8.jpg',
  },

  ACTIVITIES: {
    ACTIVITY_1: IMAGES + '/activities/activity-1.jpg',
    ACTIVITY_2: IMAGES + '/activities/activity-2.jpg',
    ACTIVITY_3: IMAGES + '/activities/activity-3.jpg',
    ACTIVITY_4: IMAGES + '/activities/activity-4.jpg',
    ACTIVITY_5: IMAGES + '/activities/activity-5.jpg',
    ACTIVITY_6: IMAGES + '/activities/activity-6.jpg',
    ACTIVITY_SPORTS: IMAGES + '/activities/activity-sports.jpg',
    ACTIVITY_STUDY: IMAGES + '/activities/activity-study.jpg',
  },

  PRODUCTS: {
    FOOD_1: IMAGES + '/products/food-1.jpg',
    FOOD_2: IMAGES + '/products/food-2.jpg',
    MERCH_1: IMAGES + '/products/merch-1.jpg',
    MERCH_2: IMAGES + '/products/merch-2.jpg',
    TICKET_1: IMAGES + '/products/ticket-1.jpg',
    TICKET_2: IMAGES + '/products/ticket-2.jpg',
  },

  POSTERS: {
    LOGIN: IMAGES + '/posters/login-poster.jpg',
    HOME: IMAGES + '/posters/home-poster.jpg',
  },

  BANNERS: {
    VILLAGE: IMAGES + '/banners/village-banner.jpg',
    HOME: IMAGES + '/banners/home-banner.jpg',
  },

  /** 通用图标（common 目录） */
  ICONS_COMMON: {
    ADD: ICONS_BASE + '/common/add.png',
    ADD_WHITE: ICONS_BASE + '/common/add-white.png',
    AI: ICONS_BASE + '/common/ai.png',
    ARROW_RIGHT: ICONS_BASE + '/common/arrow-right.png',
    BACK: ICONS_BASE + '/common/back.png',
    BUILDING: ICONS_BASE + '/common/building.png',
    CAMERA: ICONS_BASE + '/common/camera.png',
    CELEBRATION: ICONS_BASE + '/common/celebration.png',
    CHECK: ICONS_BASE + '/common/check.png',
    CLOSE: ICONS_BASE + '/common/close.png',
    EDIT: ICONS_BASE + '/common/edit.png',
    FIRE: ICONS_BASE + '/common/fire.png',
    GRADUATION: ICONS_BASE + '/common/graduation.png',
    HEART: ICONS_BASE + '/common/heart.png',
    LOCATION: ICONS_BASE + '/common/location.png',
    NEW_BADGE: ICONS_BASE + '/common/new-badge.png',
    NOTIFICATION: ICONS_BASE + '/common/notification.png',
    SCHEDULE: ICONS_BASE + '/common/schedule.png',
    SCHOOL: ICONS_BASE + '/common/school.png',
    SEARCH: ICONS_BASE + '/common/search.png',
    SETTINGS: ICONS_BASE + '/common/settings.png',
    SHOP: ICONS_BASE + '/common/shop.png',
    STAR: ICONS_BASE + '/common/star.png',
    VIP: ICONS_BASE + '/common/vip.png',
    // SVG 变体（支持 currentColor 主题色，用于替换 emoji 场景）
    SCHOOL_SVG: ICONS_BASE + '/common/school.svg',
    CELEBRATION_SVG: ICONS_BASE + '/common/celebration.svg',
    NOTIFICATION_SVG: ICONS_BASE + '/common/notification.svg',
    STAR_SVG: ICONS_BASE + '/common/star.svg',
    SCHEDULE_SVG: ICONS_BASE + '/common/schedule.svg',
    GRADUATION_SVG: ICONS_BASE + '/common/graduation.svg',
  },

  /** 社交图标（social 目录） */
  ICONS_SOCIAL: {
    CHECKIN: ICONS_BASE + '/social/checkin.png',
    COMMENT: ICONS_BASE + '/social/comment.png',
    FOLLOW: ICONS_BASE + '/social/follow.png',
    HEART_SIGNAL: ICONS_BASE + '/social/heart-signal.png',
    LIKE: ICONS_BASE + '/social/like.png',
    LIKE_FILLED: ICONS_BASE + '/social/like-filled.png',
    MATCH: ICONS_BASE + '/social/match.png',
    MESSAGE: ICONS_BASE + '/social/message.png',
    PASS: ICONS_BASE + '/social/pass.png',
    SHARE: ICONS_BASE + '/social/share.png',
    SUPER_LIKE: ICONS_BASE + '/social/super-like.png',
    VISITOR: ICONS_BASE + '/social/visitor.png',
  },

  /** TabBar 图标（tabbar 目录） */
  ICONS_TABBAR: {
    CHAT_ACTIVE: ICONS_BASE + '/tabbar/chat-active.png',
    CHAT_DEFAULT: ICONS_BASE + '/tabbar/chat-default.png',
    DISCOVER_ACTIVE: ICONS_BASE + '/tabbar/discover-active.png',
    DISCOVER_DEFAULT: ICONS_BASE + '/tabbar/discover-default.png',
    HOME_ACTIVE: ICONS_BASE + '/tabbar/home-active.png',
    HOME_DEFAULT: ICONS_BASE + '/tabbar/home-default.png',
    PROFILE_ACTIVE: ICONS_BASE + '/tabbar/profile-active.png',
    PROFILE_DEFAULT: ICONS_BASE + '/tabbar/profile-default.png',
    VILLAGE_ACTIVE: ICONS_BASE + '/tabbar/village-active.png',
    VILLAGE_DEFAULT: ICONS_BASE + '/tabbar/village-default.png',
  },

  /** 个人中心菜单图标（profile 目录，全部复用现有图标，避免下载新资源） */
  ICONS_PROFILE: {
    POSTS:        ICONS_BASE + '/social/heart-signal.png', // 我的动态 → 复用 heart-signal
    FAVORITES:    ICONS_BASE + '/common/star.png',          // 我的收藏 → 复用 star
    MATCHES:      ICONS_BASE + '/social/match.png',         // 我的匹配 → 复用 social.match
    VISITORS:     ICONS_BASE + '/social/visitor.png',       // 访客记录 → 复用 social.visitor
    VERIFICATION: ICONS_BASE + '/common/check.png',         // 恋爱认证 → 复用 check
    LAB:          ICONS_BASE + '/common/ai.png',            // 情感实验室 → 复用 ai
    SHARE:        ICONS_BASE + '/social/share.png',         // 推荐给好友 → 复用 social.share
    SETTINGS:     ICONS_BASE + '/common/settings.png',      // 设置 → 复用 common.settings
    INFO:         ICONS_BASE + '/common/notification.png',  // 关于我们 → 复用 notification
  },

  /**
   * Emoji 替换 SVG 图标（icons 根目录）
   * 用于替换页面中的 emoji 字符（📍👥🎂✨🔍🎤😊+❤️💬🔖🎁🔥👍）
   * SVG 使用 currentColor，可通过父元素 color 控制主题色
   */
  ICONS_EMOJI: {
    LOCATION:    ICONS_BASE + '/location.svg',    // 📍 附近 / 位置
    GROUP:       ICONS_BASE + '/group.svg',        // 👥 群组 / 不限
    CAKE:        ICONS_BASE + '/cake.svg',         // 🎂 生日 / 年龄
    SPARKLES:    ICONS_BASE + '/sparkles.svg',    // ✨ 闪光 / 推荐
    SEARCH:      ICONS_BASE + '/search.svg',      // 🔍 搜索
    MICROPHONE:  ICONS_BASE + '/microphone.svg',  // 🎤 语音房
    SMILE:       ICONS_BASE + '/smile.svg',       // 😊 微笑
    PLUS:        ICONS_BASE + '/plus.svg',        // + 新增
    HEART:       ICONS_BASE + '/heart.svg',       // ❤️ 喜欢
    CHAT:        ICONS_BASE + '/chat.svg',        // 💬 评论
    BOOKMARK:    ICONS_BASE + '/bookmark.svg',   // 🔖 收藏
    GIFT:        ICONS_BASE + '/gift.svg',        // 🎁 礼物
    FIRE:        ICONS_BASE + '/fire.svg',       // 🔥 热门
    THUMBS_UP:   ICONS_BASE + '/thumbs-up.svg',  // 👍 点赞
  },
} as const;
