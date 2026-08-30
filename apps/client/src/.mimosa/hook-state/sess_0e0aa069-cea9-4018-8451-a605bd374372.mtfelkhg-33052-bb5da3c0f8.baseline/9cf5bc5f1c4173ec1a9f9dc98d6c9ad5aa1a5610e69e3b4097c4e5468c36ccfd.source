import { describe, expect, it } from "vitest";
// R4-00154：simulateError 已移入独立 dev 模块（services/dev-tools.ts），
// 不再挂载在 clientApi 业务面上
import { simulateError } from "../services/dev-tools";

describe("error state helpers", () => {
  it("returns the expected mock error shape for 400 responses", async () => {
    await expect(simulateError(400)).rejects.toMatchObject({
      status: 400,
      error: "bad_request",
      message: "请求参数有误，请检查后重试",
    });
  });

  it("returns the expected mock error shape for 404 and 500 responses", async () => {
    await expect(simulateError(404)).rejects.toMatchObject({
      status: 404,
      error: "not_found",
      message: "请求的资源不存在",
    });

    await expect(simulateError(500)).rejects.toMatchObject({
      status: 500,
      error: "server_error",
      message: "服务暂时不可用，请稍后重试",
    });
  });
});
