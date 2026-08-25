/**
 * 图片资源路径配置
 * 集中管理所有静态图片路径，统一修改入口
 *
 * 实际文件位于 src/static/assets/ 目录下，构建后映射到 /static/assets/。
 * 以下路径与磁盘文件一一对应，修改时请同步检查文件是否存在。
 *
 * 使用方式：import { IMAGE_PATHS } from "@/config/images";
 * 禁止在页面/组件中硬编码 "/static/assets/..." 字符串。
 *
 * 相关文件（infra R2-00137）：
 * - config/assets-index.ts 为 scripts/media-gen/generate.ts 的生成产物
 *   （指向 /static/generated/**），与手工维护的本文件职责不同；
 *   业务代码统一走本文件，生成素材按需引用 assets-index。
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

  /** v3.1 人物素材（素材/人物 9 张，docs/design/people-fixture.json 映射） */
  PEOPLE: {
    CARD_1: IMAGES + '/people/person-01.png',
    CARD_2: IMAGES + '/people/person-02.png',
    CARD_3: IMAGES + '/people/person-03.png',
    CARD_4: IMAGES + '/people/person-04.png',
    CARD_5: IMAGES + '/people/person-05.png',
    CARD_6: IMAGES + '/people/person-06.png',
    CARD_7: IMAGES + '/people/person-07.png',
    CARD_8: IMAGES + '/people/person-08.png',
    CARD_9: IMAGES + '/people/person-09.png',
    AVATAR_1: IMAGES + '/avatars/person-01-avatar.png',
    AVATAR_2: IMAGES + '/avatars/person-02-avatar.png',
    AVATAR_3: IMAGES + '/avatars/person-03-avatar.png',
    AVATAR_4: IMAGES + '/avatars/person-04-avatar.png',
    AVATAR_5: IMAGES + '/avatars/person-05-avatar.png',
    AVATAR_6: IMAGES + '/avatars/person-06-avatar.png',
    AVATAR_7: IMAGES + '/avatars/person-07-avatar.png',
    AVATAR_8: IMAGES + '/avatars/person-08-avatar.png',
    AVATAR_9: IMAGES + '/avatars/person-09-avatar.png',
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


  /** 消息模块 V3 图标（素材\消息\2 + 素材\消息\2\2） */
  MESSAGE_ICONS: {
    ASSISTANT_AVATAR: '/static/assets/message/svg/assistant_avatar.svg',
    LIKE_NOTICE: '/static/assets/message/svg/like_notice.svg',
    OFFICIAL: '/static/assets/message/svg/official.svg',
    SEND_HEART: '/static/assets/message/svg/send_heart.svg',
    VOICE: '/static/assets/message/svg/voice.svg',
    LOCATION: '/static/assets/message/svg/location.svg',
    CALENDAR: '/static/assets/message/svg/calendar.svg',
    ONLINE: '/static/assets/message/svg/avatar/online.svg',
    AVATAR_RING: '/static/assets/message/svg/avatar/avatar-ring.svg',
    CARD_BASE: '/static/assets/message/svg/card/card-base.svg',
    PHOTO_PLACEHOLDER: '/static/assets/message/svg/gallery/photo-placeholder.svg',
    HERO_GRADIENT: '/static/assets/message/svg/hero/hero-gradient-bg.svg',
    ADD: '/static/assets/message/svg/icon/add.svg',
    HEART: '/static/assets/message/svg/icon/heart.svg',
    COMMON_INTEREST_BG: '/static/assets/message/svg/interest/common-interest-bg.svg',
    MATCH_PROGRESS: '/static/assets/message/svg/match/match-progress.svg',
    EMPTY_STORY: '/static/assets/message/svg/story/story-empty.svg',
    ACTIVITY_CARD: '/static/assets/message/svg/card/card-base.svg',
    SEND_HEART_LEGACY: '/static/assets/message/svg/chat_send_heart.svg',
    ONLINE_DOT: '/static/assets/message/svg/avatar/online.svg',
    HEART_FILL: '/static/assets/message/svg/icon/heart.svg',
    HEART_OUTLINE: '/static/assets/icons/heart.svg',
    MESSAGE: '/static/assets/message/svg/message.svg',
    CAMERA: '/static/assets/icons/common/camera.svg',
    SMILE: '/static/assets/icons/smile.svg',
  },

  POSTERS: {
    LOGIN: IMAGES + '/posters/login-poster.png',
    LOGIN_ILLUSTRATION: IMAGES + '/posters/login-illustration.jpg', // 2026-08-20：改为校园插画（原 png 为图标设计板，非登录背景）
    HOME: IMAGES + '/posters/home-poster.jpg',
    NOT_LOGGED_WAITING: IMAGES + '/posters/notlogged-waiting.png',
  },

  /**
   * 生成素材（/static/generated 根目录，R4-00245：image-local.ts 兜底映射引用本组，
   * 不再散落硬编码 /static/generated/... 路径）。
   */
  GENERATED: {
    CAMPUS_GATE: '/static/generated/images/campus/campus-gate.jpg',
    CAMPUS_LAKE: '/static/generated/images/campus/campus-lake.jpg',
    CAMPUS_LIBRARY: '/static/generated/images/campus/campus-library.jpg',
    CAMPUS_NIGHT: '/static/generated/images/campus/campus-night.jpg',
    CAMPUS_PLAYGROUND: '/static/generated/images/campus/campus-playground.jpg',
    CAMPUS_CAFETERIA: '/static/generated/images/campus/campus-cafeteria.jpg',
    CAMPUS_CLASSROOM: '/static/generated/images/campus/campus-classroom.jpg',
    CAMPUS_RAIN: '/static/generated/images/campus/campus-rain.jpg',
    HOME_POSTER: '/static/generated/images/posters/home-poster.jpg',
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
    // 新增 SVG 图标（feather/lucide 风格 24x24 stroke，替换 emoji）
    USER_SVG: ICONS_BASE + '/common/user.svg',
    WARNING_SVG: ICONS_BASE + '/common/warning.svg',
    BOOK_SVG: ICONS_BASE + '/common/book.svg',
    FOOD_SVG: ICONS_BASE + '/common/food.svg',
    HIKING_SVG: ICONS_BASE + '/common/hiking.svg',
    RULER_SVG: ICONS_BASE + '/common/ruler.svg',
    MONEY_SVG: ICONS_BASE + '/common/money.svg',
    LOCK_SVG: ICONS_BASE + '/common/lock.svg',
    PENCIL_SVG: ICONS_BASE + '/common/pencil.svg',
    EYE_SVG: ICONS_BASE + '/common/eye.svg',
    EYE_OFF_SVG: ICONS_BASE + '/common/eye-off.svg',
    BELL_SVG: ICONS_BASE + '/common/bell.svg',
    PROHIBITED_SVG: ICONS_BASE + '/common/prohibited.svg',
    SHARE_ICON_SVG: ICONS_BASE + '/common/share.svg',
    OPEN_BOOK_SVG: ICONS_BASE + '/common/open-book.svg',
    TREND_UP_SVG: ICONS_BASE + '/common/trend-up.svg',
    CHART_SVG: ICONS_BASE + '/common/chart.svg',
    CLIPBOARD_SVG: ICONS_BASE + '/common/clipboard.svg',
    KEY_SVG: ICONS_BASE + '/common/key.svg',
    MOBILE_SVG: ICONS_BASE + '/common/mobile.svg',
    CLOCK_SVG: ICONS_BASE + '/common/clock.svg',
    CALENDAR_SVG: ICONS_BASE + '/common/calendar.svg',
    HEART_FILLED_SVG: ICONS_BASE + '/common/heart-filled.svg',
    CROWN_SVG: ICONS_BASE + '/common/crown.svg',
    REFRESH_SVG: ICONS_BASE + '/common/refresh.svg',
    FILE_TEXT_SVG: ICONS_BASE + '/common/file-text.svg',
    INFO_SVG: ICONS_BASE + '/common/info.svg',
    LOG_OUT_SVG: ICONS_BASE + '/common/log-out.svg',
    CHEVRON_DOWN_SVG: ICONS_BASE + '/common/chevron-down.svg',
    UPLOAD_SVG: ICONS_BASE + '/common/upload.svg',
    PACKAGE_SVG: ICONS_BASE + '/common/package.svg',
    BOX_SVG: ICONS_BASE + '/common/box.svg',
    PIN_SVG: ICONS_BASE + '/common/pin.svg',
    CHECK_CIRCLE_SVG: ICONS_BASE + '/common/check-circle.svg',
    CHECK_SVG: ICONS_BASE + '/common/check.svg',
    CHECK_WHITE_SVG: ICONS_BASE + '/common/check-white.svg',
    CLOSE_SVG: ICONS_BASE + '/common/close.svg',
    X_CIRCLE_SVG: ICONS_BASE + '/common/x-circle.svg',
    GRADUATION_CAP_SVG: ICONS_BASE + '/common/graduation-cap.svg',
    CHEVRON_RIGHT_SVG: ICONS_BASE + '/common/chevron-right.svg',
    CHEVRON_LEFT_SVG: ICONS_BASE + '/common/chevron-left.svg',
    BOLT_SVG: ICONS_BASE + '/common/bolt.svg',
    LIST_SVG: ICONS_BASE + '/common/list.svg',
    CHECK_FAIL_SVG: ICONS_BASE + '/common/check-fail.svg',
    PENDING_SVG: ICONS_BASE + '/common/pending.svg',
    SETTINGS_GEAR_SVG: ICONS_BASE + '/common/settings-gear.svg',
    TERMINAL_SVG: ICONS_BASE + '/common/terminal.svg',
    ROBOT_SVG: ICONS_BASE + '/common/robot.svg',
    LOG_IN_SVG: ICONS_BASE + '/common/log-in.svg',
    DOWNLOAD_SVG: ICONS_BASE + '/common/download.svg',
    VIDEO_SVG: ICONS_BASE + '/common/video.svg',
    BRIEFCASE_SVG: ICONS_BASE + '/common/briefcase.svg', // 💼 职业
    RING_SVG: ICONS_BASE + '/common/ring.svg',           // 💍 感情状态
    PLAY_SVG: ICONS_BASE + '/common/play.svg',           // ▶ 播放
    PAUSE_SVG: ICONS_BASE + '/common/pause.svg',         // ❚❚ 暂停
    CLOSE_WHITE_SVG: ICONS_BASE + '/common/close-white.svg', // 白色 ✕（深色背景关闭）
  },

  /** 社交图标（social 目录）
   * Phase 9 选图研究：全部切换为 SVG（lucide 风格，currentColor 可主题化），png 历史资产不再引用 */
  ICONS_SOCIAL: {
    CHECKIN: ICONS_BASE + '/social/checkin.svg',
    COMMENT: ICONS_BASE + '/social/comment.svg',
    FOLLOW: ICONS_BASE + '/social/follow.svg',
    HEART_SIGNAL: ICONS_BASE + '/social/heart-signal.svg',
    LIKE: ICONS_BASE + '/social/like.svg',
    LIKE_FILLED: ICONS_BASE + '/social/like-filled.svg',
    MATCH: ICONS_BASE + '/social/match.svg',
    MESSAGE: ICONS_BASE + '/social/message.svg',
    PASS: ICONS_BASE + '/social/pass.svg',
    SHARE: ICONS_BASE + '/social/share.svg',
    SUPER_LIKE: ICONS_BASE + '/social/super-like.svg',
    VISITOR: ICONS_BASE + '/social/visitor.svg',
  },

  /** 附近页入口图标 */
  NEARBY_ICONS: {
    PEOPLE:  ICONS_BASE + '/common/user.svg',
    CIRCLE:  ICONS_BASE + '/common/group.svg',
    CAMPUS:  ICONS_BASE + '/common/school.svg',
    ACTIVITY: ICONS_BASE + '/common/schedule.svg',
    DYNAMIC: ICONS_BASE + '/common/fire.svg',
  },

  /** 首页拆分图标（精修版 — 从素材/首页/最终/拆分图标-精修版/ 复制） */
  HOME_ICONS: {
    // 01-tabbar-top：顶部导航区
    SEARCH: ICONS_BASE + '/home/tabbar-top/icon_row1_01.png',
    LOCATION_PIN: ICONS_BASE + '/home/tabbar-top/icon_row1_02.png',
    HEADER_BELL: ICONS_BASE + '/home/tabbar-top/icon_row1_07.png',
    HEADER_MORE: ICONS_BASE + '/home/tabbar-top/icon_row1_06.png',
    // 02-buttons-badges：按钮与徽章
    BTN_SEE: ICONS_BASE + '/home/buttons-badges/btn_row2_01.png',
    BTN_LIKE: ICONS_BASE + '/home/buttons-badges/btn_row2_02.png',
    BTN_INVITE: ICONS_BASE + '/home/buttons-badges/btn_row2_05.png',
    // 03-tags：兴趣标签（彩色圆底）
    TAG_PHOTOGRAPHY: ICONS_BASE + '/home/tags/tag_row3_01.png',
    TAG_TRAVEL: ICONS_BASE + '/home/tags/tag_row3_02.png',
    TAG_MUSIC: ICONS_BASE + '/home/tags/tag_row3_03.png',
    TAG_FOOD: ICONS_BASE + '/home/tags/tag_row3_04.png',
    TAG_SPORTS: ICONS_BASE + '/home/tags/tag_row3_05.png',
    TAG_READING: ICONS_BASE + '/home/tags/tag_row3_06.png',
    // 04-photos-stats：信息与统计图标
    STAT_HEART: ICONS_BASE + '/home/photos-stats/item_row4_01.png',
    STAT_MESSAGE: ICONS_BASE + '/home/photos-stats/item_row4_02.png',
    STAT_VISITOR: ICONS_BASE + '/home/photos-stats/item_row4_03.png',
    STAT_MATCH: ICONS_BASE + '/home/photos-stats/item_row4_04.png',
    // 05-task-cards：恋爱进度四步卡片
    TASK_PROFILE: ICONS_BASE + '/home/task-cards/card_row5_01.png',
    TASK_DISCOVER: ICONS_BASE + '/home/task-cards/card_row5_02.png',
    TASK_WHISPER: ICONS_BASE + '/home/task-cards/card_row5_03.png',
    TASK_INTEREST: ICONS_BASE + '/home/task-cards/card_row5_04.png',
    // 06-circle-entries：兴趣圈入口
    CIRCLE_PHOTO: ICONS_BASE + '/home/circle-entries/circle_row6_01.png',
    CIRCLE_TRAVEL: ICONS_BASE + '/home/circle-entries/circle_row6_02.png',
    CIRCLE_MUSIC: ICONS_BASE + '/home/circle-entries/circle_row6_03.png',
    CIRCLE_FOOD: ICONS_BASE + '/home/circle-entries/circle_row6_04.png',
    // 07-toolbar：社区动态互动栏
    TB_LIKE: ICONS_BASE + '/home/toolbar/toolbar_row7_01.png',
    TB_COMMENT: ICONS_BASE + '/home/toolbar/toolbar_row7_02.png',
    TB_SHARE: ICONS_BASE + '/home/toolbar/toolbar_row7_03.png',
  },

  /** TabBar 图标（tabbar 目录） */
  ICONS_TABBAR: {
    HOME_ACTIVE: ICONS_BASE + '/tabbar/home-active.png',
    HOME_DEFAULT: ICONS_BASE + '/tabbar/home.png',
    CHAT_ACTIVE: ICONS_BASE + '/tabbar/chat-active.png',
    CHAT_DEFAULT: ICONS_BASE + '/tabbar/chat.png',
    DISCOVER_ACTIVE: ICONS_BASE + '/tabbar/discover-active.png',
    DISCOVER_DEFAULT: ICONS_BASE + '/tabbar/discover.png',
    MATCH_HEART: ICONS_BASE + '/tabbar/match-heart.png',
    MATCH_HEART_ACTIVE: ICONS_BASE + '/tabbar/match-heart-active.png',
    NEARBY_ACTIVE: ICONS_BASE + '/tabbar/nearby-active.png',
    NEARBY_DEFAULT: ICONS_BASE + '/tabbar/nearby.png',
    PROFILE_ACTIVE: ICONS_BASE + '/tabbar/profile-active.png',
    PROFILE_DEFAULT: ICONS_BASE + '/tabbar/profile.png',
  },

  /** 纯匹配版动作图标（v2 图标资源：freesvglab flat + 素材回退，固定色 PNG） */
  ICONS_MATCH: {
    /** 喜欢（心动粉 #FF6B81） */
    HEART: ICONS_BASE + '/v2/heart-pink.png',
    /** 超级喜欢（消息蓝 #4D8DFF） */
    STAR: ICONS_BASE + '/v2/star-blue.png',
    /** 跳过（次文字灰 #666666） */
    X: ICONS_BASE + '/v2/x-gray.png',
    /** 匹配爱心（白色，供浮岛/图标使用） */
    MATCH_HEART: ICONS_BASE + '/v2/heart-white.png',
  },

  /** 寻觅 V1 图标（icons/match 目录，构建期 SVG→PNG） */
  ICONS_MATCH_V1: {
    PASS: ICONS_BASE + '/match/pass.png',
    LIKE: ICONS_BASE + '/match/like.png',
    SUPER_LIKE: ICONS_BASE + '/match/super-like.png',
    HEART_MATCH: ICONS_BASE + '/match/heart-match.png',
    LOADING_RING: ICONS_BASE + '/match/loading-ring.png',
  },

  /** 寻觅 V1 聊天图标（icons/match 目录，构建期 SVG→PNG） */
  ICONS_CHAT_V1: {
    SEND: ICONS_BASE + '/match/chat-send.png',
    IMAGE: ICONS_BASE + '/match/chat-image.png',
    VOICE: ICONS_BASE + '/match/chat-voice.png',
  },

  /** v2 核心图标（icons/v2 目录：freesvglab flat-icon + 素材回退，96px 固定色 PNG） */
  ICONS_V2: {
    DISCOVER: ICONS_BASE + '/v2/discover.png',
    NEARBY: ICONS_BASE + '/v2/nearby.png',
    HEART: ICONS_BASE + '/v2/heart.png',
    CHAT: ICONS_BASE + '/v2/chat.png',
    PROFILE: ICONS_BASE + '/v2/profile.png',
    STAR: ICONS_BASE + '/v2/star.png',
    X: ICONS_BASE + '/v2/x.png',
    SEARCH: ICONS_BASE + '/v2/search.png',
    MORE: ICONS_BASE + '/v2/more.png',
    BACK: ICONS_BASE + '/v2/back.png',
    PLUS: ICONS_BASE + '/v2/plus.png',
    EDIT: ICONS_BASE + '/v2/edit.png',
    BELL: ICONS_BASE + '/v2/bell.png',
    SLIDERS: ICONS_BASE + '/v2/sliders.png',
      DIAMOND_FILTER: IMAGES + '/diamond-filter.svg',
    VERIFY: ICONS_BASE + '/v2/verify.png',
    ONLINE: ICONS_BASE + '/v2/online.png',
    // 品牌色变体
    HEART_PINK: ICONS_BASE + '/v2/heart-pink.png',
    CHAT_WHITE: ICONS_BASE + '/v2/chat-white.png',
    CHAT_PINK: ICONS_BASE + '/v2/chat-pink.png',
    CHAT_GREEN: ICONS_BASE + '/v2/chat-green.png',
    X_WHITE: ICONS_BASE + '/v2/x-white.png',
    HEART_WHITE: ICONS_BASE + '/v2/heart-white.png',
    HEART_BRAND: ICONS_BASE + '/v2/heart-brand.png',
    STAR_BLUE: ICONS_BASE + '/v2/star-blue.png',
    X_GRAY: ICONS_BASE + '/v2/x-gray.png',
    /* 2026-08-25 P0：登录页微信绿色气泡 SVG（自绘，参见 报告/2026-08-25-逐页差异规格书.md 2.9） */
    WECHAT_GREEN_SVG: ICONS_BASE + '/login/wechat-green.svg',
    /* 2026-08-25 P0：登录页主标题后绿色小苗图标（复用吉祥物 sprout，渲染最稳） */
    SPROUT: IMAGES + '/mascot/sprout.png',
  },

  /** 个人中心菜单图标（profile 目录，全部复用现有图标，避免下载新资源） */
  ICONS_PROFILE: {
    POSTS:        ICONS_BASE + '/social/heart-signal.svg', // 我的动态 → 复用 heart-signal
    FAVORITES:    ICONS_BASE + '/common/star.png',          // 我的收藏 → 复用 star
    MATCHES:      ICONS_BASE + '/social/match.svg',         // 我的匹配 → 复用 social.match
    VISITORS:     ICONS_BASE + '/social/visitor.svg',       // 访客记录 → 复用 social.visitor
    PHOTO_WALL:   ICONS_BASE + '/social/heart-signal.svg',  // 相册 → 复用 heart-signal（暂用占位）
    VERIFICATION: ICONS_BASE + '/common/check.png',         // 恋爱认证 → 复用 check
    LAB:          ICONS_BASE + '/common/ai.png',            // 情感实验室 → 复用 ai
    SHARE:        ICONS_BASE + '/social/share.svg',         // 推荐给好友 → 复用 social.share
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
    // 新增 emoji→SVG 映射（feather/lucide style）
    USER:        ICONS_BASE + '/common/user.svg',           // 👤 用户
    WARNING:     ICONS_BASE + '/common/warning.svg',        // ⚠️ 警告
    BOOK:        ICONS_BASE + '/common/book.svg',           // 📚 读书
    CAMERA_ICON: ICONS_BASE + '/common/camera.svg',         // 📷 相机
    RULER:       ICONS_BASE + '/common/ruler.svg',          // 📏 身高
    MONEY:       ICONS_BASE + '/common/money.svg',          // 💰 月消费
    LOCK:        ICONS_BASE + '/common/lock.svg',           // 🔒 锁定
    PENCIL:      ICONS_BASE + '/common/pencil.svg',         // ✏️ 编辑
    EYE:         ICONS_BASE + '/common/eye.svg',            // 👀 查看
    EYE_OFF:     ICONS_BASE + '/common/eye-off.svg',        // 🙅 不看
    BELL:        ICONS_BASE + '/common/bell.svg',           // 🔔 通知
    PROHIBITED:  ICONS_BASE + '/common/prohibited.svg',     // 🚫 禁止
    CROWN:       ICONS_BASE + '/common/crown.svg',          // 👑 皇冠
    ROCKET:      ICONS_BASE + '/common/trend-up.svg',       // 🚀 趋势/加权
    PALETTE:     ICONS_BASE + '/common/settings-gear.svg',   // 🎨 主题
    CHECK_CIRCLE:ICONS_BASE + '/common/check-circle.svg',   // ✅ 已选
    CHECK_FAIL:  ICONS_BASE + '/common/check-fail.svg',     // ❌ 未通过
    INFO:        ICONS_BASE + '/common/info.svg',           // ℹ️ 信息
    SHIELD:      ICONS_BASE + '/common/lock.svg',           // 🛡️ 隐私
    CLIPBOARD:   ICONS_BASE + '/common/clipboard.svg',      // 📋 列表
    BROOM:       ICONS_BASE + '/common/refresh.svg',        // 🧹 清理
    PENDING:     ICONS_BASE + '/common/pending.svg',        // ⏳ 审核中
    GRAD_CAP:    ICONS_BASE + '/common/graduation-cap.svg',  // 🎓 毕业
    TARGET:      ICONS_BASE + '/common/pin.svg',            // 🎯 目标
    SCORE:       ICONS_BASE + '/common/check-circle.svg',   // 💯 满分
    UPLOAD:      ICONS_BASE + '/common/upload.svg',         // 📤 上传
    LAB:         ICONS_BASE + '/common/robot.svg',          // 🔬 实验室
    SETTINGS:    ICONS_BASE + '/common/settings-gear.svg',   // ⚙️ 设置
    HEART_FILLED:ICONS_BASE + '/common/heart-filled.svg',  // 💝/💕 爱心填色
    MOBILE:      ICONS_BASE + '/common/mobile.svg',         // 📱 手机
    KEY:         ICONS_BASE + '/common/key.svg',            // 🔑 钥匙
    CLOCK:       ICONS_BASE + '/common/clock.svg',          // 🕐 时钟
    CALENDAR:    ICONS_BASE + '/common/calendar.svg',       // 📅 日历
    VIDEO:       ICONS_BASE + '/common/video.svg',          // 📹 视频
    LOG_IN:      ICONS_BASE + '/common/log-in.svg',         // 📲 登录
    DOWNLOAD:    ICONS_BASE + '/common/download.svg',       // 📥 下载
    CHART:       ICONS_BASE + '/common/chart.svg',          // 📊 图表
    LIST:        ICONS_BASE + '/common/list.svg',           // 📝 列表
    FILE_TEXT:   ICONS_BASE + '/common/file-text.svg',      // 📜 文档
    REFRESH_CW:  ICONS_BASE + '/common/refresh.svg',        // 🔄 刷新
    // 业务图标别名（与 ICONS_COMMON 中 SVG 资源对应，便于 emoji 风格统一引用）
    PIN:         ICONS_BASE + '/common/pin.svg',            // 📌 置顶 / 定位
    BOLT:        ICONS_BASE + '/common/bolt.svg',           // ⚡ 闪电 / 快捷
    FOOD:        ICONS_BASE + '/common/food.svg',           // 🍔 美食
    // ===== Feedback 改版 emoji 全量替换补充映射（lucide 风格，currentColor）=====
    MEGAPHONE:   ICONS_BASE + '/common/megaphone.svg',      // 📣 官方号 / 通知
    PUZZLE:      ICONS_BASE + '/common/puzzle.svg',         // 🧩 MBTI / 拼图
    GAMEPAD:     ICONS_BASE + '/common/gamepad.svg',        // 🎮 游戏
    COOKING:     ICONS_BASE + '/common/cooking-pot.svg',    // 🍳 美食 / 烹饪
    PLANE:       ICONS_BASE + '/common/plane.svg',          // ✈️ 旅行
    CLAPPER:     ICONS_BASE + '/common/clapperboard.svg',   // 🎬 电影
    MUSIC:       ICONS_BASE + '/common/music.svg',          // 🎵 音乐 / 舞蹈
    LINK:        ICONS_BASE + '/common/link.svg',           // 🔗 绑定
    MOON:        ICONS_BASE + '/common/moon.svg',           // 🌙 夜间 / 深色
    TICKET:      ICONS_BASE + '/common/ticket.svg',         // 🎫 卡券 / 兑换码
    VOLUME_HIGH: ICONS_BASE + '/common/volume-high.svg',    // 🔊 音量高
    VOLUME_LOW:  ICONS_BASE + '/common/volume-low.svg',     // 🔈 音量低
    VOLUME_X:    ICONS_BASE + '/common/volume-x.svg',       // 🔇 静音
    MAIL:        ICONS_BASE + '/common/mail.svg',           // ✉️ 私信 / 悄悄话
    PHONE:       ICONS_BASE + '/common/phone.svg',          // 📞 语音通话
    HEART_OUTLINE: ICONS_BASE + '/heart.svg',               // 🤍 空心心（未赞）
    DOUBLE_HEART:ICONS_BASE + '/common/heart-filled.svg',   // 💞 恋爱咨询
    SPEECH:      ICONS_BASE + '/chat.svg',                  // 🗣️ 社交咨询
    // ===== 2026-08-25 emoji→SVG 全量替换补充映射（映射表 v1，P0/P1）=====
    STAR:        STATIC_BASE + '/svg-spec/03-icons/star.svg',        // ☆ 空星（悄悄话/未赞）
    CLOSE:       STATIC_BASE + '/svg-spec/03-icons/close.svg',       // ✕ 关闭
    CHECK:       ICONS_BASE + '/common/check.svg',                   // ✓ 对勾
    COMMENT:     STATIC_BASE + '/svg-spec/03-icons/comment.svg',     // 💬 聊天气泡
    IMAGE:       STATIC_BASE + '/svg-spec/03-icons/image.svg',       // 🖼 图片/相册
    EDIT:        STATIC_BASE + '/svg-spec/03-icons/edit.svg',        // ✎ / ✏ 铅笔编辑
    PLAY:        ICONS_BASE + '/common/play.svg',                    // ▶ 播放
    SCHOOL:      ICONS_BASE + '/common/school.svg',                  // 🏫 学校
    SPROUT:      STATIC_BASE + '/svg-spec/08-mascot/sprout-default.svg', // 🌱 寻觅品牌嫩芽
    LEAF:        STATIC_BASE + '/svg-spec/09-decorations/leaf-2.svg',    // 🌿 叶子
    STATUS_ONLINE: STATIC_BASE + '/svg-spec/04-avatars/status-online.svg', // 🟢 在线
    GENDER_FEMALE: ICONS_BASE + '/emoji/gender-female.svg',          // ♀ 女（新下载）
    GENDER_MALE:   ICONS_BASE + '/emoji/gender-male.svg',            // ♂ 男（新下载）
    RUN:         ICONS_BASE + '/emoji/run.svg',                      // 🏃 跑步（新下载）
  },

  /** 首页拆分素材（素材/首页/最终/拆分图标-精修版） */
  HOME_SPLIT: {
    CIRCLE_PHOTO: '/static/assets/images/home-split/circle/circle_row6_01.png',
    CIRCLE_TRAVEL: '/static/assets/images/home-split/circle/circle_row6_02.png',
    CIRCLE_MUSIC: '/static/assets/images/home-split/circle/circle_row6_03.png',
    CIRCLE_FOOD: '/static/assets/images/home-split/circle/circle_row6_04.png',
    CIRCLE_SPORTS: '/static/assets/images/home-split/circle/circle_row6_05.png',
    CIRCLE_READING: '/static/assets/images/home-split/circle/circle_row6_06.png',
    JOIN_BTN: '/static/assets/images/home-split/circle/circle_row6_07.png',
    MEMBER_BADGE: '/static/assets/images/home-split/circle/circle_row6_08.png',
    HOT_BADGE: '/static/assets/images/home-split/circle/circle_row6_09.png',
    LIKE: '/static/assets/images/home-split/toolbar/toolbar_row7_01.png',
    COMMENT: '/static/assets/images/home-split/toolbar/toolbar_row7_02.png',
    SHARE: '/static/assets/images/home-split/toolbar/toolbar_row7_03.png',
  },

  /** 兴趣圈大封面摄影图（static/assets/images/covers/，参考图风格） */
  CIRCLE_COVERS: {
    PHOTO:     IMAGES + '/covers/circle-photo.png',
    TRAVEL:    IMAGES + '/covers/circle-travel.png',
    MUSIC:     IMAGES + '/covers/circle-music.png',
    FOOD:      IMAGES + '/covers/circle-food.png',
    SPORTS:    IMAGES + '/covers/circle-sports.png',
    // 第五轮 QA 一致性收敛：原 GAME/READING/PET 是宽幅场景大图（600KB+ AI 摄影），
    // 与理想图 素材/理想效果图/兴趣圈列表.png 的方形场景缩略风格（Style A）不同，
    // 改用本地 AI 生成的方形居中场景图（与 ideal style 一致：摄影感/场景图优先）。
    GAME:      IMAGES + '/covers/Cozy_flat_lay_of_video_game_co_2026-08-21T03-34-01.png',
    READING:   IMAGES + '/covers/A_person_reading_a_book_in_a_c_2026-08-21T03-35-17.png',
    PET:       IMAGES + '/covers/A_cute_golden_retriever_dog_lo_2026-08-21T03-36-28.png',
    STUDY:     IMAGES + '/covers/circle-studybuddy.png',
    POSTGRAD:  IMAGES + '/covers/circle-postgraduate.png',
    ASTRONOMY: IMAGES + '/covers/circle-sky.png',
    DEFAULT:   IMAGES + '/covers/circle-photo.png',
  },

  /** 登录页拆分素材（素材/登录页/拆分图标_登录页；文件前缀 登录页_） */
  LOGIN_SPLIT: {
    "r01_c01": '/static/assets/images/login-split/登录页_r01_c01.png',
    "r01_c02": '/static/assets/images/login-split/r01_c02.png',
    "r02_c01": '/static/assets/images/login-split/登录页_r02_c01.png',
    "r02_c02": '/static/assets/images/login-split/登录页_r02_c02.png',
    "r02_c03": '/static/assets/images/login-split/登录页_r02_c03.png',
    "r03_c01": '/static/assets/images/login-split/登录页_r03_c01.png',
    "r03_c02": '/static/assets/images/login-split/登录页_r03_c02.png',
    "r03_c03": '/static/assets/images/login-split/登录页_r03_c03.png',
    "r03_c04": '/static/assets/images/login-split/登录页_r03_c04.png',
    "r04_c01": '/static/assets/images/login-split/登录页_r04_c01.png',
    "r04_c02": '/static/assets/images/login-split/登录页_r04_c02.png',
    "r04_c03": '/static/assets/images/login-split/登录页_r04_c03.png',
    "r04_c04": '/static/assets/images/login-split/登录页_r04_c04.png',
    "r05_c01": '/static/assets/images/login-split/登录页_r05_c01.png',
    "r06_c01": '/static/assets/images/login-split/登录页_r06_c01.png',
    "r06_c02": '/static/assets/images/login-split/登录页_r06_c02.png',
    "r06_c03": '/static/assets/images/login-split/登录页_r06_c03.png',
    "r06_c04": '/static/assets/images/login-split/登录页_r06_c04.png',
    "r07_c01": '/static/assets/images/login-split/登录页_r07_c01.png',
    "r07_c02": '/static/assets/images/login-split/登录页_r07_c02.png',
    "r07_c03": '/static/assets/images/login-split/登录页_r07_c03.png',
    "r07_c04": '/static/assets/images/login-split/登录页_r07_c04.png',
    "r08_c01": '/static/assets/images/login-split/登录页_r08_c01.png',
    "r08_c02": '/static/assets/images/login-split/登录页_r08_c02.png',
    "r08_c03": '/static/assets/images/login-split/登录页_r08_c03.png',
    "r08_c04": '/static/assets/images/login-split/登录页_r08_c04.png',
    "r09_c01": '/static/assets/images/login-split/登录页_r09_c01.png',
    "r10_c01": '/static/assets/images/login-split/登录页_r10_c01.png',
    "r10_c02": '/static/assets/images/login-split/登录页_r10_c02.png',
    "r10_c03": '/static/assets/images/login-split/登录页_r10_c03.png',
    "r10_c04": '/static/assets/images/login-split/登录页_r10_c04.png',
    "r11_c01": '/static/assets/images/login-split/登录页_r11_c01.png',
    "r11_c02": '/static/assets/images/login-split/登录页_r11_c02.png',
    "r11_c03": '/static/assets/images/login-split/登录页_r11_c03.png',
    "r11_c04": '/static/assets/images/login-split/登录页_r11_c04.png',
    "r12_c01": '/static/assets/images/login-split/登录页_r12_c01.png',
    "r12_c02": '/static/assets/images/login-split/登录页_r12_c02.png',
    "r12_c03": '/static/assets/images/login-split/登录页_r12_c03.png',
    "r12_c04": '/static/assets/images/login-split/登录页_r12_c04.png',
    "r13_c01": '/static/assets/images/login-split/登录页_r13_c01.png',
    "r13_c02": '/static/assets/images/login-split/登录页_r13_c02.png',
    "r13_c03": '/static/assets/images/login-split/登录页_r13_c03.png',
    "r13_c04": '/static/assets/images/login-split/登录页_r13_c04.png',
    "r14_c01": '/static/assets/images/login-split/登录页_r14_c01.png',
    "r14_c02": '/static/assets/images/login-split/登录页_r14_c02.png',
    "r14_c03": '/static/assets/images/login-split/登录页_r14_c03.png',
    "r14_c04": '/static/assets/images/login-split/登录页_r14_c04.png',
    "r15_c01": '/static/assets/images/login-split/登录页_r15_c01.png',
    "r15_c02": '/static/assets/images/login-split/登录页_r15_c02.png',
    "r15_c03": '/static/assets/images/login-split/登录页_r15_c03.png',
    "r15_c04": '/static/assets/images/login-split/登录页_r15_c04.png',
    "r16_c01": '/static/assets/images/login-split/登录页_r16_c01.png',
  },

  /** 消息页拆分素材（素材/消息/最终/拆分图标_消息） */
  MESSAGES_SPLIT: {
    "r01_c01": '/static/assets/images/messages-split/消息_r01_c01.png',
    "r01_c02": '/static/assets/images/messages-split/消息_r01_c02.png',
    "r02_c01": '/static/assets/images/messages-split/消息_r02_c01.png',
    "r02_c02": '/static/assets/images/messages-split/消息_r02_c02.png',
    "r02_c03": '/static/assets/images/messages-split/消息_r02_c03.png',
    "r02_c04": '/static/assets/images/messages-split/消息_r02_c04.png',
    "r02_c05": '/static/assets/images/messages-split/消息_r02_c05.png',
    "r02_c06": '/static/assets/images/messages-split/消息_r02_c06.png',
    "r02_c07": '/static/assets/images/messages-split/消息_r02_c07.png',
    "r02_c08": '/static/assets/images/messages-split/消息_r02_c08.png',
    "r02_c09": '/static/assets/images/messages-split/消息_r02_c09.png',
    "r03_c01": '/static/assets/images/messages-split/消息_r03_c01.png',
    "r03_c02": '/static/assets/images/messages-split/消息_r03_c02.png',
    "r03_c03": '/static/assets/images/messages-split/消息_r03_c03.png',
    "r03_c04": '/static/assets/images/messages-split/消息_r03_c04.png',
    "r04_c01": '/static/assets/images/messages-split/消息_r04_c01.png',
    "r04_c02": '/static/assets/images/messages-split/消息_r04_c02.png',
    "r04_c03": '/static/assets/images/messages-split/消息_r04_c03.png',
    "r04_c04": '/static/assets/images/messages-split/消息_r04_c04.png',
    "r04_c05": '/static/assets/images/messages-split/消息_r04_c05.png',
    "r04_c06": '/static/assets/images/messages-split/消息_r04_c06.png',
    "r04_c07": '/static/assets/images/messages-split/消息_r04_c07.png',
    "r04_c08": '/static/assets/images/messages-split/消息_r04_c08.png',
    "r04_c09": '/static/assets/images/messages-split/消息_r04_c09.png',
    "r04_c10": '/static/assets/images/messages-split/消息_r04_c10.png',
    "r04_c11": '/static/assets/images/messages-split/消息_r04_c11.png',
    "r04_c12": '/static/assets/images/messages-split/消息_r04_c12.png',
    "r05_c01": '/static/assets/images/messages-split/消息_r05_c01.png',
    "r05_c02": '/static/assets/images/messages-split/消息_r05_c02.png',
    "r06_c01": '/static/assets/images/messages-split/消息_r06_c01.png',
    "r06_c02": '/static/assets/images/messages-split/消息_r06_c02.png',
    "r06_c03": '/static/assets/images/messages-split/消息_r06_c03.png',
    "r06_c04": '/static/assets/images/messages-split/消息_r06_c04.png',
    "r06_c05": '/static/assets/images/messages-split/消息_r06_c05.png',
    "r06_c06": '/static/assets/images/messages-split/消息_r06_c06.png',
    "r06_c07": '/static/assets/images/messages-split/消息_r06_c07.png',
    "r06_c08": '/static/assets/images/messages-split/消息_r06_c08.png',
    "r06_c09": '/static/assets/images/messages-split/消息_r06_c09.png',
    "r06_c10": '/static/assets/images/messages-split/消息_r06_c10.png',
    "r06_c11": '/static/assets/images/messages-split/消息_r06_c11.png',
    "r07_c01": '/static/assets/images/messages-split/消息_r07_c01.png',
    "r07_c02": '/static/assets/images/messages-split/消息_r07_c02.png',
    "r08_c01": '/static/assets/images/messages-split/消息_r08_c01.png',
    "r08_c02": '/static/assets/images/messages-split/消息_r08_c02.png',
    "r08_c03": '/static/assets/images/messages-split/消息_r08_c03.png',
    "r08_c04": '/static/assets/images/messages-split/消息_r08_c04.png',
    "r08_c05": '/static/assets/images/messages-split/消息_r08_c05.png',
    "r08_c06": '/static/assets/images/messages-split/消息_r08_c06.png',
    "r08_c07": '/static/assets/images/messages-split/消息_r08_c07.png',
    "r08_c08": '/static/assets/images/messages-split/消息_r08_c08.png',
    "r08_c09": '/static/assets/images/messages-split/消息_r08_c09.png',
    "r08_c10": '/static/assets/images/messages-split/消息_r08_c10.png',
    "r08_c11": '/static/assets/images/messages-split/消息_r08_c11.png',
    "r08_c12": '/static/assets/images/messages-split/消息_r08_c12.png',
    "r09_c01": '/static/assets/images/messages-split/消息_r09_c01.png',
    "r09_c02": '/static/assets/images/messages-split/消息_r09_c02.png',
    "r09_c03": '/static/assets/images/messages-split/消息_r09_c03.png',
    "r10_c01": '/static/assets/images/messages-split/消息_r10_c01.png',
    "r10_c02": '/static/assets/images/messages-split/消息_r10_c02.png',
    "r10_c03": '/static/assets/images/messages-split/消息_r10_c03.png',
    "r10_c04": '/static/assets/images/messages-split/消息_r10_c04.png',
    "r10_c05": '/static/assets/images/messages-split/消息_r10_c05.png',
    "r10_c06": '/static/assets/images/messages-split/消息_r10_c06.png',
    "r11_c01": '/static/assets/images/messages-split/消息_r11_c01.png',
    "r11_c02": '/static/assets/images/messages-split/消息_r11_c02.png',
    "r11_c03": '/static/assets/images/messages-split/消息_r11_c03.png',
    "r12_c01": '/static/assets/images/messages-split/消息_r12_c01.png',
    "r12_c02": '/static/assets/images/messages-split/消息_r12_c02.png',
    "r12_c03": '/static/assets/images/messages-split/消息_r12_c03.png',
    "r12_c04": '/static/assets/images/messages-split/消息_r12_c04.png',
    "r12_c05": '/static/assets/images/messages-split/消息_r12_c05.png',
    "r12_c06": '/static/assets/images/messages-split/消息_r12_c06.png',
    "r12_c07": '/static/assets/images/messages-split/消息_r12_c07.png',
    "r12_c08": '/static/assets/images/messages-split/消息_r12_c08.png',
    "r12_c09": '/static/assets/images/messages-split/消息_r12_c09.png',
    "r12_c10": '/static/assets/images/messages-split/消息_r12_c10.png',
    "r13_c01": '/static/assets/images/messages-split/消息_r13_c01.png',
    "r13_c02": '/static/assets/images/messages-split/消息_r13_c02.png',
    "r13_c03": '/static/assets/images/messages-split/消息_r13_c03.png',
    "r14_c01": '/static/assets/images/messages-split/消息_r14_c01.png',
    "r14_c02": '/static/assets/images/messages-split/消息_r14_c02.png',
    "r14_c03": '/static/assets/images/messages-split/消息_r14_c03.png',
    "r14_c04": '/static/assets/images/messages-split/消息_r14_c04.png',
    "r14_c05": '/static/assets/images/messages-split/消息_r14_c05.png',
    "r14_c06": '/static/assets/images/messages-split/消息_r14_c06.png',
    "r14_c07": '/static/assets/images/messages-split/消息_r14_c07.png',
    "r14_c08": '/static/assets/images/messages-split/消息_r14_c08.png',
    "r14_c09": '/static/assets/images/messages-split/消息_r14_c09.png',
    "r14_c10": '/static/assets/images/messages-split/消息_r14_c10.png',
    "r14_c11": '/static/assets/images/messages-split/消息_r14_c11.png',
    "r15_c01": '/static/assets/images/messages-split/消息_r15_c01.png',
    "r16_c01": '/static/assets/images/messages-split/消息_r16_c01.png',
    "r16_c02": '/static/assets/images/messages-split/消息_r16_c02.png',
    "r16_c03": '/static/assets/images/messages-split/消息_r16_c03.png',
    "r16_c04": '/static/assets/images/messages-split/消息_r16_c04.png',
    "r16_c05": '/static/assets/images/messages-split/消息_r16_c05.png',
    "r16_c06": '/static/assets/images/messages-split/消息_r16_c06.png',
    "r16_c07": '/static/assets/images/messages-split/消息_r16_c07.png',
    "r17_c01": '/static/assets/images/messages-split/消息_r17_c01.png',
    "r17_c02": '/static/assets/images/messages-split/消息_r17_c02.png',
    "r18_c01": '/static/assets/images/messages-split/消息_r18_c01.png',
    "r18_c02": '/static/assets/images/messages-split/消息_r18_c02.png',
    "r18_c03": '/static/assets/images/messages-split/消息_r18_c03.png',
    "r18_c04": '/static/assets/images/messages-split/消息_r18_c04.png',
    "r18_c05": '/static/assets/images/messages-split/消息_r18_c05.png',
    "r18_c06": '/static/assets/images/messages-split/消息_r18_c06.png',
    "r18_c07": '/static/assets/images/messages-split/消息_r18_c07.png',
    "r18_c08": '/static/assets/images/messages-split/消息_r18_c08.png',
    "r19_c01": '/static/assets/images/messages-split/消息_r19_c01.png',
    "r19_c02": '/static/assets/images/messages-split/消息_r19_c02.png',
    "r20_c01": '/static/assets/images/messages-split/消息_r20_c01.png',
    "r20_c02": '/static/assets/images/messages-split/消息_r20_c02.png',
    "r20_c03": '/static/assets/images/messages-split/消息_r20_c03.png',
    "r20_c04": '/static/assets/images/messages-split/消息_r20_c04.png',
  },

  /** 个人主页拆分素材 */
  PROFILE_SELF_SPLIT: {
    "主页_个人_r01_c01": '/static/assets/images/profile-self-split/主页_个人_r01_c01.png',
    "主页_个人_r01_c02": '/static/assets/images/profile-self-split/主页_个人_r01_c02.png',
    "主页_个人_r01_c03": '/static/assets/images/profile-self-split/主页_个人_r01_c03.png',
    "主页_个人_r02_c01": '/static/assets/images/profile-self-split/主页_个人_r02_c01.png',
    "主页_个人_r02_c02": '/static/assets/images/profile-self-split/主页_个人_r02_c02.png',
    "主页_个人_r02_c03": '/static/assets/images/profile-self-split/主页_个人_r02_c03.png',
    "主页_个人_r02_c04": '/static/assets/images/profile-self-split/主页_个人_r02_c04.png',
    "主页_个人_r02_c05": '/static/assets/images/profile-self-split/主页_个人_r02_c05.png',
    "主页_个人_r03_c01": '/static/assets/images/profile-self-split/主页_个人_r03_c01.png',
    "主页_个人_r03_c02": '/static/assets/images/profile-self-split/主页_个人_r03_c02.png',
    "主页_个人_r03_c03": '/static/assets/images/profile-self-split/主页_个人_r03_c03.png',
    "主页_个人_r03_c04": '/static/assets/images/profile-self-split/主页_个人_r03_c04.png',
    "主页_个人_r04_c01": '/static/assets/images/profile-self-split/主页_个人_r04_c01.png',
    "主页_个人_r05_c01": '/static/assets/images/profile-self-split/主页_个人_r05_c01.png',
    "主页_个人_r06_c01": '/static/assets/images/profile-self-split/主页_个人_r06_c01.png',
    "主页_个人_r06_c02": '/static/assets/images/profile-self-split/主页_个人_r06_c02.png',
    "主页_个人_r06_c03": '/static/assets/images/profile-self-split/主页_个人_r06_c03.png',
    "主页_个人_r06_c04": '/static/assets/images/profile-self-split/主页_个人_r06_c04.png',
    "主页_个人_r06_c05": '/static/assets/images/profile-self-split/主页_个人_r06_c05.png',
    "主页_个人_r07_c01": '/static/assets/images/profile-self-split/主页_个人_r07_c01.png',
    "主页_个人_r07_c02": '/static/assets/images/profile-self-split/主页_个人_r07_c02.png',
    "主页_个人_r07_c03": '/static/assets/images/profile-self-split/主页_个人_r07_c03.png',
    "主页_个人_r07_c04": '/static/assets/images/profile-self-split/主页_个人_r07_c04.png',
    "主页_个人_r08_c01": '/static/assets/images/profile-self-split/主页_个人_r08_c01.png',
    "主页_个人_r08_c02": '/static/assets/images/profile-self-split/主页_个人_r08_c02.png',
    "主页_个人_r08_c03": '/static/assets/images/profile-self-split/主页_个人_r08_c03.png',
    "主页_个人_r08_c04": '/static/assets/images/profile-self-split/主页_个人_r08_c04.png',
    "主页_个人_r08_c05": '/static/assets/images/profile-self-split/主页_个人_r08_c05.png',
    "图标预览_联系表": '/static/assets/images/profile-self-split/图标预览_联系表.png',
  },

  /** 他人主页1拆分素材 */
  PROFILE_OTHER1_SPLIT: {
    "主页_他人1_r01_c01": '/static/assets/images/profile-other1-split/主页_他人1_r01_c01.png',
    "主页_他人1_r01_c02": '/static/assets/images/profile-other1-split/主页_他人1_r01_c02.png',
    "主页_他人1_r01_c03": '/static/assets/images/profile-other1-split/主页_他人1_r01_c03.png',
    "主页_他人1_r01_c04": '/static/assets/images/profile-other1-split/主页_他人1_r01_c04.png',
    "主页_他人1_r01_c05": '/static/assets/images/profile-other1-split/主页_他人1_r01_c05.png',
    "主页_他人1_r01_c06": '/static/assets/images/profile-other1-split/主页_他人1_r01_c06.png',
    "主页_他人1_r01_c07": '/static/assets/images/profile-other1-split/主页_他人1_r01_c07.png',
    "主页_他人1_r01_c08": '/static/assets/images/profile-other1-split/主页_他人1_r01_c08.png',
    "主页_他人1_r02_c01": '/static/assets/images/profile-other1-split/主页_他人1_r02_c01.png',
    "主页_他人1_r02_c02": '/static/assets/images/profile-other1-split/主页_他人1_r02_c02.png',
    "主页_他人1_r02_c03": '/static/assets/images/profile-other1-split/主页_他人1_r02_c03.png',
    "主页_他人1_r02_c04": '/static/assets/images/profile-other1-split/主页_他人1_r02_c04.png',
    "主页_他人1_r02_c05": '/static/assets/images/profile-other1-split/主页_他人1_r02_c05.png',
    "主页_他人1_r02_c06": '/static/assets/images/profile-other1-split/主页_他人1_r02_c06.png',
    "主页_他人1_r03_c01": '/static/assets/images/profile-other1-split/主页_他人1_r03_c01.png',
    "主页_他人1_r03_c02": '/static/assets/images/profile-other1-split/主页_他人1_r03_c02.png',
    "主页_他人1_r03_c03": '/static/assets/images/profile-other1-split/主页_他人1_r03_c03.png',
    "主页_他人1_r03_c04": '/static/assets/images/profile-other1-split/主页_他人1_r03_c04.png',
    "主页_他人1_r03_c05": '/static/assets/images/profile-other1-split/主页_他人1_r03_c05.png',
    "主页_他人1_r03_c06": '/static/assets/images/profile-other1-split/主页_他人1_r03_c06.png',
    "主页_他人1_r04_c01": '/static/assets/images/profile-other1-split/主页_他人1_r04_c01.png',
    "主页_他人1_r04_c02": '/static/assets/images/profile-other1-split/主页_他人1_r04_c02.png',
    "主页_他人1_r04_c03": '/static/assets/images/profile-other1-split/主页_他人1_r04_c03.png',
    "主页_他人1_r04_c04": '/static/assets/images/profile-other1-split/主页_他人1_r04_c04.png',
    "主页_他人1_r05_c01": '/static/assets/images/profile-other1-split/主页_他人1_r05_c01.png',
    "主页_他人1_r05_c02": '/static/assets/images/profile-other1-split/主页_他人1_r05_c02.png',
    "主页_他人1_r05_c03": '/static/assets/images/profile-other1-split/主页_他人1_r05_c03.png',
    "主页_他人1_r05_c04": '/static/assets/images/profile-other1-split/主页_他人1_r05_c04.png',
    "主页_他人1_r05_c05": '/static/assets/images/profile-other1-split/主页_他人1_r05_c05.png',
    "主页_他人1_r05_c06": '/static/assets/images/profile-other1-split/主页_他人1_r05_c06.png',
    "主页_他人1_r05_c07": '/static/assets/images/profile-other1-split/主页_他人1_r05_c07.png',
    "主页_他人1_r05_c08": '/static/assets/images/profile-other1-split/主页_他人1_r05_c08.png',
    "主页_他人1_r05_c09": '/static/assets/images/profile-other1-split/主页_他人1_r05_c09.png',
    "主页_他人1_r06_c01": '/static/assets/images/profile-other1-split/主页_他人1_r06_c01.png',
    "主页_他人1_r06_c02": '/static/assets/images/profile-other1-split/主页_他人1_r06_c02.png',
    "主页_他人1_r06_c03": '/static/assets/images/profile-other1-split/主页_他人1_r06_c03.png',
    "主页_他人1_r06_c04": '/static/assets/images/profile-other1-split/主页_他人1_r06_c04.png',
    "主页_他人1_r06_c05": '/static/assets/images/profile-other1-split/主页_他人1_r06_c05.png',
    "主页_他人1_r06_c06": '/static/assets/images/profile-other1-split/主页_他人1_r06_c06.png',
    "主页_他人1_r06_c07": '/static/assets/images/profile-other1-split/主页_他人1_r06_c07.png',
    "主页_他人1_r07_c01": '/static/assets/images/profile-other1-split/主页_他人1_r07_c01.png',
    "主页_他人1_r07_c02": '/static/assets/images/profile-other1-split/主页_他人1_r07_c02.png',
    "主页_他人1_r07_c03": '/static/assets/images/profile-other1-split/主页_他人1_r07_c03.png',
    "主页_他人1_r07_c04": '/static/assets/images/profile-other1-split/主页_他人1_r07_c04.png',
    "主页_他人1_r07_c05": '/static/assets/images/profile-other1-split/主页_他人1_r07_c05.png',
    "主页_他人1_r07_c06": '/static/assets/images/profile-other1-split/主页_他人1_r07_c06.png',
    "主页_他人1_r07_c07": '/static/assets/images/profile-other1-split/主页_他人1_r07_c07.png',
    "主页_他人1_r07_c08": '/static/assets/images/profile-other1-split/主页_他人1_r07_c08.png',
    "主页_他人1_r07_c09": '/static/assets/images/profile-other1-split/主页_他人1_r07_c09.png',
    "主页_他人1_r08_c01": '/static/assets/images/profile-other1-split/主页_他人1_r08_c01.png',
    "主页_他人1_r08_c02": '/static/assets/images/profile-other1-split/主页_他人1_r08_c02.png',
    "主页_他人1_r08_c03": '/static/assets/images/profile-other1-split/主页_他人1_r08_c03.png',
    "主页_他人1_r08_c04": '/static/assets/images/profile-other1-split/主页_他人1_r08_c04.png',
    "主页_他人1_r08_c05": '/static/assets/images/profile-other1-split/主页_他人1_r08_c05.png',
    "主页_他人1_r09_c01": '/static/assets/images/profile-other1-split/主页_他人1_r09_c01.png',
    "主页_他人1_r09_c02": '/static/assets/images/profile-other1-split/主页_他人1_r09_c02.png',
    "主页_他人1_r09_c03": '/static/assets/images/profile-other1-split/主页_他人1_r09_c03.png',
    "主页_他人1_r09_c04": '/static/assets/images/profile-other1-split/主页_他人1_r09_c04.png',
    "主页_他人1_r09_c05": '/static/assets/images/profile-other1-split/主页_他人1_r09_c05.png',
    "主页_他人1_r09_c06": '/static/assets/images/profile-other1-split/主页_他人1_r09_c06.png',
    "主页_他人1_r09_c07": '/static/assets/images/profile-other1-split/主页_他人1_r09_c07.png',
    "主页_他人1_r09_c08": '/static/assets/images/profile-other1-split/主页_他人1_r09_c08.png',
    "主页_他人1_r09_c09": '/static/assets/images/profile-other1-split/主页_他人1_r09_c09.png',
    "主页_他人1_r09_c10": '/static/assets/images/profile-other1-split/主页_他人1_r09_c10.png',
    "图标预览_联系表": '/static/assets/images/profile-other1-split/图标预览_联系表.png',
  },

  /** 他人主页2拆分素材 */
  PROFILE_OTHER2_SPLIT: {
    "主页_他人2_r01_c01": '/static/assets/images/profile-other2-split/主页_他人2_r01_c01.png',
    "主页_他人2_r01_c02": '/static/assets/images/profile-other2-split/主页_他人2_r01_c02.png',
    "主页_他人2_r01_c03": '/static/assets/images/profile-other2-split/主页_他人2_r01_c03.png',
    "主页_他人2_r01_c04": '/static/assets/images/profile-other2-split/主页_他人2_r01_c04.png',
    "主页_他人2_r01_c05": '/static/assets/images/profile-other2-split/主页_他人2_r01_c05.png',
    "主页_他人2_r02_c01": '/static/assets/images/profile-other2-split/主页_他人2_r02_c01.png',
    "主页_他人2_r02_c02": '/static/assets/images/profile-other2-split/主页_他人2_r02_c02.png',
    "主页_他人2_r02_c03": '/static/assets/images/profile-other2-split/主页_他人2_r02_c03.png',
    "主页_他人2_r02_c04": '/static/assets/images/profile-other2-split/主页_他人2_r02_c04.png',
    "主页_他人2_r02_c05": '/static/assets/images/profile-other2-split/主页_他人2_r02_c05.png',
    "主页_他人2_r02_c06": '/static/assets/images/profile-other2-split/主页_他人2_r02_c06.png',
    "主页_他人2_r03_c01": '/static/assets/images/profile-other2-split/主页_他人2_r03_c01.png',
    "主页_他人2_r03_c02": '/static/assets/images/profile-other2-split/主页_他人2_r03_c02.png',
    "主页_他人2_r03_c03": '/static/assets/images/profile-other2-split/主页_他人2_r03_c03.png',
    "主页_他人2_r04_c01": '/static/assets/images/profile-other2-split/主页_他人2_r04_c01.png',
    "主页_他人2_r04_c02": '/static/assets/images/profile-other2-split/主页_他人2_r04_c02.png',
    "主页_他人2_r04_c03": '/static/assets/images/profile-other2-split/主页_他人2_r04_c03.png',
    "主页_他人2_r05_c01": '/static/assets/images/profile-other2-split/主页_他人2_r05_c01.png',
    "主页_他人2_r05_c02": '/static/assets/images/profile-other2-split/主页_他人2_r05_c02.png',
    "主页_他人2_r05_c03": '/static/assets/images/profile-other2-split/主页_他人2_r05_c03.png',
    "主页_他人2_r05_c04": '/static/assets/images/profile-other2-split/主页_他人2_r05_c04.png',
    "主页_他人2_r06_c01": '/static/assets/images/profile-other2-split/主页_他人2_r06_c01.png',
    "主页_他人2_r06_c02": '/static/assets/images/profile-other2-split/主页_他人2_r06_c02.png',
    "主页_他人2_r06_c03": '/static/assets/images/profile-other2-split/主页_他人2_r06_c03.png',
    "主页_他人2_r06_c04": '/static/assets/images/profile-other2-split/主页_他人2_r06_c04.png',
    "主页_他人2_r06_c05": '/static/assets/images/profile-other2-split/主页_他人2_r06_c05.png',
    "主页_他人2_r06_c06": '/static/assets/images/profile-other2-split/主页_他人2_r06_c06.png',
    "主页_他人2_r06_c07": '/static/assets/images/profile-other2-split/主页_他人2_r06_c07.png',
    "主页_他人2_r06_c08": '/static/assets/images/profile-other2-split/主页_他人2_r06_c08.png',
    "主页_他人2_r06_c09": '/static/assets/images/profile-other2-split/主页_他人2_r06_c09.png',
    "主页_他人2_r07_c01": '/static/assets/images/profile-other2-split/主页_他人2_r07_c01.png',
    "主页_他人2_r07_c02": '/static/assets/images/profile-other2-split/主页_他人2_r07_c02.png',
    "主页_他人2_r07_c03": '/static/assets/images/profile-other2-split/主页_他人2_r07_c03.png',
    "主页_他人2_r07_c04": '/static/assets/images/profile-other2-split/主页_他人2_r07_c04.png',
    "主页_他人2_r07_c05": '/static/assets/images/profile-other2-split/主页_他人2_r07_c05.png',
    "主页_他人2_r07_c06": '/static/assets/images/profile-other2-split/主页_他人2_r07_c06.png',
    "主页_他人2_r07_c07": '/static/assets/images/profile-other2-split/主页_他人2_r07_c07.png',
    "主页_他人2_r07_c08": '/static/assets/images/profile-other2-split/主页_他人2_r07_c08.png',
    "图标预览_联系表": '/static/assets/images/profile-other2-split/图标预览_联系表.png',
  },

  /** 匹配页拆分素材 */
  MATCH_SPLIT: {
    "匹配_r01_c01": '/static/assets/images/match-split/匹配_r01_c01.png',
    "匹配_r01_c02": '/static/assets/images/match-split/匹配_r01_c02.png',
    "匹配_r01_c03": '/static/assets/images/match-split/匹配_r01_c03.png',
    "匹配_r02_c01": '/static/assets/images/match-split/匹配_r02_c01.png',
    "匹配_r02_c02": '/static/assets/images/match-split/匹配_r02_c02.png',
    "匹配_r02_c03": '/static/assets/images/match-split/匹配_r02_c03.png',
    "匹配_r02_c04": '/static/assets/images/match-split/匹配_r02_c04.png',
    "匹配_r02_c05": '/static/assets/images/match-split/匹配_r02_c05.png',
    "匹配_r02_c06": '/static/assets/images/match-split/匹配_r02_c06.png',
    "匹配_r03_c01": '/static/assets/images/match-split/匹配_r03_c01.png',
    "匹配_r03_c02": '/static/assets/images/match-split/匹配_r03_c02.png',
    "匹配_r04_c01": '/static/assets/images/match-split/匹配_r04_c01.png',
    "匹配_r04_c02": '/static/assets/images/match-split/匹配_r04_c02.png',
    "匹配_r04_c03": '/static/assets/images/match-split/匹配_r04_c03.png',
    "匹配_r05_c01": '/static/assets/images/match-split/匹配_r05_c01.png',
    "匹配_r05_c02": '/static/assets/images/match-split/匹配_r05_c02.png',
    "匹配_r05_c03": '/static/assets/images/match-split/匹配_r05_c03.png',
    "匹配_r05_c04": '/static/assets/images/match-split/匹配_r05_c04.png',
    "匹配_r05_c05": '/static/assets/images/match-split/匹配_r05_c05.png',
    "匹配_r05_c06": '/static/assets/images/match-split/匹配_r05_c06.png',
    "匹配_r05_c07": '/static/assets/images/match-split/匹配_r05_c07.png',
    "匹配_r05_c08": '/static/assets/images/match-split/匹配_r05_c08.png',
    "匹配_r06_c01": '/static/assets/images/match-split/匹配_r06_c01.png',
    "匹配_r06_c02": '/static/assets/images/match-split/匹配_r06_c02.png',
    "匹配_r07_c01": '/static/assets/images/match-split/匹配_r07_c01.png',
    "匹配_r07_c02": '/static/assets/images/match-split/匹配_r07_c02.png',
    "匹配_r07_c03": '/static/assets/images/match-split/匹配_r07_c03.png',
    "匹配_r07_c04": '/static/assets/images/match-split/匹配_r07_c04.png',
    "匹配_r07_c05": '/static/assets/images/match-split/匹配_r07_c05.png',
    "匹配_r08_c01": '/static/assets/images/match-split/匹配_r08_c01.png',
    "匹配_r08_c02": '/static/assets/images/match-split/匹配_r08_c02.png',
    "匹配_r08_c03": '/static/assets/images/match-split/匹配_r08_c03.png',
    "匹配_r08_c04": '/static/assets/images/match-split/匹配_r08_c04.png',
    "匹配_r09_c01": '/static/assets/images/match-split/匹配_r09_c01.png',
    "匹配_r09_c02": '/static/assets/images/match-split/匹配_r09_c02.png',
    "匹配_r09_c03": '/static/assets/images/match-split/匹配_r09_c03.png',
    "匹配_r10_c01": '/static/assets/images/match-split/匹配_r10_c01.png',
    "匹配_r10_c02": '/static/assets/images/match-split/匹配_r10_c02.png',
    "匹配_r10_c03": '/static/assets/images/match-split/匹配_r10_c03.png',
    "匹配_r10_c04": '/static/assets/images/match-split/匹配_r10_c04.png',
    "匹配_r10_c05": '/static/assets/images/match-split/匹配_r10_c05.png',
    "匹配_r10_c06": '/static/assets/images/match-split/匹配_r10_c06.png',
    "匹配_r10_c07": '/static/assets/images/match-split/匹配_r10_c07.png',
    "匹配_r10_c08": '/static/assets/images/match-split/匹配_r10_c08.png',
    "匹配_r10_c09": '/static/assets/images/match-split/匹配_r10_c09.png',
    "匹配_r10_c10": '/static/assets/images/match-split/匹配_r10_c10.png',
    "匹配_r11_c01": '/static/assets/images/match-split/匹配_r11_c01.png',
    "匹配_r11_c02": '/static/assets/images/match-split/匹配_r11_c02.png',
    "匹配_r11_c03": '/static/assets/images/match-split/匹配_r11_c03.png',
    "匹配_r12_c01": '/static/assets/images/match-split/匹配_r12_c01.png',
    "匹配_r12_c02": '/static/assets/images/match-split/匹配_r12_c02.png',
    "匹配_r12_c03": '/static/assets/images/match-split/匹配_r12_c03.png',
    "匹配_r12_c04": '/static/assets/images/match-split/匹配_r12_c04.png',
    "匹配_r12_c05": '/static/assets/images/match-split/匹配_r12_c05.png',
    "匹配_r12_c06": '/static/assets/images/match-split/匹配_r12_c06.png',
    "匹配_r12_c07": '/static/assets/images/match-split/匹配_r12_c07.png',
    "匹配_r13_c01": '/static/assets/images/match-split/匹配_r13_c01.png',
    "匹配_r13_c02": '/static/assets/images/match-split/匹配_r13_c02.png',
    "匹配_r13_c03": '/static/assets/images/match-split/匹配_r13_c03.png',
    "匹配_r13_c04": '/static/assets/images/match-split/匹配_r13_c04.png',
    "匹配_r14_c01": '/static/assets/images/match-split/匹配_r14_c01.png',
    "匹配_r14_c02": '/static/assets/images/match-split/匹配_r14_c02.png',
    "匹配_r14_c03": '/static/assets/images/match-split/匹配_r14_c03.png',
    "匹配_r15_c01": '/static/assets/images/match-split/匹配_r15_c01.png',
    "匹配_r15_c02": '/static/assets/images/match-split/匹配_r15_c02.png',
    "匹配_r16_c01": '/static/assets/images/match-split/匹配_r16_c01.png',
    "匹配_r16_c02": '/static/assets/images/match-split/匹配_r16_c02.png',
    "匹配_r16_c03": '/static/assets/images/match-split/匹配_r16_c03.png',
    "匹配_r16_c04": '/static/assets/images/match-split/匹配_r16_c04.png',
    "匹配_r16_c05": '/static/assets/images/match-split/匹配_r16_c05.png',
    "图标预览_联系表": '/static/assets/images/match-split/图标预览_联系表.png',
  },
} as const;






