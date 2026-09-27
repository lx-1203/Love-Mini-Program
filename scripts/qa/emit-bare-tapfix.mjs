/**
 * 把"正文里已经有裸类名、只是执行器抠不到"的那批用例**机械地**补成显式 tapTarget。
 *
 * 为什么用脚本而不是派复核员：这类条的判据正文本来就写着 `.title-input` 这种目标，
 * 只差抄进 tapTarget 字段（执行器 line 398 是 `c.tapTarget ? [c.tapTarget] : []`，
 * 显式目标原样用、不再走 BEM 正则）。让模型再"读一遍源码点名"是把它已经写下来的东西重新猜一遍，
 * 既慢又会改到动词；脚本可审计、可重跑、歧义时宁可交给复核员。
 *
 * 保守边界（三条都不满足就整条退回 unverifiable，绝不凑数）：
 *   1. 类名逐字出现在该页源码文件里；
 *   2. 命中行本身或 ±EVENT_WINDOW 行内挂着事件绑定（@tap/@click/bindtap/@input/@change/@confirm）
 *      —— 只有样式没有事件的类不是"能被点到的东西"；
 *   3. 满足 1+2 的候选只有一个。多个候选 = 需要人判断点哪个，交回去。
 * 另：只处理"该页所有待补条都是裸类名"的页（lane 产物按页闭合，合并器要求条数逐页闭合，
 * 半份 lane 会被整份拒绝）。混有待点名的页留给复核员。
 *
 * 用法：node scripts/qa/emit-bare-tapfix.mjs [--census …] [--briefs …] [--dry]
 * 退出码：0=正常出产物，1=有整页可闭合却一条都没闭合（口径又不一致），2=前置件缺失。
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const argv = process.argv.slice(2);
const has = (f) => argv.includes("--" + f);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const CENSUS = resolve(REPO, arg("census", "reports/audit/round-7/tap-target-census.json"));
const BRIEFS = resolve(REPO, arg("briefs", "reports/audit/round-7/tapfix-briefs"));
const OPS = resolve(REPO, arg("ops", "reports/audit/round-6/ops"));
const EVENT_WINDOW = 2;
const BARE_CLS_RE = /\.([a-z][a-z0-9]*(?:-[a-z0-9]+)+)/g;
const EVENT_RE = /@(tap|click|input|change|confirm|blur|focus|longpress|error|success)\b|bindtap\s*=/i;

if (!existsSync(CENSUS)) { console.log("BARE_TAPFIX_RESULT=FAIL reason=普查不存在 " + CENSUS); process.exit(2); }
if (!existsSync(BRIEFS)) { console.log("BARE_TAPFIX_RESULT=FAIL reason=简报目录不存在 " + BRIEFS); process.exit(2); }
const census = JSON.parse(readFileSync(CENSUS, "utf8"));

/* 简报里带 outFile 与 lane→页 的对应，合并器按 outFile 找产物，所以路径必须由简报派生而不是自造。 */
const laneByPage = new Map();
for (const f of readdirSync(BRIEFS).filter((x) => /^\d+\.json$/.test(x)).sort()) {
  const j = JSON.parse(readFileSync(join(BRIEFS, f), "utf8"));
  for (const l of j.lanes || []) if (!laneByPage.has(l.lane)) laneByPage.set(l.lane, l);
}

const srcCache = new Map();
const srcLines = (relPath) => {
  if (!srcCache.has(relPath)) {
    const p = join(REPO, relPath);
    srcCache.set(relPath, existsSync(p) ? readFileSync(p, "utf8").split(/\r?\n/) : null);
  }
  return srcCache.get(relPath);
};
const opsCache = new Map();
const caseOf = (manifest, id) => {
  if (!opsCache.has(manifest)) {
    const p = join(OPS, manifest + ".json");
    opsCache.set(manifest, existsSync(p) ? new Map((JSON.parse(readFileSync(p, "utf8")).cases || []).map((c) => [c.id, c])) : new Map());
  }
  return opsCache.get(manifest).get(id) || null;
};

