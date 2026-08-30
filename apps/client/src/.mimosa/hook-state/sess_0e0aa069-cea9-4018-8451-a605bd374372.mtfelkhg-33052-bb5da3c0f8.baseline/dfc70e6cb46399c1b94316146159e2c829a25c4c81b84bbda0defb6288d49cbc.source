/**
 * 统一 API 错误模型与转换工具。
 *
 * <p>目的：将后端返回的各种错误体（JSON / 文本 / 空）统一转换为
 * {@link AppApiError} 实例，便于上层捕获与分支处理。</p>
 *
 * R4-batch2：错误兜底文案统一走 i18n（apiErrors.*，zh/en 同步）。
 *
 * <p>后端错误体契约（{@code GlobalExceptionHandler} 标准格式）：
 * <pre>{ status, error, message, details? }</pre></p>
 */
// i18n 翻译函数（非组件场景经全局 composer 解析）
import { t } from "@/i18n";

/**
 * API 错误体结构（与后端 {@code GlobalExceptionHandler} 返回格式对齐）。
 *
 * - status：HTTP 状态码（如 400 / 401 / 403 / 404 / 500）
 * - error：错误码字符串（如 "bad_request" / "unauthorized" / "server_error"）
 * - message：用户可读的中文文案（直接展示给用户）
 * - details：可选的错误详情（如字段级校验错误列表）
 */
export interface AppApiErrorShape {
  /** HTTP 状态码 */
  status: number;
  /** 错误码字符串（业务侧分支处理依据） */
  error: string;
  /** 用户可读的错误文案（直接展示给用户） */
  message: string;
  /** 可选错误详情（字段级校验信息、调试上下文等） */
  details?: unknown;
}

/**
 * 应用 API 错误类。
 *
 * 继承 {@code Error}，额外携带 HTTP 状态码、错误码与详情字段，
 * 便于上层 {@code catch (e)} 后按 {@code e.status} / {@code e.error} 分支处理。
 */
export class AppApiError extends Error {
  /** HTTP 状态码 */
  status: number;
  /** 错误码字符串 */
  error: string;
  /** 错误详情（字段级校验信息等） */
  details?: unknown;

  /**
   * @param shape 错误体结构
   */
  constructor(shape: AppApiErrorShape) {
    super(shape.message);
    this.name = "AppApiError";
    this.status = shape.status;
    this.error = shape.error;
    this.details = shape.details;
  }
}

/**
 * 根据 HTTP 状态码生成兜底错误体（后端响应缺少 error / message 字段时使用）。
 *
 * 兜底文案遵循「友好 + 中性」原则，避免暴露技术细节（如 500 不返回堆栈，
 * 401 不返回 token 字样），与 {@link services/http.normalizeErrorCode} 保持一致。
 *
 * R4-batch2：兜底文案统一走 i18n（apiErrors.*，zh/en 同步），
 * 与 http.ts / agnes-video.ts 的错误文案共用同一键集。
 *
 * @param status HTTP 状态码
 * @returns 兜底错误体
 */
function fallbackErrorShape(status: number): AppApiErrorShape {
  // 修复：原代码 fallback 消息含"模拟"前缀，会在后端响应缺少 message 字段时直接展示给真实用户
  // 改为中性、用户友好的文案
  if (status === 400) {
    return {
      status,
      error: "bad_request",
      message: t("apiErrors.badRequest"),
    };
  }

  if (status === 401) {
    return {
      status,
      error: "unauthorized",
      message: t("apiErrors.unauthorized"),
    };
  }

  if (status === 403) {
    return {
      status,
      error: "forbidden",
      message: t("apiErrors.forbidden"),
    };
  }

  if (status === 404) {
    return {
      status,
      error: "not_found",
      message: t("apiErrors.notFound"),
    };
  }

  if (status >= 500) {
    return {
      status,
      error: "server_error",
      message: t("apiErrors.serverError"),
    };
  }

  return {
    status,
    error: "request_error",
    message: t("apiErrors.requestError"),
  };
}

/**
 * 根据状态码创建兜底 API 错误（用于无后端响应体的场景，如网络层错误）。
 *
 * @param status HTTP 状态码（网络错误时为 0）
 * @returns 兜底 AppApiError 实例
 */
export function createMockApiError(status: number): AppApiError {
  return new AppApiError(fallbackErrorShape(status));
}

/**
 * 将后端响应体转换为 {@link AppApiError}。
 *
 * 处理规则：
 * - 响应体为对象：读取 {@code error} / {@code message} / {@code details} 字段，
 *   缺失或空字符串时使用兜底值，确保错误对象字段完整。
 * - 响应体非对象（字符串 / 空等）：直接使用兜底错误体。
 *
 * @param status HTTP 状态码
 * @param payload 后端响应体（unknown 类型，由调用方传入）
 * @returns 标准化的 AppApiError 实例
 */
export function toAppApiError(status: number, payload: unknown): AppApiError {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const fallback = fallbackErrorShape(status);

    return new AppApiError({
      status,
      error:
        typeof record.error === "string" && record.error.trim().length > 0
          ? record.error
          : fallback.error,
      message:
        typeof record.message === "string" && record.message.trim().length > 0
          ? record.message
          : fallback.message,
      details: record.details,
    });
  }

  return new AppApiError(fallbackErrorShape(status));
}
