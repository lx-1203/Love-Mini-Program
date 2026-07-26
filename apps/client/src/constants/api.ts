/**
 * API / HTTP 相关常量
 *
 * 集中维护 HTTP 请求层（services/http.ts）使用的超时、重试、状态码等常量。
 * 业务层请优先复用此处常量，避免在调用方重复硬编码。
 *
 * 注意：
 * - 仅对网络层错误（status=0）重试，不对 401/403/业务错误重试
 * - 401 由 handle401 队列统一处理，重试只关心网络层
 * - 指数退避：500ms, 1000ms, 2000ms...
 */

/** 默认请求超时时间（毫秒） */
export const DEFAULT_TIMEOUT_MS = 10000;

/** 默认网络层错误重试次数（不含首次请求） */
export const DEFAULT_RETRY_COUNT = 1;

/** 默认重试延迟（毫秒），指数退避起始值 */
export const DEFAULT_RETRY_DELAY_MS = 500;

/** HTTP 状态码：成功区间起始 */
export const HTTP_STATUS_OK_MIN = 200;

/** HTTP 状态码：成功区间结束 */
export const HTTP_STATUS_OK_MAX = 299;

/** HTTP 状态码：未授权 */
export const HTTP_STATUS_UNAUTHORIZED = 401;

/** HTTP 状态码：禁止访问 */
export const HTTP_STATUS_FORBIDDEN = 403;

/** HTTP 状态码：网络层错误标识（uni.request fail 时为 0） */
export const HTTP_STATUS_NETWORK_ERROR = 0;

/** 401 自动重试最大次数（防止刷新 token 后仍 401 形成死循环） */
export const MAX_401_RETRY_COUNT = 1;

/** 默认请求 Content-Type */
export const DEFAULT_CONTENT_TYPE = "application/json";

/** 鉴权头字段名 */
export const AUTH_HEADER_NAME = "Authorization";

/** 鉴权头值前缀（与 Bearer Token 模式对齐） */
export const AUTH_HEADER_PREFIX = "Bearer ";
