/* 从台账派生"修复复验定向巡检"的补拍清单（tour-R6 的 RESHOOT TSV 格式：身份<TAB>路由）。
 * 为什么不能手写这张表：④a 的页集应当正好等于"台账里仍需画面判定的行"所覆盖的页；
 * 手写会漏页、也会把已经不需要帧的行拍进去白烧模拟器时间。
 * 关键防呆：TSV 里的每一行都必须落在本轮巡检真的能到达的页面全集里
 * （全集取自 round-6-tour manifest 的 shots[].page）。不在全集里的页会被 tour 的
 * `pages.filter(...)` 静默丢掉——那看起来"跑完了"，实际覆盖为 0，正是本轮反复踩的
 * "扫描集悄悄变小却照样出 PASS"。这里把它变成显式失败清单。
 * 用法：node scripts/qa/make-reshoot-plan.mjs [--out .zcode/tmp/reverify] [--identities A,B] */
import fs from "node:fs";
import path from "node:path";

const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const MATRIX = "reports/audit/round-6/issue-matrix.md";
const MANIFEST = "reports/screenshots/round-6-tour/manifest-detail.json";
const OUT = arg("out", ".zcode/tmp/reverify");
const IDENTITIES = (arg("identities", "A,B")).split(",").map((s) => s.trim()).filter(Boolean);

const md = fs.readFileSync(MATRIX, "utf8").split(/\r?\n/);
// 第一节的表格行：| ID | 别名 | 页面 | 类别 | 级别 | 状态 | 置信 | ...
const rows = [];
for (const line of md) {
  if (!line.startsWith("| MP-")) continue;
  const cells = line.split("|").slice(1, -1).map((c) => c.trim());
  if (cells.length < 6) { console.log(`!! 列数不足(${cells.length})跳过：${cells[0]}`); continue; }
  rows.push({ id: cells[0], page: cells[2], severity: cells[4], status: cells[5] });
}
if (!rows.length) { console.log("FAIL 台账第一节一行都没解析到（列式变了？解析器坏了？）——不许空过"); process.exit(2); }

const NEED = ["待修复", "已修复待复验"];
const needRows = rows.filter((r) => NEED.some((p) => r.status.startsWith(p)));
const openRows = rows.filter((r) => r.status.startsWith("待修复"));
const verifyRows = rows.filter((r) => r.status.startsWith("已修复待复验"));

