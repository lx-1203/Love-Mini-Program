export interface AppApiErrorShape {
  status: number;
  error: string;
  message: string;
  details?: unknown;
}

export class AppApiError extends Error {
  status: number;
  error: string;
  details?: unknown;

  constructor(shape: AppApiErrorShape) {
    super(shape.message);
    this.name = "AppApiError";
    this.status = shape.status;
    this.error = shape.error;
    this.details = shape.details;
  }
}

function fallbackErrorShape(status: number): AppApiErrorShape {
  // 修复：原代码 fallback 消息含"模拟"前缀，会在后端响应缺少 message 字段时直接展示给真实用户
  // 改为中性、用户友好的文案
  if (status === 400) {
    return {
      status,
      error: "bad_request",
      message: "请求参数有误，请检查后重试",
    };
  }

  if (status === 401) {
    return {
      status,
      error: "unauthorized",
      message: "登录已过期，请重新登录",
    };
  }

  if (status === 403) {
    return {
      status,
      error: "forbidden",
      message: "无权限执行此操作",
    };
  }

  if (status === 404) {
    return {
      status,
      error: "not_found",
      message: "请求的资源不存在",
    };
  }

  if (status >= 500) {
    return {
      status,
      error: "server_error",
      message: "服务暂时不可用，请稍后重试",
    };
  }

  return {
    status,
    error: "request_error",
    message: "请求失败，请稍后重试",
  };
}

export function createMockApiError(status: number): AppApiError {
  return new AppApiError(fallbackErrorShape(status));
}

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
