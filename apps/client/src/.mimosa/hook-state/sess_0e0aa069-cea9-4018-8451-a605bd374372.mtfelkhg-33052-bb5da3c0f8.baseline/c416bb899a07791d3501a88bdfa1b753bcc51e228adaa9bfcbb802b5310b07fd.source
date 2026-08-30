/**
 * UI 限制与网络参数魔法数字常量 (SubTask 3.5.4)
 *
 * 集中维护跨模块复用的「魔法数字」：
 *   - UI_LIMITS：UI 数量限制（图片张数 / 标签数 / 文本长度等）
 *   - API_TIMEOUT：HTTP 请求超时（默认 / AI / 上传 / 长轮询）
 *   - WS_RECONNECT：WebSocket 重连参数
 *   - DEBOUNCE：常见防抖延迟
 *
 * 设计目标：
 *   1. 消除业务代码中的硬编码数字（如 photoGallery.slice(0, 6)）
 *   2. 集中审计调整点（如调整图片上限只需修改一处）
 *   3. 命名见名知意，避免裸数字的歧义
 *
 * 注意：模块专属常量（如 match.ts 的 SWIPE_THRESHOLD）保持在各自文件，
 *      本文件仅收录跨模块复用或全局基础设施级别的魔法数字。
 */

/* ========== UI 数量限制 ========== */

/**
 * UI 数量限制集合。
 *
 * 与后端校验保持一致（如照片墙 6 张上限），
 * 客户端提前拦截避免无效请求。
 */
export const UI_LIMITS = {
  /** 照片墙最大图片数量（与后端校验一致） */
  PHOTO_GALLERY_MAX: 6,

  /** 单次发送最大图片数量 */
  MESSAGE_MAX_IMAGES: 9,

  /** 帖子最大图片数量 */
  POST_MAX_IMAGES: 9,

  /** 预置话题标签最大选择数 */
  MAX_PRESET_TAGS: 3,

  /** 自定义话题标签最大数量 */
  MAX_CUSTOM_TAGS: 5,

  /** 单条消息最大长度（字符） */
  MESSAGE_MAX_LENGTH: 1000,

  /** 帖子内容最大长度（字符） */
  POST_MAX_LENGTH: 1000,

  /** 反馈内容最大长度（字符） */
  FEEDBACK_MAX_LENGTH: 500,

  /** 反馈附件最大数量 */
  FEEDBACK_MAX_ATTACHMENTS: 4,

  /** 个人简介最大长度（字符） */
  BIO_MAX_LENGTH: 200,

  /** 昵称最大长度（字符） */
  NICKNAME_MAX_LENGTH: 20,

  /** 自我介绍最大长度（字符） */
  INTRO_MAX_LENGTH: 500,

  /** 标签最大长度（字符） */
  TAG_MAX_LENGTH: 12,
} as const;

/* ========== 媒体上传限制 ========== */

/**
 * 媒体上传大小限制（字节）。
 *
 * 与项目硬约束保持一致：
 *   - 图片 ≤10MB
 *   - 视频 ≤50MB
 */
export const MEDIA_LIMITS = {
  /** 单张图片最大大小（10MB） */
  IMAGE_MAX_SIZE_BYTES: 10 * 1024 * 1024,

  /** 单个视频最大大小（50MB） */
  VIDEO_MAX_SIZE_BYTES: 50 * 1024 * 1024,

  /** 头像最大大小（5MB，比图片上限更严格） */
  AVATAR_MAX_SIZE_BYTES: 5 * 1024 * 1024,

  /** 允许的图片 MIME 类型 */
  IMAGE_MIME_TYPES: ["image/jpeg", "image/png", "image/webp", "image/gif"],

  /** 允许的视频 MIME 类型 */
  VIDEO_MIME_TYPES: ["video/mp4", "video/webm"],

  /** 图片压缩质量（0-100） */
  IMAGE_COMPRESS_QUALITY: 80,
} as const;

/* ========== HTTP 请求超时 ========== */

/**
 * HTTP 请求超时集合（毫秒）。
 *
 * 不同接口类型使用不同超时，避免长耗时接口被默认 10s 超时误判。
 */
