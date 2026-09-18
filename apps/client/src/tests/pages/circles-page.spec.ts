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
    // 2026-09-17：兴趣圈页已迁入分包 subpackages/circles（主包体积优化），
    // 原断言「pages/circles/index 注册于主包 pages」已过时，改为校验分包注册。
    const subPackages = (pagesJson as { subPackages?: Array<{ root: string; pages: Array<{ path: string }> }> })
      .subPackages ?? [];
    expect(
      subPackages.some(
        (sp) =>
          sp.root === "subpackages/circles" &&
          sp.pages.some((p) => p.path === "circles/index")
      )
    ).toBe(true);
  });

  it("未登录时不发受保护请求（getToken 守卫 + 登录后 watch 补拉）", () => {
    expect(circlesSource).toContain("getToken");
    // 2026-09-17：守卫演进为 getToken() || useMock()（mock 模式无网络请求，本地直载 8 圈），
    // onShow 自愈补拉 + 登录 watch 兜底；语义不变：未登录且非 mock 不发受保护请求。
    expect(circlesSource).toContain("if (getToken() || useMock())");
    expect(circlesSource).toContain("fetchCircles");
    expect(circlesSource).toContain("sessionStore.isLoggedIn");
  });

  it("兴趣圈 i18n 文案齐备", () => {
    for (const key of ["circlesNavTitle", "circlesEmpty", "joinBtn", "joinedBtn", "memberUnit", "topicUnit"]) {
      expect(i18n.global.t(`circle.${key}`).length).toBeGreaterThan(0);
    }
  });
});
