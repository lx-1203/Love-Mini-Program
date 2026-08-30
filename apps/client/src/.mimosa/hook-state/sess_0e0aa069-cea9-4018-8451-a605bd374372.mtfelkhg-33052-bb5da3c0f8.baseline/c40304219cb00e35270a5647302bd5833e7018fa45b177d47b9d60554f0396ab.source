import { describe, expect, it } from "vitest";
import { normalizeApiPath } from "../../services/http";

describe("http normalizeApiPath（P3 联调：/v1 前缀归一化）", () => {
  it("无前缀路径补齐 /v1（/auth/me → /v1/auth/me）", () => {
    expect(normalizeApiPath("/auth/me")).toBe("/v1/auth/me");
    expect(normalizeApiPath("/wallet/balance")).toBe("/v1/wallet/balance");
    expect(normalizeApiPath("/media/upload")).toBe("/v1/media/upload");
  });

  it("已带 /v1 前缀的路径原样返回", () => {
    expect(normalizeApiPath("/v1/auth/guest-login")).toBe("/v1/auth/guest-login");
    expect(normalizeApiPath("/v1/location/ip-city")).toBe("/v1/location/ip-city");
  });

  it("绝对 URL（http/https//）原样返回", () => {
    expect(normalizeApiPath("http://127.0.0.1:8080/api/ws")).toBe("http://127.0.0.1:8080/api/ws");
    expect(normalizeApiPath("https://cdn.example.com/x.png")).toBe("https://cdn.example.com/x.png");
    expect(normalizeApiPath("//cdn.example.com/x.png")).toBe("//cdn.example.com/x.png");
  });

  it("空字符串与无前导斜杠路径", () => {
    expect(normalizeApiPath("")).toBe("");
    expect(normalizeApiPath("auth/me")).toBe("/v1/auth/me");
  });
});
