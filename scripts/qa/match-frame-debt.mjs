/* 先看"已经拍到的帧"能不能直接抵掉判据台欠的帧，再去排新的取景。
 *
 * 动因：执行轮已经落了 326 张帧（每条 EXECUTED 一张），而判据台还挂着 80+ 条 NEEDS_UI_FRAME。
 * 这些条目的判点（类名 / token）很多其实就在同一页的执行行里被问过——
 * 那时"再拍一轮"是重复劳动，该做的是**把已有证据接上**。
 * 但也有真没覆盖的（页都没打开、或判点从没被问过），那部分才是真取景债，必须如实留着。
 *
 * 只读：不改台账、不动判据台产物。输出的"可抵"清单交给 land-verdicts 那一步去落。
 * 用法：node scripts/qa/match-frame-debt.mjs [--verdicts …] [--results …]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf("--" + n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const VERDICTS = opt("verdicts", ".zcode/tmp/fixverify/verdicts.json");
const RESULTS = opt("results", "reports/audit/round-7/interact/exec-results.json");
const OUT = opt("out", "reports/audit/round-7/frame-debt-match.json");

function norm(tok) {
  const t = String(tok || "").trim();
  if (!t) return "";
  return t.startsWith(".") ? t : (/[a-z0-9]-[a-z0-9]|__|--/.test(t) ? "." + t : t);
}

const v = JSON.parse(readFileSync(join(REPO, VERDICTS), "utf8"));
const items = (v.items || []).filter((x) => (x.verdict || x.bucket) === "NEEDS_UI_FRAME");
const j = JSON.parse(readFileSync(join(REPO, RESULTS), "utf8"));
const rows = (j.results || []).filter((r) => r.status === "EXECUTED");

/* 页 → { token → {verdict, frame, id} }：一张表把"哪一帧回答过哪个判点"记清楚 */
const byPage = new Map();
for (const r of rows) {
  const m = byPage.get(r.page) || new Map();
  for (const tok of String(r.observed || "").matchAll(/(\.[A-Za-z0-9_-]+(?:__|--)[A-Za-z0-9_-]+|[A-Za-z0-9_.-]+):\s*(present\(\d+\)|absent|no-answer|ERR[^\s|]*)/g)) {
    const key = norm(tok[1]);
    if (!m.has(key)) m.set(key, { verdict: tok[2], frame: String(r.evidence || "").replace(/\(\d+B\)$/, ""), id: r.manifest + "/" + r.id, page: r.page });
  }
  byPage.set(r.page, m);
}
/* 判据台条目里给的页字段不一定与产物路由逐字一致，先按 laneFile 反查路由 */
function pagesOf(it) {
  const out = new Set();
  const lane = String(it.laneFile || "").replace(/^apps\/client\/src\//, "").replace(/\.vue$/, "");
  if (lane) for (const p of byPage.keys()) if (p === lane || p.endsWith("/" + lane.split("/").pop()) && lane.includes(p.split("/").slice(0, -1).join("/"))) out.add(p);
  if (!out.size) for (const p of byPage.keys()) if (lane && p.split("/").pop() === lane.split("/").pop()) out.add(p);
  return [...out];
}

const buckets = { ANSWERED: [], PARTIAL: [], NO_PAGE_FRAME: [], NO_TOKEN_HIT: [] };
for (const it of items) {
  const probes = (it.probes || []).map((p) => norm(p.token)).filter(Boolean);
  const pages = pagesOf(it);
  if (!pages.length) { buckets.NO_PAGE_FRAME.push({ id: it.id, page: it.laneFile, need: probes.length }); continue; }
  const hits = [], miss = [];
  for (const tk of probes) {
    let found = null;
    for (const p of pages) { const h = byPage.get(p).get(tk); if (h) { found = h; break; } }
    if (found && /present\(|absent/.test(found.verdict)) hits.push({ token: tk, ...found }); else miss.push(tk);
  }
  const rec = { id: it.id, pages, probes: probes.length, hits, miss };
  /* 判点为空 ⇒ 没有任何东西可以被"回答"，绝不能算 ANSWERED（第一版就是这里漏了，
     条目一个探针都没有却落进 ANSWERED，等于凭空抵掉一条债） */
  if (!probes.length || !hits.length) buckets.NO_TOKEN_HIT.push(rec);
  else if (miss.length) buckets.PARTIAL.push(rec);
  else buckets.ANSWERED.push(rec);
}
const n = (k) => buckets[k].length;
console.log("MATCH_INPUT 欠帧条目=" + items.length + " 有帧执行行=" + rows.length + " 覆盖页=" + byPage.size);
console.log("MATCH_ANSWERED=" + n("ANSWERED") + " PARTIAL=" + n("PARTIAL") + " NO_TOKEN_HIT=" + n("NO_TOKEN_HIT") + " NO_PAGE_FRAME=" + n("NO_PAGE_FRAME"));
buckets.PARTIAL.slice(0, 6).forEach((x) => console.log("  PARTIAL " + x.id + " 命中 " + x.hits.length + "/" + x.probes + " 缺 " + x.miss.slice(0, 3).join(",")));
buckets.ANSWERED.slice(0, 5).forEach((x) => console.log("  ANSWERED " + x.id + " 帧=" + String(x.hits[0].frame).split("/").pop() + " 判点=" + x.hits.map((h) => h.token + ":" + h.verdict).slice(0, 2).join(" ")));
writeFileSync(join(REPO, OUT), JSON.stringify({
  generatedAt: new Date().toISOString(), verdicts: VERDICTS, results: RESULTS,
  note: "只有 ANSWERED 可以直接抵债；PARTIAL/NO_* 是真取景债，必须去拍，不许并进 ANSWERED 凑数",
  buckets,
}, null, 1) + "\n");
console.log("MATCH_WRITTEN=" + relative(REPO, join(REPO, OUT)).split("\\").join("/"));
console.log(n("ANSWERED") ? "MATCH_RESULT=OK 有一部分债可以用已有帧抵，其余 " + (n("PARTIAL") + n("NO_TOKEN_HIT") + n("NO_PAGE_FRAME")) + " 条仍要新拍" : "MATCH_RESULT=NO_FREE_LUNCH 已有帧抵不掉任何一条，欠帧只能去拍");
