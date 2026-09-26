#!/usr/bin/env node
/* 合并并**独立复核**各 lane 交回来的"交互判点点名"结果。
   为什么不直接信 lane：lane 的输出是一条判据被改写后的样子，它一旦写错，
   下一轮执行器就会拿着不存在的类名去点，点不到 ⇒ 又被读成"产品没做"。
   所以这里逐条重做三件事，全部用文件现场重算，不看 lane 的自述：
     1. selector 真的出现在它声称的 file 的那一行（行号对得上、类名逐字对得上）；
     2. lane 的 planned 与普查表里该页的 missing 条数一致，且 planned == ok + unverifiable；
     3. lane 声称的 id 确实在这条页的 missing 清单里（防止凭空多写或漏写）。
   通过校验的条目可以 --apply 写回判据台（ops/*.json 的 action 字段，带备份）；
   不通过的条目一律不写，并把拒绝原因打出来。
   用法：node scripts/qa/merge-tapfix-lanes.mjs [--lanes a,b,c] [--apply] */
import { readFileSync, writeFileSync, existsSync, readdirSync, copyFileSync } from "node:fs";
import { join, resolve } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const APPLY = argv.includes("--apply");
const CENSUS = resolve(REPO, arg("census", "reports/audit/round-7/tap-target-census.json"));
const OPS = resolve(REPO, arg("ops", "reports/audit/round-6/ops"));
const OUT = resolve(REPO, "reports/audit/round-7");
const laneFiles = (arg("lanes", "") || "").split(",").map((s) => s.trim()).filter(Boolean)
  .map((s) => resolve(REPO, s));
const found = laneFiles.length ? laneFiles
  : readdirSync(OUT).filter((f) => /^tapfix-lane-.*\.json$/.test(f)).map((f) => join(OUT, f));

if (!existsSync(CENSUS)) { console.log("TAPFIX_RESULT=FAIL reason=普查表不存在 " + CENSUS); process.exit(2); }
if (!found.length) { console.log("TAPFIX_RESULT=FAIL reason=没有任何 lane 产物（tapfix-lane-*.json），空集合不许当通过"); process.exit(2); }

const census = JSON.parse(readFileSync(CENSUS, "utf8"));
const censusPages = new Map((census.pages || []).map((p) => [p.page, p]));
const srcCache = new Map();
const readSrc = (rel) => {
  if (!srcCache.has(rel)) {
    const f = join(REPO, rel);
    srcCache.set(rel, existsSync(f) ? readFileSync(f, "utf8").replace(/\r\n/g, "\n").split("\n") : null);
  }
  return srcCache.get(rel);
};

