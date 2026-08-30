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

// AUTH_HEADER_NAME / AUTH_HEADER_PREFIX 已迁移至 api-params.ts，此处 re-export 保持向后兼容
export { AUTH_HEADER_NAME, AUTH_HEADER_PREFIX } from "./api-params";

/**
 * SubTask 1.4.5：AI 视频/图片生成接口专用超时时间（毫秒）。
 *
 * <p>AI 生成类接口耗时较长（视频生成可能 10-30s），需独立设置较长超时，
 * 避免使用默认 10s 超时导致正常请求被误判为失败。</p>
 */
export const AI_API_TIMEOUT_MS = 30000;

/**
 * SubTask 1.4.5：AI 服务未授权业务错误码。
 *
 * <p>后端在以下场景返回此错误码：</p>
 * <ul>
 *   <li>未配置 AGNES_API_KEY 环境变量</li>
 *   <li>Agnes AI 上游返回 401（API Key 失效或过期）</li>
 * </ul>
 *
 * <p>与 JWT 认证失败的 {@code unauthorized} 区分：
 * <ul>
 *   <li>{@code unauthorized}（JWT）：用户未登录或 token 失效，需重新登录</li>
 *   <li>{@code ai_api_unauthorized}（AI）：上游 AI 服务 API Key 问题，需联系管理员</li>
 * </ul>
 * </p>
 */
export const AI_API_UNAUTHORIZED_CODE = "AI_API_UNAUTHORIZED";

/**
 * SubTask 1.4.5：AI 服务上游异常业务错误码。
 *
 * <p>后端在以下场景返回此错误码：</p>
 * <ul>
 *   <li>Agnes AI 上游返回 4xx（非 401）/5xx</li>
 *   <li>调用 Agnes AI 时发生网络异常</li>
 * </ul>
 */
export const AI_API_ERROR_CODE = "AI_API_ERROR";
