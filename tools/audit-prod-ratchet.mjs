import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/**
 * 生产依赖漏洞棘轮门（S0-1b，2026-10-30）。
 *
 * 为什么不是 `pnpm audit --prod --audit-level high` 一条命令：
 * 那条门在本仓当前是**必然红**的——把 @dcloudio 构建链挪出 prod 面、再用 pnpm overrides
 * 把 nanoid / postcss / source-map-js 抬到补丁版之后，prod 面仍剩 4 条 high：
 *   - @vue/server-renderer <3.5.42：修复要求 vue ≥3.5.42，而 uni-app alpha 与客户端锁在 3.4.21；
 *   - vue-i18n / @intlify/{shared,core-base} =9.14.5：9.x 线上没有补丁版（9.14.5 就是 9.x 最后一个），
 *     修复只存在于 11.x，属跨大版本迁移。
 * 这两类都不是"加不加 overrides"能干净解决的：强行 override @vue/server-renderer 会让
 * vue 与它的 server renderer 版本错配，硬升 vue-i18n 大版本要过一遍两端的 i18n 运行时。
 *
 * 所以这里的处置是「critical 一律硬失败 + high 按 advisory id 逐条钉住只减不增」：
 * 新增一条 high 立刻红；修掉一条但没同步删基线，也立刻红（防止豁免清单悄悄膨胀）。
 * 明确不用 continue-on-error——那等于把门拆了。
 */

const root = fileURLToPath(new URL("../", import.meta.url));
const BASELINE_PATH = new URL("audit-prod-baseline.json", import.meta.url);

/** 计入棘轮的严重级别（critical 由 CI 的另一条命令直接硬失败，这里一并记录以防漏网）。 */
const TRACKED = new Set(["high", "critical"]);

/**
 * 纯函数比对：实测审计结果 vs 基线。
 *
 * @param {Record<string, {module_name?: string, severity?: string}>} advisories pnpm audit 的 advisories 映射
 * @param {Record<string, unknown>} baseline 已批准的豁免清单（advisory id → 理由）
 * @returns {{fresh: string[], stale: string[], tracked: number}}
 */
export function diffAgainstBaseline(advisories, baseline) {
  const fresh = [];
  const stale = [...Object.keys(baseline)];
  let tracked = 0;
  for (const [id, adv] of Object.entries(advisories)) {
    if (!adv || !TRACKED.has(adv.severity)) continue;
    tracked += 1;
    const at = stale.indexOf(id);
    if (at === -1) fresh.push(`${id} (${adv.module_name ?? "?"})`);
    else stale.splice(at, 1);
  }
  return { fresh, stale, tracked };
}

// —— 自测：三种失败模式都要能被抓住，且合法态必须通过 ——
const fixtureBaseline = { "1": { module: "a" }, "2": { module: "b" } };
assert.deepEqual(
  diffAgainstBaseline({ 1: { severity: "high", module_name: "a" }, 2: { severity: "high", module_name: "b" } }, fixtureBaseline),
  { fresh: [], stale: [], tracked: 2 },
  "自测正例失效：完全匹配应当通过",
);
assert.deepEqual(
  diffAgainstBaseline({ 1: { severity: "high" }, 2: { severity: "high" }, 3: { severity: "critical" } }, fixtureBaseline),
  { fresh: ["3 (?)"], stale: [], tracked: 3 },
  "自测负例失效：新增 high/critical 没被抓到，本门是空门",
);
assert.deepEqual(
  diffAgainstBaseline({ 1: { severity: "high" } }, fixtureBaseline),
  { fresh: [], stale: ["2"], tracked: 1 },
  "自测负例失效：修掉一条但基线没收缩，必须要求同步收缩",
);
assert.deepEqual(
  diffAgainstBaseline({ 9: { severity: "moderate" } }, fixtureBaseline).tracked,
  0,
  "moderate 不该计入 high/critical 棘轮",
);

// —— 真实执行：跑 pnpm audit 并解析 ——
const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8")).advisories ?? {};
assert.ok(Object.keys(baseline).length > 0, "基线为空——若 prod 面已完全干净，请删掉本门与 CI 步骤，而不是留空门");

const run = spawnSync("pnpm", ["audit", "--prod", "--json"], {
  cwd: root,
  encoding: "utf8",
  shell: process.platform === "win32",
  maxBuffer: 32 * 1024 * 1024,
});
const stdout = (run.stdout ?? "").trim();
// 注意：pnpm audit 在"发现漏洞"时退出码非 0，那是产品事实，不是仪器故障；
// 仪器故障要看能不能拿到可解析的 JSON。两者必须分开判。
let parsed;
try {
  parsed = JSON.parse(stdout.startsWith("{") ? stdout : stdout.slice(stdout.indexOf("{")));
} catch {
  console.error(`[audit-ratchet] 无法解析 pnpm audit 输出（instrument failure）：exit=${run.status}`);
  console.error(`stdout 前 300 字符：${stdout.slice(0, 300)}`);
  console.error(`stderr 前 300 字符：${(run.stderr ?? "").slice(0, 300)}`);
  process.exit(2);
}
const advisories = parsed.advisories ?? {};
const { fresh, stale, tracked } = diffAgainstBaseline(advisories, baseline);

assert.deepEqual(fresh, [], `prod 面出现未批准的 high/critical 漏洞：\n  ${fresh.join("\n  ")}`);
assert.deepEqual(stale, [], `以下豁免已不再命中，请把 tools/audit-prod-baseline.json 收缩：\n  ${stale.join("\n  ")}`);

console.log(
  `audit prod ratchet ok（prod 面 high/critical ${tracked} 条，全部在基线豁免内；`
  + `基线 ${Object.keys(baseline).length} 条只减不增；低/中危不计入门禁）`,
);