const accepted = [], rejected = [];
for (const lf of found) {
  const tag = lf.split(/[\\/]/).pop();
  if (!existsSync(lf)) { rejected.push({ lane: tag, id: "(整份)", why: "文件不存在" }); continue; }
  let lane;
  try { lane = JSON.parse(readFileSync(lf, "utf8")); } catch (e) { rejected.push({ lane: tag, id: "(整份)", why: "读不出 JSON：" + String(e.message).slice(0, 60) }); continue; }
  const cp = censusPages.get(lane.lane);
  if (!cp) { rejected.push({ lane: tag, id: "(整份)", why: "普查表里没有这一页：" + lane.lane }); continue; }
  const missingIds = new Set((cp.missing || []).map((m) => m.id));
  const planned = (cp.missing || []).length;
  const ok = (lane.cases || []).length, unf = (lane.unverifiable || []).length;
  console.log("TAPFIX_LANE " + tag + " 页=" + lane.lane + " 普查应补=" + planned +
    " lane自报[planned=" + (lane.counts && lane.counts.planned) + ",ok=" + ok + ",unverifiable=" + unf + "]" +
    " 实际 ok+unverifiable=" + (ok + unf));
  /* 守恒按"普查应补"这条硬线判，不按 lane 自报的数字：自报的 planned 写错时，
     只比 lane 内部三个数会一样"闭合"。 */
  if (ok + unf !== planned) {
    rejected.push({ lane: tag, id: "(整页)", why: "条数不闭合：普查要 " + planned + " 条，lane 只给了 " + (ok + unf) + " 条 ⇒ 整份不采信" });
    continue;
  }
  if (lane.counts && lane.counts.planned !== planned) {
    console.log("TAPFIX_WARN " + tag + " 自报 planned=" + lane.counts.planned + " 与普查 " + planned + " 不符（以普查为准）");
  }
  for (const c of (lane.cases || [])) {
    const why = [];
    if (!missingIds.has(c.id)) why.push("id 不在该页待补清单里");
    if (!/^\.[A-Za-z][\w-]*([.#][\w-]+)*$/.test(String(c.selector || ""))) why.push("selector 形态不对：" + c.selector);
    const lines = readSrc(c.file || "");
    if (!lines) why.push("承载文件读不到：" + c.file);
    else {
      const ln = Number(c.line);
      if (!(ln >= 1 && ln <= lines.length)) why.push("行号越界：" + c.line);
      else if (!String(lines[ln - 1]).includes(String(c.selector).replace(/^\./, "").split(/[.#]/)[0])) why.push("第 " + c.line + " 行里没有这个类名片段");
      if (!lines.join("\n").includes(String(c.selector).replace(/^\./, ""))) why.push("整份文件里没有这个类名");
    }
    if (!c.newAction || !String(c.newAction).includes(String(c.selector || "@@none@@"))) why.push("newAction 没点名 selector");
    /* 语义守恒：补目标不许顺手换动词。实测有 lane 为了让执行器走点击腿，
       把「输入 xxx」改写成「预置/敲 xxx」——那等于把一条输入框判据改成了按钮判据，
       通过率低是因为测错了东西，而不是东西没做。动词必须逐字保留。 */
    const VERBS = ["点击", "输入", "长按", "双击", "滚动", "滑动", "拖动", "下拉", "勾选", "聚焦", "失焦"];
    const oldVerbs = VERBS.filter((v) => String(c.oldAction || "").includes(v));
    const newVerbs = VERBS.filter((v) => String(c.newAction || "").includes(v));
    const lost = oldVerbs.filter((v) => !newVerbs.includes(v));
    const added = newVerbs.filter((v) => !oldVerbs.includes(v));
    if (lost.length || added.length) {
      why.push("改写换了交互动词（丢了：" + (lost.join("/") || "无") + "；多了：" + (added.join("/") || "无") + "）⇒ 判据测的东西被换了，不接受");
    }
    if (why.length) rejected.push({ lane: tag, id: c.id, why: why.join(" / "), selector: c.selector, file: c.file, line: c.line });
    else accepted.push({ lane: tag, id: c.id, manifest: c.manifest, page: lane.lane, selector: c.selector, oldAction: c.oldAction, newAction: c.newAction, file: c.file, line: c.line, needsIdentity: c.needsIdentity || "" });
  }
  for (const u of (lane.unverifiable || [])) {
    if (!missingIds.has(u.id)) rejected.push({ lane: tag, id: u.id, why: "标了 unverifiable 但 id 不在该页待补清单里" });
  }
}

console.log("TAPFIX_ACCEPTED=" + accepted.length + " REJECTED=" + rejected.length +
  " 普查缺口=" + (census.totals ? census.totals.actionMissingSelector : "?"));
for (const r of rejected.slice(0, 25)) console.log("TAPFIX_REJECT " + r.lane + " " + r.id + " :: " + r.why);
writeFileSync(join(OUT, "tapfix-merged.json"), JSON.stringify({
  generatedAt: new Date().toISOString(), census: CENSUS.replace(REPO + "/", "").split("\\").join("/"),
  lanes: found.map((f) => f.replace(REPO + "/", "").split("\\").join("/")),
  accepted, rejected,
}, null, 1));
console.log("TAPFIX_WRITTEN=" + join(OUT, "tapfix-merged.json"));

if (!APPLY) { console.log("TAPFIX_RESULT=DRY 只出计划；核对过再自己加 --apply"); process.exit(0); }
if (!accepted.length) { console.log("TAPFIX_RESULT=FAIL reason=零条通过校验，ops 一个字都不改"); process.exit(2); }
const byManifest = new Map();
for (const a of accepted) {
  if (!byManifest.has(a.manifest)) byManifest.set(a.manifest, []);
  byManifest.get(a.manifest).push(a);
}
let written = 0;
for (const [mf, items] of byManifest) {
  const f = join(OPS, mf + ".json");
  if (!existsSync(f)) { console.log("TAPFIX_SKIP_MANIFEST 读不到 " + mf + ".json"); continue; }
  copyFileSync(f, f + ".pre-tapfix.bak");
  const j = JSON.parse(readFileSync(f, "utf8"));
  const want = new Map(items.map((x) => [x.id, x]));
  for (const c of (j.cases || [])) {
    const hit = want.get(c.id);
    if (!hit) continue;
    c.action = hit.newAction;
    c.tapTarget = hit.selector;
    c.tapTargetEvidence = hit.file + ":" + hit.line;
    if (hit.needsIdentity) c.needsIdentity = hit.needsIdentity;
    want.delete(c.id);
  }
  if (want.size) { console.log("TAPFIX_MISSING " + mf + " 有 " + want.size + " 个 id 在该 manifest 里找不到：" + [...want.keys()].join(",")); continue; }
  writeFileSync(f, JSON.stringify(j, null, 1) + "\n");
  written += items.length;
  console.log("TAPFIX_APPLIED " + mf + " 改写=" + items.length + " 备份=" + f.split(/[\\/]/).pop() + ".pre-tapfix.bak");
}
console.log("TAPFIX_RESULT=" + (written ? "OK" : "FAIL") + " 落盘 action 条数=" + written + "（被拒 " + rejected.length + " 条未改）");
process.exit(written ? 0 : 2);
