#!/usr/bin/env node
/* 复核「判定手 lane」交回来的东西，再把通过的那部分变成台账补丁计划。
 *
 * 为什么不直接信 lane：它说某条其实早就修好了，凭的是"我打开了这一行"。
 * 本项目里"继承来的状态其实是假的"已经犯过太多次，也包括我自己写的工具判错过别人。
 * 所以这里逐条重开文件：currentAnchor 指向的那一行必须真的存在，且 currentText 的
 * 关键片段必须真的在那一行里（压掉空白差异后子串匹配）。对不上就点名，不给过。
 *
 * 产出：
 *   reports/audit/round-7/cellplan-round7-openqueue.json  —— 只含通过复核的 ALREADY_FIXED，交给
 *                                                            patch-ledger-cells.mjs（默认 dry）
 *   控制台 OPENQ_*                                        —— 通过/不通过/待重判的分桶
 *
 * 用法：node scripts/qa/verify-openqueue-lanes.mjs [--lanes G,H] [--src apps/client]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const LANES = arg("lanes", "G,H").split(",").map((s) => s.trim()).filter(Boolean);
const DIR = resolve(REPO, "reports/audit/round-7");
const LEDGER = resolve(REPO, arg("ledger", "reports/audit/round-6/issue-matrix.md"));
const VERDICTS = ["ALREADY_FIXED", "CRITERION_VAGUE", "FIX_NEEDED", "NOT_DETERMINABLE"];
/* --hold id1,id2：锚点过复核、但编排层另外读到语义冲突的条目，宁可扣住交人也不自动改判。
   （例：PUBLISH-004 的 lane 自己就指出判据要的 --r-lg=20rpx 与"改为 --r-lg"不等值，
   这种"值对不对"的问题机器锚点检查看不出来，不能跟着 11 条一起自动写绿。） */
const HOLD = new Set(arg("hold", "").split(",").map((s) => s.trim()).filter(Boolean));

const lines = readFileSync(LEDGER, "utf8").split(/\r?\n/);
const rowOf = new Map();
lines.forEach((l, i) => {
  if (!/^\|\s*MP-/.test(l)) return;
  const c = l.split("|").map((x) => x.trim());
  rowOf.set(c[1], { n: i + 1, cols: c });
});

const cache = new Map();
function readSrc(rel) {
  if (!cache.has(rel)) {
    let t = null;
    try { t = readFileSync(join(REPO, rel), "utf8").split(/\r?\n/); } catch { t = null; }
    cache.set(rel, t);
  }
  return cache.get(rel);
}
const squash = (s) => String(s || "").replace(/\s+/g, "").toLowerCase();
function checkAnchor(rel, n, claimedText) {
  const src = readSrc(rel);
  if (!src) return { ok: false, why: "文件读不到" };
  if (!(n >= 1 && n <= src.length)) return { ok: false, why: "行号越界（文件 " + src.length + " 行）" };
  const line = src[n - 1];
  if (!claimedText) return { ok: true, line, why: "没有声称原文，只核了行存在" };
  const a = squash(claimedText).slice(0, 40);
  if (!a) return { ok: true, line };
  if (squash(line).includes(a)) return { ok: true, line };
  const win = src.slice(Math.max(0, n - 4), Math.min(src.length, n + 3)).map((x, i) => [n - 3 + i, x])
    .find(([, x]) => squash(x).includes(a));
  return win ? { ok: true, line, why: "原文在第 " + win[0] + " 行（标到 " + n + "，漂移 " + (win[0] - n) + "）", drift: true }
    : { ok: false, why: "该行没有声称的原文", line };
}

const patches = [], passed = [], failed = [], held = [];
for (const tag of LANES) {
  const f = join(DIR, "openqueue-lane-" + tag + ".json");
  if (!existsSync(f)) { failed.push([tag, "(整桶文件缺失)"]); continue; }
  let j;
  try { j = JSON.parse(readFileSync(f, "utf8")); } catch (e) { failed.push([tag, "JSON 解析失败：" + String(e.message).slice(0, 60)]); continue; }
  if (j.readOnly !== true) failed.push([tag, "没声明 readOnly:true"]);
  for (const it of (j.items || [])) {
    const row = rowOf.get(it.id);
    if (!row) { failed.push([it.id, "台账里没有这个 id（凭空判定）"]); continue; }
    if (!VERDICTS.includes(it.verdict)) { failed.push([it.id, "verdict 不受控：" + it.verdict]); continue; }
    const m = /^([\w@/.\-]+\.(?:vue|ts|js|scss|json|java)):(\d+)/.exec(it.currentAnchor || "");
    if (!m) { failed.push([it.id, "没给 currentAnchor：" + (it.currentAnchor || "(空)")]); continue; }
    const ck = checkAnchor(m[1], Number(m[2]), it.currentText);
    if (!ck.ok) { failed.push([it.id, "依据复核不过 @ " + it.currentAnchor + " —— " + ck.why]); continue; }
    if (it.verdict === "ALREADY_FIXED" && !HOLD.has(it.id)) {
      passed.push([it.id, it.currentAnchor + (ck.drift ? "（漂移）" : ""), row.cols[6].slice(0, 18)]);
      const newStatus = "已修复（产物侧已见，lane-" + tag + " 当轮复核；判据台基线 874ff52f）";
      const newEvid = it.currentAnchor + " 现值：" + String(ck.line || "").trim().slice(0, 70);
      patches.push({ id: it.id, col: 6, new: newStatus, why: "lane-" + tag + " 判定 ALREADY_FIXED，锚点已过机器复核" });
      patches.push({ id: it.id, col: 9, new: newEvid, why: "把当轮亲眼看到的行原文写进 statusEvidence" });
    } else {
      held.push([it.id, it.verdict, (it.proposedCriterion || it.proposedChange || it.why || "").slice(0, 70)]);
    }
  }
}

writeFileSync(join(DIR, "cellplan-round7-openqueue.json"), JSON.stringify({
  generatedAt: new Date().toISOString(), source: "verify-openqueue-lanes.mjs", lanes: LANES,
  note: "只含通过锚点复核的 ALREADY_FIXED；CRITERION_VAGUE/FIX_NEEDED 一律不动台账，交人决定",
  patches,
}, null, 1));
console.log("OPENQ_PASSED=" + passed.length + " HELD=" + held.length + " REJECTED=" + failed.length + " PATCHES=" + patches.length);
passed.forEach((x) => console.log("  PASS " + x[0] + " @ " + x[1] + "（原判 " + x[2] + "）"));
held.forEach((x) => console.log("  HOLD " + x[0] + " = " + x[1] + " :: " + x[2]));
failed.forEach((x) => console.log("  FAIL " + x[0] + " :: " + x[1]));
console.log("OPENQ_RESULT=" + (failed.length ? "PARTIAL（有 lane 的依据没过复核，见 FAIL 行）" : "OK") + " 计划已写 cellplan-round7-openqueue.json（默认 dry，要改台账跑 patch-ledger-cells --apply）");
