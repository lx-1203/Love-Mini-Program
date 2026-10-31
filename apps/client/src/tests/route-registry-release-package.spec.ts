import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * 路由名册的「正式包在册」分类（scripts/qa/generate-e2e-routes.mjs 的产物判点，P2 修复）。
 *
 * 改前缺陷（源码与在盘产物都核过）：devOnly 只由**页面模板里的** ifdef DEV 派生，
 * 于是 `/subpackages/setup/showcase/index` —— 它在 apps/client/src/pages.json 里被
 * `// #ifdef SHOWCASE` 整条注册项挡掉（正式包 apps/client/dist/build/mp-weixin-real/app.json
 * 实测 72 条路由里没有它，showcase 只出现在 mp-weixin-showcase 档）——
 * 被写成 devOnly:false 的可发货页。下游 tests/e2e/specs/all-pages-smoke.spec.ts
 * 因此会去断言一张根本没编译进正式包的页面，那是一条永远不会成功的判据。
 *
 * 本测钉四件事：
 * 1. showcase 页归类正确（不在正式包 / 条件符号 SHOWCASE / devOnly true）；
 * 2. dev 页原口径没被改坏；
 * 3. 除掉的条数没有掏空判据（与 all-pages-smoke 的 10% 比例判点同向，从派生侧再钉一次）；
 * 4. 派生方式写在生成器里且带产物对账（判据不是手打的例外表）。
 */

const REPO = resolve(__dirname, "../../../..");
const GENERATED = readFileSync(resolve(REPO, "tests/e2e/routes.generated.ts"), "utf8");

/** 从生成器写出的 `export const ROUTE_EXPECTATIONS: RouteExpectation[] = [...]` 里反解数组 */
function parseGenerated(): Array<Record<string, unknown>> {
  const marker = "export const ROUTE_EXPECTATIONS: RouteExpectation[] = ";
  const start = GENERATED.indexOf(marker);
  expect(start, "派生名册必须仍是生成器写出的那个形状").toBeGreaterThan(-1);
  const body = GENERATED.slice(start + marker.length);
  const end = body.lastIndexOf("];");
  expect(end).toBeGreaterThan(0);
  return JSON.parse(body.slice(0, end + 1)) as Array<Record<string, unknown>>;
}

const expectations = parseGenerated();

function entryOf(route: string): Record<string, unknown> {
  const hit = expectations.find((e) => e["route"] === route);
  expect(hit, `派生名册里没有 ${route}`).toBeDefined();
  return hit as Record<string, unknown>;
}

describe("路由名册：构建档剔除 vs 正式包可发货", () => {
  it("/subpackages/setup/showcase/index 不在正式包里（pages.json 用 ifdef SHOWCASE 整条剔除）", () => {
    const entry = entryOf("/subpackages/setup/showcase/index");
    expect(entry["devOnly"], "showcase 页不得再被当成有渲染内容的可发货页").toBe(true);
    expect(entry["inReleasePackage"]).toBe(false);
    expect(entry["buildConditions"]).toEqual(["SHOWCASE"]);
  });

  it("/subpackages/setup/dev/index 仍在册外（原 DEV 口径没被改坏）", () => {
    const entry = entryOf("/subpackages/setup/dev/index");
    expect(entry["devOnly"]).toBe(true);
    expect(entry["inReleasePackage"]).toBe(false);
    expect(entry["buildConditions"]).toEqual(["DEV"]);
  });

  it("普通业务页仍可发货（分类不许把所有页一锅端掉）", () => {
    for (const route of ["/pages/discover/index", "/subpackages/market/wallet/index"]) {
      const entry = entryOf(route);
      expect(entry["inReleasePackage"], route).toBe(true);
      expect(entry["devOnly"], route).toBe(false);
    }
  });

  it("排除面没有掏空判据：不在正式包的路由占比 <10%，且每条都带得出条件符号", () => {
    const excluded = expectations.filter((e) => e["inReleasePackage"] === false);
    expect(excluded.length).toBeGreaterThan(0);
    expect(excluded.length).toBeLessThan(expectations.length * 0.1);
    for (const e of excluded) {
      const conditions = e["buildConditions"] as string[];
      expect(
        Array.isArray(conditions) && conditions.length > 0,
        `${e["route"]} 被标成不在正式包，却说不出是哪个条件挡的`,
      ).toBe(true);
    }
  });

  it("派生方式与产物对账都在生成器里（判据不是手打的例外表）", () => {
    const generatorSrc = readFileSync(
      resolve(REPO, "scripts/qa/generate-e2e-routes.mjs"),
      "utf8",
    );
    // 条件符号取自 package.json 的 uni-app.scripts[*].define ⇒ 新增构建档不用改生成器
    expect(generatorSrc).toContain('clientPkg["uni-app"]?.scripts');
    // pages.json 的注册项条件必须从**原文**解析（JSON5 解析会把注释丢掉，条件也就没了）
    expect(generatorSrc).toContain("collectPageJsonConditions(pagesPath)");
    // 盘上有正式产物就逐条对账，对不上判红；没产物就印 STATIC，不假装量过
    expect(generatorSrc).toContain("RELEASE_PACKAGE_MISMATCH");
    expect(generatorSrc).toContain("RELEASE_PACKAGE_STATIC");
    expect(generatorSrc).toContain("if (!releasePackageCheck()) process.exit(1);");
  });
});