export const API_TIMEOUT = {
  /** 默认请求超时（普通接口） */
  DEFAULT_MS: 10000,

  /** AI 接口超时（视频/图片生成耗时较长） */
  AI_MS: 30000,

  /** 文件上传超时（大文件 + 弱网） */
  UPLOAD_MS: 60000,

  /** 长轮询接口超时 */
  LONG_POLL_MS: 30000,

  /** 微信登录超时（wx.login） */
  WECHAT_LOGIN_MS: 15000,

  /** 网络层错误重试次数（不含首次请求） */
  RETRY_COUNT: 1,

  /** 重试延迟起始（毫秒，指数退避） */
  RETRY_DELAY_MS: 500,

  /** 401 自动重试最大次数（避免死循环） */
  MAX_401_RETRY: 1,
} as const;

/* ========== WebSocket 重连参数 ========== */

/**
 * WebSocket 重连参数集合。
 *
 * 与 services/websocket/constants.ts 中的常量保持一致，
 * 本集合作为统一外部引用入口。
 */
export const WS_RECONNECT = {
  /** 最大重连次数 */
  MAX_ATTEMPTS: 5,

  /** 重连间隔（毫秒，固定 3 秒） */
  INTERVAL_MS: 3000,

  /** 心跳间隔（毫秒） */
  HEARTBEAT_INTERVAL_MS: 30000,

  /** 心跳超时（毫秒） */
  HEARTBEAT_TIMEOUT_MS: 10000,
} as const;

/* ========== 防抖与节流 ========== */

/**
 * 常见防抖/节流延迟（毫秒）。
 *
 * 集中维护避免不同模块重复定义相同数值。
 */
export const DEBOUNCE = {
  /** 搜索输入防抖（300ms，与项目约定一致） */
  SEARCH_MS: 300,

  /** 自动保存防抖（500ms） */
  AUTOSAVE_MS: 500,

  /** 列表加载更多防抖（300ms） */
  LOAD_MORE_MS: 300,

  /** 滑动事件节流（16ms ≈ 60fps） */
  SCROLL_THROTTLE_MS: 16,

  /** 输入框验证防抖（500ms） */
  VALIDATION_MS: 500,

  /** 标签输入防抖（200ms） */
  TAG_INPUT_MS: 200,
} as const;

/* ========== 分页参数 ========== */

/**
 * 分页默认参数。
 *
 * 与后端 Spring Pageable 对齐（page 1-based, size 默认 20）。
 */
export const PAGINATION = {
  /** 默认页码（1-based） */
  DEFAULT_PAGE: 1,

  /** 默认每页条数 */
  DEFAULT_PAGE_SIZE: 20,

  /** 最大每页条数（防止客户端请求过大） */
  MAX_PAGE_SIZE: 100,

  /** 推荐列表默认每页条数 */
  RECOMMEND_PAGE_SIZE: 10,

  /** 消息列表默认每页条数 */
  MESSAGE_PAGE_SIZE: 50,
} as const;

/* ========== Toast 与动画时长 ========== */

/**
 * Toast 显示时长与动画时长（毫秒）。
 *
 * 与 UX 设计约定对齐：短提示 1.5s / 普通提示 2s / 重要提示 3s。
 */
export const TOAST_DURATION = {
  /** 短提示（如"已复制"） */
  SHORT_MS: 1500,

  /** 普通提示（如"保存成功"） */
  NORMAL_MS: 2000,

  /** 重要提示（如"网络错误"） */
  LONG_MS: 3000,

  /** 错误提示（需用户充分阅读） */
  ERROR_MS: 4000,
} as const;

/* ========== 跳转延迟 ========== */

/**
 * 页面跳转相关延迟（毫秒）。
 *
 * 通常用于在 Toast 显示后再跳转，避免 Toast 被新页面遮盖。
 */
export const NAVIGATION_DELAY = {
  /** 默认跳转延迟（先 Toast 后跳转） */
  DEFAULT_MS: 500,

  /** 登录跳转延迟（先 Toast 再 reLaunch） */
  LOGIN_REDIRECT_MS: 500,

  /** 发帖成功后返回延迟 */
  POST_SUCCESS_MS: 800,
} as const;
