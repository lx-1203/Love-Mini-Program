#!/usr/bin/env node
/* 用例成本普查：把"1107 例执行轮跑不动"这句判断换成一张可复核的表。
   为什么先做这个：折叠传输层已实测（notes §12：断言折叠 0.21 s/条、单发 element 0.77 s/条、
   tap/截图各约一次调用），但"这条通道够不够跑完一轮"取决于**有多少用例只需要断言、
   多少必须交互、多少必须出帧**。不先量这个就去改执行器，就是拿最贵的路径去估全部工作量。
   分类只读 ops 清单里已有的字段（tier/pre/action/expected/evidence/requiresReal），
   不新增人工标注；每条用例都落一行，判类词命中了什么也一起落，便于人逐条复核。
   用法：node scripts/qa/case-cost-census.mjs [--ops reports/audit/round-6/ops] [--out <json>] */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join, dirname } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const OPS = resolve(REPO, arg("ops", "reports/audit/round-6/ops"));
const OUT = resolve(REPO, arg("out", ".zcode/tmp/round7/case-cost-census.json"));

/* 实测单价（秒/次调用），来自 notes §12 与本轮 CLI 计时；写成表头而不是硬编码进算式，
   是为了换机重测时只改这一处。 */
const COST = { assertion: 0.21, tap: 1.0, screenshot: 2.6, pageOpen: 3.2 };

const files = readdirSync(OPS).filter((f) => f.endsWith(".json")).sort();
if (!files.length) { console.log("CENSUS_RESULT=FAIL reason=" + OPS + " 里没有 ops 清单"); process.exit(2); }

const rows = [];
for (const f of files) {
  let j; try { j = JSON.parse(readFileSync(join(OPS, f), "utf8")); } catch { console.log("CENSUS_SKIP unreadable " + f); continue; }
  for (const c of (j.cases || [])) {
    const blob = [c.action, c.expected, c.evidence].join(" ");
    const hits = {
      screenshot: /截图|全帧|出帧|特写|EVIDENCE|视觉|像素/.test(blob),
      tap: /点击|按下|长按|双击|输入|滑动|滚动|拖|切换|勾选|选中|聚焦/.test(blob),
      route: /switchTab|navigateTo|路由|落在|跳转|返回/.test(blob),
      state: /store|data\b|localStorage|storage|getApp|isMatchOpen|配置|字段|值/.test(blob),
      node: /DOM 探测|选择器|\.[a-z][a-z0-9-]*__|节点|挂载|渲染/.test(blob),
      network: /接口|请求|响应|后端|数据库|HTTP|网络/.test(blob),
    };
    let cls = "assert-only";
    /* needs-backend 第一版写成 "提到接口且整条没写 mock" ⇒ 命中 456 条（41%），明显过火：
       多数用例的 pre 就写着"mock 构建 + 注入固化 JWT"，只是那两个词落在别的字段里。
       收紧成：pre 明确不是 mock 构建，且断言指向后端/库/HTTP 本身。 */
    const preSaysMock = /mock|固化|注入|bootstrap/i.test(String(c.pre || ""));
    const backendHard = /数据库|SQL|迁移|mvnw|Controller|Repository|HTTP ?[45]\d\d|响应体|接口字段/.test(blob);
    if (backendHard && !preSaysMock) cls = "needs-backend";
    else if (hits.tap && hits.screenshot) cls = "interact+frame";
    else if (hits.tap) cls = "interact";
    else if (hits.screenshot) cls = "frame-only";
    else if (hits.route) cls = "route-assert";
    rows.push({
      manifest: f.replace(/\.json$/, ""), id: c.id, page: c.page, tier: c.tier || "normal",
      requiresReal: c.requiresReal === true, cls,
      batchable: cls === "assert-only" || cls === "route-assert",
      calls: (cls === "assert-only" || cls === "route-assert" ? 0 : hits.tap ? 1 : 0) + (hits.screenshot ? 1 : 0),
      hits: Object.keys(hits).filter((k) => hits[k]).join(","),
    });
  }
}
if (!rows.length) { console.log("CENSUS_RESULT=FAIL reason=一条用例都没解析出来（清单形状变了？）"); process.exit(2); }

const by = {};
for (const r of rows) by[r.cls] = (by[r.cls] || 0) + 1;
const batchable = rows.filter((r) => r.batchable).length;
const needReal = rows.filter((r) => r.requiresReal).length;
const shots = rows.filter((r) => /(^|,)screenshot(,|$)/.test(r.hits)).length;
const taps = rows.filter((r) => /(^|,)tap(,|$)/.test(r.hits)).length;
// 页只开一次（同一 manifest 同页共用一次 open），断言按页分组折叠
const pageGroups = new Set(rows.map((r) => r.manifest + "|" + r.page)).size;
const seconds = pageGroups * COST.pageOpen + (rows.length - batchable) * COST.tap
  + shots * COST.screenshot + rows.length * COST.assertion;

console.log("CENSUS files=" + files.length + " cases=" + rows.length + " page-groups=" + pageGroups);
console.log("CENSUS_CLASS " + Object.keys(by).sort().map((k) => k + "=" + by[k]).join(" "));
console.log("CENSUS_BATCHABLE=" + batchable + "/" + rows.length + " (" + (batchable * 100 / rows.length).toFixed(1) + "%)");
console.log("CENSUS_TAPS=" + taps + " SCREENSHOTS=" + shots + " REQUIRES_REAL=" + needReal);
console.log("CENSUS_MODEL_CALLS open=" + COST.pageOpen + "s tap=" + COST.tap + "s shot=" + COST.screenshot + "s assert=" + COST.assertion + "s/条");
console.log("CENSUS_ESTIMATE_MINUTES=" + (seconds / 60).toFixed(1) + "（按折叠传输、每页只开一次；与 WS 通道的 r-exec 实测速度不是同一件事）");
/* 成本要按"贵在哪"拆开报，否则"折叠断言就能救执行轮"这个结论会被断言单价带走 */
const costParts = {
  open: pageGroups * COST.pageOpen, tap: (rows.length - batchable) * COST.tap,
  shot: shots * COST.screenshot, assert: rows.length * COST.assertion,
};
console.log("CENSUS_COST_SHARE " + Object.keys(costParts).map((k) => k + "=" + (costParts[k] / 60).toFixed(1) + "min(" + (costParts[k] * 100 / seconds).toFixed(0) + "%)").join(" "));
const ok = rows.length > 1000 && batchable > 0;
console.log(ok ? "CENSUS_RESULT=OK" : "CENSUS_RESULT=FAIL reason=用例数或可折叠数为 0 ⇒ 分类器没读到东西");
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), ops: OPS.replace(REPO + "/", ""), cost: COST, counts: by, batchable, cases: rows }, null, 1));
console.log("CENSUS_WRITTEN=" + OUT.replace(REPO + "/", ""));
if (!ok) process.exit(2);
