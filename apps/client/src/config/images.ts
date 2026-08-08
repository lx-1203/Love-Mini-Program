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
  },
} as const;
