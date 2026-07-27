/**
 * HTTP API 配置 (SubTask 3.5.5)
 *
 * 集中导出 HTTP 请求层（services/http.ts）使用的超时、重试、间隔等配置，
 * 替代散落在 constants/api.ts 中的零散常量，提供统一的「配置对象」入口。
 *
 * 设计目标：
 *   1. 配置集中化：所有 HTTP 协议层参数在一处定义
 *   2. 可覆盖：未来支持运行时从后端配置中心拉取覆盖
 *   3. 类型安全：使用 as const 收窄字面量类型
 *
 * 与 constants/api.ts 的关系：
 *   - constants/api.ts 保留具名导出（向后兼容现有 import）
 *   - config/api.ts 提供聚合对象 API_CONFIG，便于一次性传递给 http.ts
 *
 * 使用示例：
 *   import { API_CONFIG } from "@/config/api";
 *   uni.request({ timeout: API_CONFIG.timeout.defaultMs, ... });
 */

import {
  DEFAULT_TIMEOUT_MS,
  DEFAULT_RETRY_COUNT,
  DEFAULT_RETRY_DELAY_MS,
  MAX_401_RETRY_COUNT,
  AI_API_TIMEOUT_MS,
  DEFAULT_CONTENT_TYPE,
  AUTH_HEADER_NAME,
  AUTH_HEADER_PREFIX,
} from "../constants/api";

/**
 * HTTP API 配置聚合对象。
 *
 * 字段说明：
 * - timeout：不同接口类型的超时（毫秒）
 * - retry：网络层错误重试参数
 * - auth：401 处理参数
 * - headers：默认请求头
 */
export const API_CONFIG = {
  /** 默认请求基础地址（运行时由 services/env.ts 解析） */
  baseUrl: "",

  /** 超时配置（毫秒） */
  timeout: {
    /** 默认请求超时（普通接口） */
    defaultMs: DEFAULT_TIMEOUT_MS,
    /** AI 接口超时（视频/图片生成） */
    aiMs: AI_API_TIMEOUT_MS,
    /** 文件上传超时（大文件 + 弱网） */
    uploadMs: 60_000,
    /** 长轮询接口超时 */
    longPollMs: 30_000,
  },

  /** 网络层重试参数 */
  retry: {
    /** 默认重试次数（不含首次请求） */
    count: DEFAULT_RETRY_COUNT,
    /** 重试延迟起始（毫秒，指数退避） */
    delayMs: DEFAULT_RETRY_DELAY_MS,
    /** 指数退避基数（延迟 = delayMs × 2^attempt） */
    backoffBase: 2,
  },

  /** 401 处理参数 */
  auth: {
    /** 401 自动重试最大次数（避免刷新 token 后仍 401 死循环） */
    maxRetry: MAX_401_RETRY_COUNT,
    /** 鉴权头字段名 */
    headerName: AUTH_HEADER_NAME,
    /** 鉴权头值前缀（"Bearer "，注意尾部空格） */
    headerPrefix: AUTH_HEADER_PREFIX,
  },

  /** 默认请求头 */
  headers: {
    "Content-Type": DEFAULT_CONTENT_TYPE,
  },

  /** 请求拦截器开关 */
  interceptors: {
    /** 是否启用请求拦截（添加 token） */
    requestEnabled: true,
    /** 是否启用响应拦截（统一错误处理） */
    responseEnabled: true,
    /** 是否启用 Sentry breadcrumb 记录 */
    sentryBreadcrumb: true,
  },
} as const;

/**
 * 获取指定接口类型的超时时间。
 *
 * @param kind - 接口类型（"default" | "ai" | "upload" | "longPoll"）
 * @returns 超时时间（毫秒）
 */
export function getApiTimeout(
  kind: "default" | "ai" | "upload" | "longPoll" = "default",
): number {
  switch (kind) {
    case "ai":
      return API_CONFIG.timeout.aiMs;
    case "upload":
      return API_CONFIG.timeout.uploadMs;
    case "longPoll":
      return API_CONFIG.timeout.longPollMs;
    default:
      return API_CONFIG.timeout.defaultMs;
  }
}

/**
 * 计算指定尝试次数的重试延迟（指数退避）。
 *
 * @param attempt - 尝试次数（0 = 首次重试）
 * @returns 延迟时间（毫秒）
 */
export function getRetryDelay(attempt: number): number {
  const { delayMs, backoffBase } = API_CONFIG.retry;
  return delayMs * Math.pow(backoffBase, attempt);
}
