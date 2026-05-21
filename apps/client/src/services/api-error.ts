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
  if (status === 400) {
    return {
      status,
      error: "bad_request",
      message: "模拟校验错误",
    };
  }

  if (status === 404) {
    return {
      status,
      error: "not_found",
      message: "模拟资源不存在",
    };
  }

  return {
    status,
    error: "server_error",
    message: "模拟服务异常",
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
