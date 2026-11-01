import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { relative, resolve } from "node:path";

/**
 * 游客守卫对账门（R7-C 第 1 批 · 门 1，round-6 F-4.3 / F-7 方案）。
 *
 * <p>背景：`guards/guest-access.ts` 的 `guideGuestToLogin()` 是全仓唯一的「游客在 onLoad
 * 就被引导走」机制，但它在册名册 `scripts/qa/guest-landing-policy.json` 里只有
 * `family=guard-bounce` 两行（wallet/security，2026-10-31 P1 补的），而源码里实际有
 * 7 页在调守卫——另外 5 页（campus/index、discover/matching、setup/campus、
 * setup/recommend-pref、village/tag-posts）在册记的是 `guide-401`（它们先于
 * guard-bounce 族存在，源码自 a51323ce 起就是守卫先行）。所以本门**不是**简单等集：
 * family 归因可以失真（两族落地页与标记类相同，设备腿分不清），但两个方向的事实必须成立——</p>
 *
 * <ol>
 *   <li>① 在册 `family=guard-bounce` 的每一行，源码必须真在调 `guideGuestToLogin(`
 *      （在册说有守卫、盘上没有 ⇒ 名册撒谎，锚点全部失效）；</li>
 *   <li>② 源码里每一页调 `guideGuestToLogin(` 的页面，必须在 rows 里有裁定行（按 page
 *      匹配、不分族——调了守卫却没有裁定行 ⇒ 新页悄悄加守卫/搬守卫时无人对账）。</li>
 * </ol>
 *
 * <p>形态照抄 `stores/logout-registry.spec.ts` 的穷尽门：readdirSync 扫盘 + readFileSync
 * 读源码，不 import 任何页面（静态判点，不铺桩）。page 标识换算：`src/pages`、
 * `src/subpackages` 下的 .vue 相对路径，去 `apps/client/src/` 前缀、去 `.vue` 后缀、
 * 反斜杠归一为 `/`——与 policy rows[].page 的口径一致（若某页源文件是
 * `foo/index.vue`，policy 里记的是 `foo/index`，不需要再拼 index）。</p>
 */

const REPO = resolve(__dirname, "../../../..");
const CLIENT_SRC = resolve(REPO, "apps/client/src");
const POLICY_PATH = resolve(REPO, "scripts/qa/guest-landing-policy.json");

/** 守卫调用判据：源码（含注释也不豁免——调用守卫这一行为本身就是判据面） */
const GUARD_CALL = "guideGuestToLogin(";

function walkVue(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) walkVue(full, acc);
    else if (entry.isFile() && entry.name.endsWith(".vue")) acc.push(full);
  }
  return acc;
}

/** 盘上真实调用守卫的页面集合（policy 口径的 page 标识） */
function collectGuardCallers(): Map<string, string> {
  const callers = new Map<string, string>();
  for (const dir of ["pages", "subpackages"]) {
    for (const abs of walkVue(resolve(CLIENT_SRC, dir))) {
      const src = readFileSync(abs, "utf8");
      if (src.includes(GUARD_CALL)) {
        const page = relative(CLIENT_SRC, abs)
          .split(/[\\/]/gu)
          .join("/")
          .replace(/\.vue$/u, "");
        callers.set(page, page);
      }
    }
  }
  return callers;
}

const policy = JSON.parse(readFileSync(POLICY_PATH, "utf8")) as {
  rows: Array<{ page: string; family: string; landing?: string }>;
};

const sourceCallers = collectGuardCallers();
const guardBounceRows = policy.rows.filter((r) => r.family === "guard-bounce");
const registeredPages = new Set(policy.rows.map((r) => r.page));

describe("游客守卫对账门：guideGuestToLogin 调用页 × guest-landing-policy.json（双向差集）", () => {
  it("扫描面非空：盘上调用守卫的页面 ≥7（掉了先怀疑扫描器，不是守卫被删光了）", () => {
    // 实测（2026-11-01 R7-C 建门）：7 页 —— campus/campus/index、discover-extra/discover/matching、
    // market/wallet、setup/campus、setup/recommend-pref、tools/security、village/tag-posts
    expect(
      sourceCallers.size,
      `只扫到 ${sourceCallers.size} 页调用 ${GUARD_CALL} ⇒ 遍历目录或判据失效了`,
    ).toBeGreaterThanOrEqual(7);
    expect(policy.rows.length).toBeGreaterThanOrEqual(30);
  });

  it("① 在册 family=guard-bounce 的每一行，源码必须真在调 guideGuestToLogin（在册守卫页不许名不副实）", () => {
    const liars = guardBounceRows
      .filter((r) => !sourceCallers.has(r.page))
      .map((r) => `${r.page} 在册记 guard-bounce，但源码没有 ${GUARD_CALL}`);
    expect(
      liars,
      `在册守卫页缺守卫（要么补源码守卫，要么改 family，不许名册自说自话）：\n${liars.join("\n")}`,
    ).toEqual([]);
  });

  it("② 源码每页调 guideGuestToLogin 的页面必须在 rows 里有裁定行（不分族——调了守卫就必须有裁定）", () => {
    const orphans = [...sourceCallers.keys()]
      .filter((page) => !registeredPages.has(page))
      .sort();
    expect(
      orphans,
      `调了守卫却不在 guest-landing-policy.json 的 rows 里（新页加守卫必须同步登记裁定行）：\n${orphans.join("\n")}`,
    ).toEqual([]);
  });

  it("guard-bounce 在册行数 ≥2 且每行落点是登录页（族口径锚定，防止整族被顺手清空）", () => {
    expect(guardBounceRows.length).toBeGreaterThanOrEqual(2);
    for (const row of guardBounceRows) {
      expect(row.landing, `${row.page} 的 landing`).toBe("pages/login/index");
    }
  });
});