// 台账"页面"列写法不统一：`pages/profile/index（未登录态）`、`components/layout/AppShell`、
// `theme/design-variables.scss`、`tmp/tour-R2` 都出现过。直接拿整格去比巡检全集，
// 带注解的真页面会被当成"没到达"，而根本不是页面的锚点会被当成页面去找。
// 归一化：剥括注 → 只认 `pages/…` 或 `subpackages/…` 开头的前缀为路由；其余归入非页面锚点。
const ROUTE_RE = /^(?:pages|subpackages)\/[\w\-/]+$/;
function normPage(cell) {
  const head = String(cell || "").split(/[（(；;]/)[0].trim();
  const m = head.match(/^(?:pages|subpackages)\/[\w\-/]+/);
  return m ? m[0] : null;
}
const nonPage = [];
const byPage = new Map();
for (const r of needRows) {
  const page = normPage(r.page);
  if (!page) { nonPage.push({ id: r.id, anchor: r.page, severity: r.severity }); continue; }
  if (!byPage.has(page)) byPage.set(page, []);
  byPage.get(page).push(r);
}
if (!byPage.size) { console.log("FAIL 归一化后一个页面路由都没有——解析器或台账列式坏了"); process.exit(2); }

// 页面全集：本轮巡检实际到达过的页
const mani = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
const universe = new Set((mani.shots || []).map((s) => s.page).filter(Boolean));
if (!universe.size) { console.log("FAIL 巡检 manifest 的 shots[] 里没有 page → 全集为空，本脚本无判据"); process.exit(2); }

const inUniverse = [], dropped = [];
for (const page of [...byPage.keys()].sort()) (universe.has(page) ? inUniverse : dropped).push(page);

const lines = [];
for (const idt of IDENTITIES) for (const p of inUniverse) lines.push(idt + "\t" + p);
/* §63 覆盖率回填：这 9 页在产物 app.json 里存在、但 round-6 巡检既没帧也没失败记录
   （不在 tour 的 PAGES 里 → 静默不可见）。它们**必须绕过 universe 过滤**，
   因为 universe 的定义就是"巡检到达过的页"，而这 9 页恰恰是"从未到达"。
   身份 B 只给两份对外公开的法律页；其余按既有裁定游客会被引导去登录，拍了也只是拍到登录页。 */
const BACKFILL = [
  ["A", "subpackages/tools/love-center/mbti"],
  ["A", "subpackages/tools/love-center/consulting"],
  ["A", "subpackages/profile-extra/verification/real-name"],
  ["A", "subpackages/setup/campus/index"],
  ["A", "subpackages/setup/schedule/index"],
  ["A", "subpackages/setup/recommend-pref/index"],
  ["A", "subpackages/discover/discussions/index"],
  ["A", "subpackages/legal/privacy/index"],
  ["B", "subpackages/legal/privacy/index"],
  ["A", "subpackages/legal/agreement/index"],
  ["B", "subpackages/legal/agreement/index"],
];
for (const [i, p] of BACKFILL) if (!lines.includes(i + "\t" + p)) lines.push(i + "\t" + p);
console.log(`BACKFILL_ROWS=${BACKFILL.length}（从未被巡检规划的产物内页面）`);

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "reshoot.tsv"), "# 身份<TAB>路由；由 scripts/qa/make-reshoot-plan.mjs 从台账派生\n" + lines.join("\n") + "\n");
fs.writeFileSync(path.join(OUT, "reverify-pages.json"), JSON.stringify({
  generatedAt: new Date().toISOString(),
  ledgerRows: rows.length, needRows: needRows.length,
  split: { 待修复: openRows.length, 已修复待复验: verifyRows.length },
  pagesNeedFrames: byPage.size, pagesInUniverse: inUniverse.length, pagesDropped: dropped.length,
  droppedPages: dropped.map((p) => ({ page: p, ids: byPage.get(p).map((r) => r.id).slice(0, 8) })),
  tsvRows: lines.length, identities: IDENTITIES,
  perPage: inUniverse.map((p) => ({ page: p, ids: byPage.get(p).map((r) => r.id), severities: [...new Set(byPage.get(p).map((r) => r.severity))] })),
}, null, 1));

console.log(`RESHOOT_PLAN ledgerRows=${rows.length} needFrames=${needRows.length}（待修复 ${openRows.length} + 已修复待复验 ${verifyRows.length}）`);
console.log(`RESHOOT_PLAN pages=${byPage.size} 在巡检全集内=${inUniverse.length} 不在=${dropped.length} TSV行=${lines.length}`);
if (dropped.length) {
  console.log("!! 以下页台账有开放条目、但本轮巡检从未到达（tour 的 filter 会静默丢掉它们，必须单独处理）：");
  for (const p of dropped) console.log(`   ${p}  ← ${byPage.get(p).map((r) => r.id).slice(0, 4).join(", ")}${byPage.get(p).length > 4 ? " …" : ""}`);
}
if (!inUniverse.length) { console.log("FAIL 可拍页集为 0：台账里没有任何开放页落在巡检全集内——这是判据坏了，不是没问题"); process.exit(2); }
const check = inUniverse.length + dropped.length === byPage.size;
console.log(`CONSERVED ${check ? "✔" : "✘"} 在集内 + 被丢 = 需帧页数：${inUniverse.length}+${dropped.length} vs ${byPage.size}`);
if (!check) process.exit(2);
console.log(`out=${path.join(OUT, "reshoot.tsv")}`);
