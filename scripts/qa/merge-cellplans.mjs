/* 把多条 lane 产出的 cellplan 合成一次台账写入。
 *
 * 为什么必须有这一步：lane 各自只写自己的 JSON 是刻意的（并发写同一个台账文件会互相覆盖，
 * 本项目真发生过），但**合并**只能有一个写者。合并前必须先查两件事：
 *   ① 同一条 lane 的 id 在台账里唯一命中（patch-ledger-cells 自己会查，先 dry 一遍就露出来）；
 *   ② 跨 lane 的 (id, col) 冲突 —— 两份计划改同一格时，"按顺序应用"等于后一份悄悄吃掉前一份，
 *      那就是没有记录的改判。冲突必须点名，不许靠顺序解决。
 *
 * 用法：node scripts/qa/merge-cellplans.mjs --plan a.json --plan b.json [--apply]
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const PLANS = argv.reduce((a, v, i) => (argv[i - 1] === "--plan" ? a.concat(v) : a), []);
const APPLY = argv.includes("--apply");
const LEDGER = argv.reduce((a, v, i) => (argv[i - 1] === "--ledger" ? v : a), "reports/audit/round-6/issue-matrix.md");
const NODE = process.execPath;
if (!PLANS.length) { console.log("MERGE_RESULT=FAIL reason=一个 --plan 都没给（没东西可合并不算成功）"); process.exit(2); }
for (const p of PLANS) if (!existsSync(join(REPO, p)) && !existsSync(p)) { console.log("MERGE_RESULT=FAIL reason=计划文件不存在 " + p); process.exit(2); }

const cells = new Map();
const problems = [];
for (const p of PLANS) {
  let j;
  try { j = JSON.parse(readFileSync(existsSync(join(REPO, p)) ? join(REPO, p) : p, "utf8")); }
  catch (e) { problems.push(p + " 解析失败：" + String(e.message).slice(0, 60)); continue; }
  const patches = Array.isArray(j.patches) ? j.patches : [];
  if (!patches.length) problems.push(p + " patches 为空（这条 lane 什么都没产出，不能算交付）");
  for (const x of patches) {
    if (!x.id || !x.col || typeof x.new !== "string") { problems.push(p + " 有条目缺 id/col/new：" + JSON.stringify(x).slice(0, 80)); continue; }
    if (/[|]/.test(x.new)) problems.push(p + " :: " + x.id + " col" + x.col + " 的新内容里有竖线 ⇒ 会把台账表格撑坏");
    const k = x.id + "#" + x.col;
    if (cells.has(k)) problems.push("跨计划冲突 " + k + " 同时出现在 " + cells.get(k) + " 与 " + p + "（按顺序应用=后者悄悄吃掉前者）");
    else cells.set(k, p);
  }
  console.log("MERGE_PLAN " + p + " patches=" + patches.length + " ids=" + new Set(patches.map((x) => x.id)).size);
}
if (problems.length) {
  problems.forEach((m) => console.log("  MERGE_PROBLEM " + m));
  console.log("MERGE_RESULT=FAIL reason=" + problems.length + " 处冲突/畸形，先解决再写台账（不靠应用顺序掩盖）");
  process.exit(2);
}

function run(plan, extra) {
  const args = [join(REPO, "scripts", "qa", "patch-ledger-cells.mjs"), "--plan",
    (existsSync(join(REPO, plan)) ? join(REPO, plan) : plan), "--ledger", LEDGER].concat(extra);
  try { return { ok: true, out: execFileSync(NODE, args, { cwd: REPO, encoding: "utf8", timeout: 120000 }) }; }
  catch (e) { return { ok: false, out: String((e && (e.stdout || e.message)) || e).replace(/\s+/g, " ").slice(0, 300) }; }
}
let bad = 0;
for (const p of PLANS) {
  const r = run(p, []);
  console.log("MERGE_DRY " + p + " " + (r.ok && /CELLPATCH_RESULT=DRY/.test(r.out) ? "OK" : "FAIL :: " + r.out.slice(0, 200)));
  if (!r.ok || !/CELLPATCH_RESULT=DRY/.test(r.out)) bad++;
}
if (bad) { console.log("MERGE_RESULT=FAIL reason=" + bad + " 份计划 dry-run 没过 ⇒ 一律不写盘"); process.exit(2); }
if (!APPLY) { console.log("MERGE_RESULT=DRY 合计 " + cells.size + " 格，全部 dry 通过；加 --apply 才写台账"); process.exit(0); }
for (const p of PLANS) {
  const r = run(p, ["--apply"]);
  const okLine = (r.out.match(/CELLPATCH_RESULT=[^\n]*/) || ["(无结果行)"])[0];
  console.log("MERGE_APPLY " + p + " " + okLine + (r.ok ? "" : " :: stderr=" + r.out.slice(0, 120)));
  if (!r.ok || !/CELLPATCH_RESULT=OK/.test(r.out)) { console.log("MERGE_RESULT=FAIL reason=" + p + " 应用失败 ⇒ 后面几份不再应用（半写状态要立刻知道）"); process.exit(2); }
}
const lv = (() => {
  try { return execFileSync(NODE, [join(REPO, "scripts", "qa", "verify-ledger.mjs"), dirname(join(REPO, LEDGER))], { cwd: REPO, encoding: "utf8", timeout: 300000 }); }
  catch (e) { return String((e && e.stdout) || e.message); }
})();
const shape = (lv.match(/LEDGER_SHAPE_DECLARED_COLS=[^\n]*/) || [""])[0];
const verdict = (lv.match(/LEDGER_RESULT=[^\n]*/) || ["(读不到结论)"])[0];
console.log("MERGE_POSTVERIFY " + shape);
console.log("MERGE_RESULT=" + (/LEDGER_RESULT=PASS/.test(verdict) ? "OK" : "FAIL") + " " + verdict);
process.exit(/LEDGER_RESULT=PASS/.test(verdict) ? 0 : 2);