/* 在一个源码文件里给一个裸类名找"挂着事件的命中行"：返回 {line, ambiguous} */
function locate(lines, cls) {
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes(cls)) continue;
    let withEvent = false;
    for (let k = Math.max(0, i - EVENT_WINDOW); k <= Math.min(lines.length - 1, i + EVENT_WINDOW); k++) {
      if (EVENT_RE.test(lines[k])) { withEvent = true; break; }
    }
    if (withEvent) hits.push(i + 1);
  }
  return hits;
}

let pagesClosed = 0, casesOk = 0, casesBack = 0, pagesSkippedMixed = 0;
const report = [];
for (const p of census.pages) {
  const allBare = p.missing.every((m) => m.bareOnly);
  if (!allBare) { pagesSkippedMixed++; continue; }
  const laneBrief = laneByPage.get(p.page);
  if (!laneBrief) { report.push(`页 ${p.page} 在简报里没有对应 lane（outFile 无从派生）⇒ 留给复核员`); pagesSkippedMixed++; continue; }
  const rel = p.sourceFile || laneBrief.sourceFile || "";
  const lines = rel ? srcLines(rel.replace(/\\/g, "/")) : null;
  const cases = [], unf = [];
  for (const m of p.missing) {
    const oc = caseOf(m.manifest, m.id) || {};
    const actionText = String(oc.action || m.action || "");
    const uniq = [...new Set([...actionText.matchAll(BARE_CLS_RE)].map((x) => "." + x[1]))];
    if (!lines) { unf.push({ id: m.id, manifest: m.manifest, page: p.page, reason: "该页源码没定位到，抄不了行号", needsCarrier: "复核员先定位 .vue" }); continue; }
    const good = [];
    for (const cls of uniq) { const h = locate(lines, cls); if (h.length) good.push({ cls, line: h[0], n: h.length }); }
    if (good.length !== 1) {
      unf.push({ id: m.id, manifest: m.manifest, page: p.page, reason: good.length ? "候选目标不止一个：" + good.map((g) => g.cls).join("、") : "正文里的裸类名在源码里没挂着事件绑定", needsCarrier: "人判点哪个（或补 WS 手势腿）" });
      continue;
    }
    const g = good[0];
    cases.push({
      id: m.id, manifest: m.manifest, page: p.page,
      selector: g.cls, file: rel.replace(/\\/g, "/"), line: g.line,
      oldAction: String(oc.action || ""), newAction: String(oc.action || ""),
      needsIdentity: "", why: "判据正文已逐字写着 " + g.cls + "，执行器只抠 BEM 形态所以抠不到；本条不改一个字，只把它抄进 tapTarget",
    });
  }
  const out = {
    lane: p.page,
    counts: { planned: p.missing.length, ok: cases.length, unverifiable: unf.length },
    cases, unverifiable: unf,
    producer: "scripts/qa/emit-bare-tapfix.mjs（机械抄自判据正文，未改动词未改文案）",
  };
  if (out.counts.planned !== out.counts.ok + out.counts.unverifiable) {
    report.push(`页 ${p.page} 条数不闭合 planned=${out.counts.planned} ok+unf=${out.counts.ok + out.counts.unverifiable} ⇒ 不出这份 lane`);
    continue;
  }
  if (!has("dry")) writeFileSync(resolve(REPO, laneBrief.outFile), JSON.stringify(out, null, 1));
  pagesClosed++; casesOk += cases.length; casesBack += unf.length;
  report.push(`${has("dry") ? "[dry] " : ""}${laneBrief.outFile} 页=${p.page} 补=${cases.length} 退回=${unf.length}`);
}
for (const r of report) console.log("  " + r);
console.log(`BARE_TAPFIX 页闭合=${pagesClosed} 混排留给复核=${pagesSkippedMixed} 补上目标=${casesOk} 退回人判=${casesBack} dry=${has("dry") ? "yes" : "no"}`);
const closable = census.pages.filter((x) => x.missing.length && x.missing.every((m) => m.bareOnly)).length;
if (pagesClosed === 0 && closable > 0) { console.log(`BARE_TAPFIX_RESULT=FAIL reason=有 ${closable} 页整页都是裸类名却一条都没闭合 ⇒ 脚本口径与普查口径又不一致了`); process.exit(1); }
console.log("BARE_TAPFIX_RESULT=PASS");
process.exit(0);
