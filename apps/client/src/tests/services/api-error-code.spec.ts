import { describe, expect, it } from "vitest";
import { toAppApiError } from "../../services/api-error";

describe("toAppApiError 保留后端独立业务 code", () => {
  it("后端同时返回 HTTP 短语 error 与业务 code 时，业务分支仍可读取 code", () => {
    const error = toAppApiError(400, {
      status: 400,
      error: "Bad Request",
      code: "DAILY_LIMIT_EXCEEDED",
      message: "今日次数已用完",
    });

    expect(error.code).toBe("DAILY_LIMIT_EXCEEDED");
    expect(error.error).toBe("DAILY_LIMIT_EXCEEDED");
    expect(error.message).toBe("今日次数已用完");
  });

  it("只有 error 字段时保持原行为", () => {
    const error = toAppApiError(401, {
      status: 401,
      error: "unauthorized",
      message: "请先登录",
    });

    expect(error.code).toBeUndefined();
    expect(error.error).toBe("unauthorized");
  });
});
