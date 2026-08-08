/**
 * utils/format 单元测试（R4-00481）。
 *
 * 覆盖：耗时格式化、JSON 脱敏（嵌套/正则回退）、URL 脱敏、时间紧凑格式化。
 */
import { describe, expect, it } from "vitest";
import {
  formatDuration,
  formatTimeCompact,
  maskSensitiveJson,
  maskSensitiveUrl,
} from "./format";

describe("formatDuration", () => {
  it("空值返回占位符", () => {
    expect(formatDuration(undefined)).toBe("-");
    expect(formatDuration(null)).toBe("-");
  });

  it("毫秒级返回 ms", () => {
    expect(formatDuration(0)).toBe("0ms");
    expect(formatDuration(999)).toBe("999ms");
  });

  it("秒级返回保留两位小数的 s", () => {
    expect(formatDuration(1000)).toBe("1.00s");
    expect(formatDuration(1234)).toBe("1.23s");
  });
});

describe("maskSensitiveJson", () => {
  it("嵌套对象中的敏感字段被脱敏", () => {
    const raw = JSON.stringify({ user: { password: "secret123" }, nickname: "alice" });
    const masked = maskSensitiveJson(raw);
    expect(JSON.parse(masked)).toEqual({ user: { password: "******" }, nickname: "alice" });
  });

  it("数组元素递归脱敏", () => {
    const raw = JSON.stringify([{ token: "abc" }, { token: "def" }]);
    expect(JSON.parse(maskSensitiveJson(raw))).toEqual([
      { token: "******" },
      { token: "******" },
    ]);
  });

  it("键名大小写与连字符归一化后仍命中（access_token）", () => {
    const raw = JSON.stringify({ "Access-Token": "t-123" });
    expect(JSON.parse(maskSensitiveJson(raw))).toEqual({ "Access-Token": "******" });
  });

  it("非 JSON 文本回退正则脱敏", () => {
    const raw = '{"password": "p@ss"} 后附说明';
    expect(maskSensitiveJson(raw)).toBe('{"password": "******"} 后附说明');
  });

  it("空输入返回空串", () => {
    expect(maskSensitiveJson("")).toBe("");
    expect(maskSensitiveJson(null)).toBe("");
  });
});

describe("maskSensitiveUrl", () => {
  it("无 query 的 URL 原样返回", () => {
    expect(maskSensitiveUrl("/api/v1/admin/users")).toBe("/api/v1/admin/users");
  });

  it("敏感参数值被脱敏", () => {
    const url = "/api/v1/admin/users?token=abc123&page=1";
    expect(maskSensitiveUrl(url)).toBe("/api/v1/admin/users?token=******&page=1");
  });

  it("非敏感参数保留原值", () => {
    expect(maskSensitiveUrl("/api?keyword=love")).toBe("/api?keyword=love");
  });

  it("空输入返回空串", () => {
    expect(maskSensitiveUrl("")).toBe("");
    expect(maskSensitiveUrl(null)).toBe("");
  });
});

describe("formatTimeCompact", () => {
  it("空值返回占位符", () => {
    expect(formatTimeCompact(undefined)).toBe("-");
    expect(formatTimeCompact(null)).toBe("-");
  });

  it("无时区后缀保持服务器时间原样并截到秒", () => {
    expect(formatTimeCompact("2026-08-09T10:20:30.123")).toBe("2026-08-09 10:20:30");
  });
});
