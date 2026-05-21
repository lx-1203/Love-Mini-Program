import { describe, expect, it } from "vitest";
import { clientApi } from "../services/api";

describe("error state helpers", () => {
  it("returns the expected mock error shape for 400 responses", async () => {
    await expect(clientApi.simulateError(400)).rejects.toMatchObject({
      status: 400,
      error: "bad_request",
      message: "模拟校验错误",
    });
  });

  it("returns the expected mock error shape for 404 and 500 responses", async () => {
    await expect(clientApi.simulateError(404)).rejects.toMatchObject({
      status: 404,
      error: "not_found",
      message: "模拟资源不存在",
    });

    await expect(clientApi.simulateError(500)).rejects.toMatchObject({
      status: 500,
      error: "server_error",
      message: "模拟服务异常",
    });
  });
});
