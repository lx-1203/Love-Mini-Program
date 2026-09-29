#!/usr/bin/env node
/* 从执行轮结果文件**派生**一份检查点（checkpoint），给终报的前置体检用。
 *
 * 为什么要它：报告的前置体检要 `tmp/qa/checkpoints/exec-R<n>.json`。那个文件本来是 WS 版
 * 执行器（r-exec.cjs）边跑边写的；round-7 的两刀是用桥版执行器（r-exec-cli.mjs）跑的，
 * 它只在结束时写结果文件，所以检查点天然不存在。
 * 两条路：① 假装没有检查点把报告跳过去；② 从已有的真实行里派生一份，并**写明它是派生的**。
 * 选 ②，因为每个字段都能从结果文件里查到出处：suites 的组名、executed/failed 计数、
 * executedCaseIds 全部来自已落的行。唯一取不到的是 startedAt（结果文件没记开跑时刻）⇒
 * 老老实实写 null 并在 note 里说明，不拿 updatedAt 冒充开跑时间。
 *
 * 用法：node scripts/qa/exec-results-to-checkpoint.mjs --results <f> [--out tmp/qa/checkpoints/exec-R7.json]
 *                                                  [--round R7] [--script scripts/qa/r-exec-cli.mjs]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const RS = (p) => String(p).split("\\").join("/").replace(REPO.split("\\").join("/") + "/", "");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const RES = resolve(REPO, arg("results", "reports/audit/round-7/interact/exec-results.json"));
if (!existsSync(RES)) { console.log("CKPT_RESULT=FAIL reason=结果文件不存在 " + RES); process.exit(2); }
const j = JSON.parse(readFileSync(RES, "utf8"));
const rows = Array.isArray(j.results) ? j.results : null;
if (!rows || !rows.length) { console.log("CKPT_RESULT=FAIL reason=结果文件没有 results[]（空集不得派生检查点）"); process.exit(2); }

const suites = {};
for (const r of rows) {
  /* 组键必须用行里的 `suite`（形如 "C-PAGES-HOME-INDEX"）而不是 `manifest`：
     verify-state-truth 拿 `${suite}|${manifest}|${id}` 与权威件对齐，键体系不一致会让 29 个组
     一个都对不上（实测踩过），而那看起来像"两份产物不同源"，其实是我造错了键。 */
  const key = String(r.suite || ("C-" + r.manifest));
  if (!suites[key]) suites[key] = { status: "completed", manifest: r.manifest, executedCaseIds: [], executed: 0, failed: 0, skipped: 0, reconnects: 0, finishedAt: null };
  const s = suites[key];
  if (r.status === "EXECUTED") { s.executed++; s.executedCaseIds.push(r.id); }
  else if (r.status === "FAILED") { s.failed++; s.executedCaseIds.push(r.id); }
  else s.skipped++;
  s.finishedAt = j.updatedAt || null;
}
const counts = Object.values(suites).reduce((a, s) => ({ executed: a.executed + s.executed, failed: a.failed + s.failed, skipped: a.skipped + s.skipped }), { executed: 0, failed: 0, skipped: 0 });
const sum = counts.executed + counts.failed + counts.skipped;
if (sum !== rows.length) { console.log("CKPT_RESULT=FAIL reason=分桶加起来 " + sum + " ≠ 行数 " + rows.length + "（守恒不成立就不写）"); process.exit(2); }

/* failures[] 逐条从权威结果行的 failureReason 搬过来（不是空数组）：
   verify-state-truth 就是拿它核"每条 FAILED 有没有明细"，而 WS 版执行器历史上一律写空，
   被点过名（"282 条失败但 failures[] 永远为空"）。派生件没有这个包袱——明细本来就在行里。 */
const failures = rows.filter((r) => r.status === "FAILED").map((r) => ({
  suite: r.suite || ("C-" + r.manifest), manifest: r.manifest, id: r.id, page: r.page,
  reason: String(r.failureReason || "(行里没有 failureReason)").slice(0, 200),
  observed: String(r.observed || "").slice(0, 200), at: j.updatedAt || null,
}));
if (failures.length !== counts.failed) { console.log("CKPT_RESULT=FAIL reason=failures[] 条数 " + failures.length + " ≠ 状态计数 " + counts.failed); process.exit(2); }

const out = resolve(REPO, arg("out", join("tmp/qa/checkpoints", "exec-" + arg("round", "R7") + ".json")));
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({
  round: arg("round", "R7"), gitSha: j.gitSha || "unknown",
  /* #C-2：源件的顶层戳现在只表示"最后一次写盘那次启动的 HEAD"，逐行带的分布必须一起带下来，
     否则这个派生件又把跨了几次启动的账读成一次跑的账（下游按单戳核对时必然假红/假绿）。 */
  gitShaScope: j.gitShaScope || (j.gitSha ? "file-scalar（源件由 #C-2 修复之前的执行器写出，只有文件头一枚戳）" : "unknown"),
  rowShas: j.rowShas || null, mergedFrom: j.mergedFrom || null,
  rowsWithOwnSha: rows.filter((r) => r.gitSha).length,
  script: arg("script", j.runner || "scripts/qa/r-exec-cli.mjs"),
  startedAt: null, suites, failures, updatedAt: j.updatedAt || new Date().toISOString(),
  derived: true, derivedFrom: RS(RES),
  note: "本检查点由结果文件派生（桥版执行器不写逐组检查点）。组名/计数/executedCaseIds 全部来自真实行；"
    + "startedAt 结果文件里没有，故记 null 而不是拿 updatedAt 冒充。identity=" + (j.identity || "?") + " verify=" + (j.loginVerify || "?"),
}, null, 1));
console.log("CKPT_SHA 顶层=" + (j.gitSha || "unknown") + "（" + String(j.gitShaScope || "源件只有文件头一枚戳") + "）"
  + " 行内自报带的行数=" + rows.filter((r) => r.gitSha).length + "/" + rows.length
  + (j.rowShas ? " 逐行带分布=" + Object.keys(j.rowShas).sort().map((k) => k + "=" + j.rowShas[k]).join(" ") : " 源件无逐行带分布")
  + ((j.mergedFrom && j.mergedFrom.length) ? " 历次启动=" + j.mergedFrom.map((m) => m.gitSha + "(" + m.rows + "行)").join(",") : ""));
console.log("CKPT_SUITES=" + Object.keys(suites).length + " rows=" + rows.length + " executed=" + counts.executed + " failed=" + counts.failed + " skipped=" + counts.skipped + " 守恒=yes");
console.log("CKPT_RESULT=OK 写出 " + RS(out) + "（派生件，note 里写明来源）");
