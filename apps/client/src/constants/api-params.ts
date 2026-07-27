/**
 * API 协议参数常量 (SubTask 3.5.3)
 *
 * 集中维护 API 调用相关的协议参数，避免在业务代码中散落硬编码：
 *   - Bearer Token 前缀
 *   - 微信登录 code 参数名
 *   - WebSocket STOMP topic 前缀
 *   - HTTP 方法 / Content-Type
 *
 * 与 constants/api.ts 的关系：
 *   - api.ts 偏向 HTTP 请求层（超时/重试/状态码）
 *   - api-params.ts 偏向协议层（认证 scheme / WS destination / 参数名）
 *
 * 使用示例：
 *   import { AUTH_HEADER_PREFIX, WS_TOPICS } from "@/constants";
 *   headers[AUTH_HEADER_NAME] = AUTH_HEADER_PREFIX + token;
 *   wsClient.subscribe(WS_TOPICS.userQueue(userId, "messages"), cb);
 */

/* ========== 鉴权头参数 ========== */

/** 鉴权头字段名 */
export const AUTH_HEADER_NAME = "Authorization";

/** 鉴权头值前缀（与 Bearer Token 模式对齐，注意尾部空格） */
export const AUTH_HEADER_PREFIX = "Bearer ";

/** WebSocket 子协议前缀（小写，用于 Sec-WebSocket-Protocol 头） */
export const WS_AUTH_PROTOCOL_PREFIX = "bearer.";

/* ========== 微信登录参数 ========== */

/** 微信登录 API 端点（相对 apiBaseUrl） */
export const WECHAT_LOGIN_ENDPOINT = "/v1/auth/wechat";

/** 微信登录请求体中 code 字段名 */
export const WECHAT_LOGIN_CODE_FIELD = "code";

/** 微信登录请求体中 state 字段名（CSRF 防护） */
export const WECHAT_LOGIN_STATE_FIELD = "state";

/** 微信登录 state 本地存储 key */
export const WECHAT_LOGIN_STATE_STORAGE_KEY = "login:wechat:state";

/** 微信登录超时时间（毫秒） */
export const WECHAT_LOGIN_TIMEOUT_MS = 15000;

/** 微信登录 provider（uni.login 参数） */
export const WECHAT_LOGIN_PROVIDER = "weixin";

/* ========== HTTP 方法与 Content-Type ========== */

/** HTTP 方法枚举（字符串字面量联合类型） */
export const HTTP_METHODS = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  PATCH: "PATCH",
  DELETE: "DELETE",
} as const;

// DEFAULT_CONTENT_TYPE 已在 constants/api.ts 中导出，此处不重复定义

/** 多部分表单上传 Content-Type（文件上传） */
export const MULTIPART_CONTENT_TYPE = "multipart/form-data";

/* ========== WebSocket STOMP 协议参数 ========== */

/** STOMP 协议版本 */
export const STOMP_VERSION = "1.2";

/** STOMP 帧结束标记（NULL 字符） */
export const STOMP_FRAME_NULL_CHAR = "\x00";

/** STOMP 换行符 */
export const STOMP_LINE_BREAK = "\n";

/** 订阅 ID 前缀 */
export const WS_SUBSCRIPTION_ID_PREFIX = "sub-";

/**
 * WebSocket topic 前缀与构造工具。
 *
 * 与后端 WebSocketConfig.java 配置保持一致：
 *   - 消息代理前缀: /topic, /queue
 *   - 应用目标前缀: /app
 *   - 用户目标前缀: /user
 *
 * 推送路径示例：
 *   - 私信: /user/{userId}/queue/messages
 *   - 心动信号: /user/{userId}/queue/signals
 *   - 通知: /user/{userId}/queue/notifications
 */
export const WS_TOPICS = {
  /** 应用目标前缀（客户端发送消息） */
  APP_PREFIX: "/app",

  /** 用户队列前缀（服务端推送到特定用户） */
  USER_QUEUE_PREFIX: "/user",

  /** 队列名 */
  QUEUE: {
    /** 私信消息队列 */
    MESSAGES: "messages",
    /** 心动信号队列 */
    SIGNALS: "signals",
    /** 通知队列 */
    NOTIFICATIONS: "notifications",
  },

  /** 主题前缀（广播） */
  TOPIC_PREFIX: "/topic",

  /**
   * 构造用户私信队列 destination。
   * @param userId - 用户 ID
   * @returns 完整 destination 路径（如 "/user/123/queue/messages"）
   */
  userMessages(userId: number | string): string {
    return `/user/${userId}/queue/messages`;
  },

  /**
   * 构造用户心动信号队列 destination。
   * @param userId - 用户 ID
   * @returns 完整 destination 路径
   */
  userSignals(userId: number | string): string {
    return `/user/${userId}/queue/signals`;
  },

  /**
   * 构造用户通知队列 destination。
   * @param userId - 用户 ID
   * @returns 完整 destination 路径
   */
  userNotifications(userId: number | string): string {
    return `/user/${userId}/queue/notifications`;
  },

  /**
   * 构造发送消息应用目标 destination（客户端 → 服务端）。
   * @param action - 动作名（如 "send"）
   * @returns 完整 destination 路径（如 "/app/chat/send"）
   */
  appAction(scope: string, action: string): string {
    return `/app/${scope}/${action}`;
  },
} as const;

/* ========== 分页参数 ========== */

/** 默认页码起始值（1-based） */
export const DEFAULT_PAGE_START = 1;

/** 默认每页条数 */
export const DEFAULT_PAGE_SIZE = 20;

/** 最大每页条数（防止客户端请求过大） */
export const MAX_PAGE_SIZE = 100;

/** 分页参数名（与后端 Spring Pageable 对齐） */
export const PAGINATION_PARAMS = {
  PAGE: "page",
  PAGE_SIZE: "size",
  SORT: "sort",
} as const;
