import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pagesJson from "../../pages.json";
import { i18n } from "../../i18n";

/**
 * 兴趣圈列表页 smoke（2026-08-15 增补）：
 * - 页面已注册
 * - 未登录时不发受保护请求（getToken 守卫 + 登录后 watch 补拉）
 */
describe("Circles 页面 smoke", () => {
  const circlesSource = readFileSync(
    resolve(__dirname, "../../subpackages/circles/circles/index.vue"),
    "utf-8"
  );

  it("兴趣圈页已注册", () => {
    expect(
      pagesJson.pages.some((p: { path: string }) => p.path === "pages/circles/index")
    ).toBe(true);
  });

  it("未登录时不发受保护请求（getToken 守卫 + 登录后 watch 补拉）", () => {
    expect(circlesSource).toContain("getToken");
    expect(circlesSource).toContain("if (!getToken()) return");
    expect(circlesSource).toContain("fetchCircles");
    expect(circlesSource).toContain("sessionStore.isLoggedIn");
  });

  it("兴趣圈 i18n 文案齐备", () => {
    for (const key of ["circlesNavTitle", "circlesEmpty", "joinBtn", "joinedBtn", "memberUnit", "topicUnit"]) {
      expect(i18n.global.t(`circle.${key}`).length).toBeGreaterThan(0);
    }
  });
});
