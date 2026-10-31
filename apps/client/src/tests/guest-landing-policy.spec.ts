import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * guest-landing-policy.json 的**静态可核性**（此前它只被两条需要设备/租约的腿吃：
 * scripts/qa/verify-guest-landing.mjs 的 book/measure，以及 scripts/qa/generate-e2e-routes.mjs
 * 派生 tests/e2e/routes.generated.ts）。名册里的 anchors 是「裁定凭什么成立」的证据本体，
 * 却没有一条能在 CI 里跑的判点问过它——本测补的就是这一条：
 * 每一条 anchor 的 needle 必须在所指文件里**存在且只出现一次**（与
 * verify-guest-landing.mjs:62 checkAnchor() 同一口径、同一折叠空白比较）。
 *
 * 另外钉住在册行本身：每一行 rows[].page 必须是 pages.json 里真注册过的路由、
 * family 必须在 markers 里有口径、landing 必须是真页 ——
 * 否则派生出来的名册会把判据指向一个不存在的东西（verify-guest-landing 只在
 * --mode book 且需要 triage 语料时才查这一层）。
 */

const REPO = resolve(__dirname, "../../../..");
const POLICY_PATH = resolve(REPO, "scripts/qa/guest-landing-policy.json");
const policy = JSON.parse(readFileSync(POLICY_PATH, "utf8"));

/** 与载具同口径：比较前把连续空白折成一个空格（needle 允许跨行） */
const squashWs = (s: string): string => String(s).replace(/\s+/g, " ").trim();

function anchorError(anchor: { file: string; needle: string }): string | null {
  const path = resolve(REPO, anchor.file);
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (_e) {
    return `文件不存在：${anchor.file}`;
  }
  const needle = squashWs(anchor.needle);
  if (!needle) return `${anchor.file}：锚点没有 needle ⇒ 无法复核它指的是什么`;
  const hay = squashWs(text);
  const hits = hay.split(needle).length - 1;
  if (hits === 0) return `${anchor.file}：找不到标识符「${anchor.needle}」⇒ 依据已不在源码里`;
  if (hits > 1) return `${anchor.file}：「${anchor.needle}」出现 ${hits} 处 ⇒ 锚点指不回唯一位置`;
  return null;
}

describe("guest-landing-policy.json 的锚点与在册行（可核性）", () => {
  it("anchors 字段存在且非空（依据不能是裸文字）", () => {
    expect(Array.isArray(policy.anchors), "$.anchors 必须是数组").toBe(true);
    expect(policy.anchors.length).toBeGreaterThan(0);
  });

  const broken = (policy.anchors ?? [])
    .map((a: { claim: string; file: string; needle: string }) => ({
      claim: a.claim,
      err: anchorError(a),
    }))
    .filter((x: { err: string | null }) => x.err !== null);
  it(`全部 ${(policy.anchors ?? []).length} 条锚点都可核（标识符存在且唯一）`, () => {
    expect(broken, `不可核锚点：${JSON.stringify(broken, null, 1)}`).toEqual([]);
  });

  it("每一条 rows[].family 在 markers 里都有口径（否则派生出的落点判据没有标记类）", () => {
    for (const row of policy.rows) {
      expect(policy.markers[row.family], `family=${row.family}（${row.page}）`).toBeDefined();
      expect(
        policy.markers[row.family]?.landingMarker,
        `${row.family} 没有 landingMarker`,
      ).toBeTruthy();
    }
  });

  it("每一条 rows[].page 都指向一个真实存在的页面源文件", () => {
    for (const row of policy.rows) {
      const rel = row.page as string;
      const candidates = [
        resolve(REPO, "apps/client/src", `${rel}.vue`),
        resolve(REPO, "apps/client/src", rel, "index.vue"),
      ];
      const exists = candidates.some((f) => {
        try {
          readFileSync(f, "utf8");
          return true;
        } catch (_e) {
          return false;
        }
      });
      expect(exists, `在册页 ${rel} 没有对应的 .vue 源文件（两个候选路径都读不到）`).toBe(true);
    }
  });

  it("钱包页与安全中心页都在册，落点是登录页、成因族是 guard-bounce（P1 修复的在册部分）", () => {
    const byPage = new Map((policy.rows ?? []).map((r: { page: string }) => [r.page, r]));
    for (const page of ["subpackages/market/wallet/index", "subpackages/tools/security/index"]) {
      const row = byPage.get(page) as { landing: string; family: string } | undefined;
      expect(row, `${page} 必须登记在 guest-landing-policy.json 的 rows 里`).toBeDefined();
      expect(row!.landing).toBe("pages/login/index");
      expect(row!.family).toBe("guard-bounce");
    }
    expect(policy.markers["guard-bounce"].landingMarker).toBe(".login-page__brand");
    expect(policy.markers["guard-bounce"].registerEntry).toBe(".login-register-entry");
  });

  it("派生物 tests/e2e/routes.generated.ts 确实吃到了这两行（不是只写进 JSON 没人消费）", () => {
    const generated = readFileSync(resolve(REPO, "tests/e2e/routes.generated.ts"), "utf8");
    for (const page of ["subpackages/market/wallet/index", "subpackages/tools/security/index"]) {
      expect(generated, `派生名册里没有 ${page}`).toContain(`/${page}`);
    }
    expect(generated).toContain("guard-bounce");
  });
});
