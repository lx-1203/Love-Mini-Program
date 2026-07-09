import { describe, expect, it } from "vitest";
import { clientApi } from "../services/api";

describe("error state helpers", () => {
  it("returns the expected mock error shape for 400 responses", async () => {
    await expect(clientApi.simulateError(400)).rejects.toMatchObject({
      status: 400,
      error: "bad_request",
      message: "请求参数有误，请检查后重试",
    });
  });

  it("returns the expected mock error shape for 404 and 500 responses", async () => {
    await expect(clientApi.simulateError(404)).rejects.toMatchObject({
      status: 404,
      error: "not_found",
      message: "请求的资源不存在",
    });

    await expect(clientApi.simulateError(500)).rejects.toMatchObject({
      status: 500,
      error: "server_error",
      message: "服务暂时不可用，请稍后重试",
    });
  });
});
