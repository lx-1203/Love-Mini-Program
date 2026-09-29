#!/usr/bin/node
/* 负例（刀一 #C-2）：续跑把"上一 boot 跑的行"盖上"本 boot 的 HEAD"⇒ 假归因（回填戳记）。
   本测试跑**两次启动的夹具**：第一次写盘、第二次 resume，断言第一批行仍然带着第一枚戳。
   口径从 scripts/qa/r-exec-cli.mjs 现抠 stampMerged()/fileStampHeader()（同一份实现，
   与 scripts/qa/census-tap-targets.mjs:46-72 抠 classesOf 的做法一致），不在测试里另抄合并逻辑。
   空转防护：同一份夹具再过一遍"修复前的形状"（合并后整份盖一枚新戳），那条必须违反同一条判据。
   跑法：PATH=<node22 目录>:$PATH node scripts/qa/test-exec-row-sha.cjs
   聚合器认的输出：SUMMARY: assertion failures = N（run-qa-selftests.mjs:45-51）+ ROWSHA_TEST=PASS|FAIL */
"use strict";
const fs = require("node:fs");
const path = require("node:path");

const REPO = path.resolve(__dirname, "..", "..");
const EXEC = path.join(REPO, "scripts", "qa", "r-exec-cli.mjs");
const TMP = path.join(REPO, ".zcode", "tmp", "row-sha-fixture");

let fails = 0, checks = 0;
function t(name, cond, detail) {
  checks++;
  if (!cond) { fails++; console.log("FAIL " + name + (detail === undefined ? "" : " :: " + String(detail).slice(0, 260))); }
  else console.log("ok   " + name + (detail === undefined ? "" : "  (" + String(detail).slice(0, 170) + ")"));
}

/* ── 从执行器源码里把纯函数原样 eval 出来（取不到就红，绝不回落到测试自己写的版本） ── */
function extract(src, name) {
  const at = src.indexOf("function " + name + "(");
  if (at < 0) return null;
  const rest = src.slice(at);
  const close = rest.indexOf("\n}");
  if (close < 0) return null;
  const body = rest.slice(0, close + 2).trim();
  return body.startsWith("function " + name + "(") && body.endsWith("}") ? body : null;
}
let src = "";
try { src = fs.readFileSync(EXEC, "utf8"); } catch (e) { }
const NAMES = ["stampMerged", "fileStampHeader"];
const found = {};
for (const n of NAMES) { found[n] = extract(src, n); t("执行器里取到纯函数 " + n + "()（取不到＝那层实现被搬走/删掉，本测试不许当绿）", !!found[n]); }
if (!found.stampMerged || !found.fileStampHeader) {
  console.log("SUMMARY: assertion failures = " + (fails + 1));
  console.log("ROWSHA_TEST=FAIL（口径取不到，后面的断言一条都没跑）");
  process.exit(1);
}
let M = null;
try { M = new Function(found.stampMerged + "\n" + found.fileStampHeader + "\n return { stampMerged, fileStampHeader };")(); }
catch (e) { console.log("EVAL_ERR " + e.message); }
const stampMerged = M && M.stampMerged, fileStampHeader = M && M.fileStampHeader;
t("eval 出来的 stampMerged / fileStampHeader 都是函数", typeof stampMerged === "function" && typeof fileStampHeader === "function");

/* ── 接线判点：行上真的盖了本 boot 的戳，且两处写盘都走同一个合并口径 ── */
t("row() 给每一行盖 gitSha=GIT_SHA + bootId（#C-2 第①条：行上是执行那一刻的带）",
  /gitSha: GIT_SHA, gitShaSource: "this-boot/.test(src) && /bootId: BOOT_ID/.test(src));
t("GIT_SHA 仍是进程启动时读的 HEAD（改成跑完再读的话，连本 boot 的行都会漂到之后的提交上）",
  /const GIT_SHA = git\("rev-parse --short HEAD"\)/.test(src));
t("两处写盘（增量 flush 与终稿）都走 stampMerged，没有第二套合并口径",
  (src.match(/stampMerged\(prior, prior\.results \|\| \[\], rows, GIT_SHA, BOOT_ID\)/g) || []).length >= 2,
  "stampMerged(prior… 出现 " + (src.match(/stampMerged\(prior/g) || []).length + " 次");
t("旧的「整份文件盖一枚戳」形状已不在任何写盘点上", !/JSON\.stringify\(\{ round: LABEL, gitSha: GIT_SHA/.test(src));
t("文件头把语义收窄写死（gitShaScope=this-boot，并给出逐行带的读法）",
  /gitShaScope: "this-boot"/.test(src) && /rowShas/.test(src) && /mergedFrom/.test(src));

/* ── 两次启动的夹具（真的落一次盘、真的从盘上读回，不靠内存里的假想） ── */
const SHA1 = "aaaa1111", SHA2 = "bbbb2222", SHA3 = "cccc3333";
const boot1Rows = ["A", "B", "C"].map((id) => ({ manifest: "M", id, status: "EXECUTED", gitSha: SHA1, bootId: "boot1" }));
const s1 = stampMerged({ gitSha: "" }, [], boot1Rows, SHA1, "boot1");
const doc1 = fileStampHeader(s1, { round: "R-T", results: s1.merged });
try { fs.mkdirSync(TMP, { recursive: true }); } catch (e) { }
const F = path.join(TMP, "exec-results.json");
fs.writeFileSync(F, JSON.stringify(doc1, null, 1));
t("boot1：三行都是第一枚戳，文件头也是它", doc1.gitSha === SHA1 && s1.merged.every((r) => r.gitSha === SHA1), JSON.stringify(s1.rowShas));

const prior = JSON.parse(fs.readFileSync(F, "utf8"));
const boot2Rows = [{ manifest: "M", id: "D", status: "EXECUTED", gitSha: SHA2, bootId: "boot2" }];
const s2 = stampMerged(prior, prior.results || [], boot2Rows, SHA2, "boot2");
const doc2 = fileStampHeader(s2, { round: "R-T", results: s2.merged });
fs.writeFileSync(F, JSON.stringify(doc2, null, 1));

const g = (id) => s2.merged.find((r) => r.id === id);
t("boot2 续跑：A/B/C 三行仍保留 FIRST 那枚戳（本测试的全部意义）",
  ["A", "B", "C"].every((id) => g(id) && g(id).gitSha === SHA1), ["A", "B", "C"].map((id) => id + "=" + (g(id) || {}).gitSha).join(","));
t("boot2 续跑：只有真跑过的 D 带第二枚戳", !!g("D") && g("D").gitSha === SHA2);
t("boot2 续跑：bootId 也没被改写（A/B/C 仍记 boot1）", ["A", "B", "C"].every((id) => g(id).bootId === "boot1") && g("D").bootId === "boot2");
t("文件头那枚 = 本 boot 的 HEAD（字段保留，语义收窄成 this-boot）",
  doc2.gitSha === SHA2 && doc2.gitShaScope === "this-boot", doc2.gitSha + "/" + doc2.gitShaScope);
t("mergedFrom 记下上一 boot（哪枚戳、几行），没有静默改写",
  Array.isArray(doc2.mergedFrom) && doc2.mergedFrom.some((m) => m.gitSha === SHA1 && m.rows === 3), JSON.stringify(doc2.mergedFrom));
t("rowShas 分布如实：3 行属 SHA1、1 行属 SHA2", doc2.rowShas[SHA1] === 3 && doc2.rowShas[SHA2] === 1, JSON.stringify(doc2.rowShas));
t("bootShas 两枚都在（这份文件跨了几次启动看得见）", doc2.bootShas.includes(SHA1) && doc2.bootShas.includes(SHA2), JSON.stringify(doc2.bootShas));
t("resume 旗标为真（下游可以据此拒绝把整份文件当一次跑的账）", doc2.resume === true);
t("守恒：合并后 4 行 = 旧 3 + 新 1（续跑不许吃掉旧行）", s2.merged.length === 4, "merged=" + s2.merged.length);
t("不变量：每行的带都必须在本 boot 认领得起的带集合里（不许出现没来由的戳）",
  s2.merged.every((r) => doc2.bootShas.includes(r.gitSha)), s2.merged.map((r) => r.gitSha).join(","));

/* 第三次启动：只重跑 A（--redo-holes 的形状） */
const prior3 = JSON.parse(fs.readFileSync(F, "utf8"));
const s3 = stampMerged(prior3, prior3.results.filter((r) => r.id !== "A"), [{ manifest: "M", id: "A", status: "EXECUTED", gitSha: SHA3, bootId: "boot3" }], SHA3, "boot3");
t("重跑一条时：只有被重跑的 A 换第三枚戳，B/C/D 各留自己那枚",
  s3.merged.find((r) => r.id === "A").gitSha === SHA3 &&
  ["B", "C"].every((id) => s3.merged.find((r) => r.id === id).gitSha === SHA1) &&
  s3.merged.find((r) => r.id === "D").gitSha === SHA2,
  s3.merged.map((r) => r.id + "=" + r.gitSha).join(","));
t("第三次启动的 mergedFrom 累积到 2 段（历次都被记下）", s3.mergedFrom.length === 2, JSON.stringify(s3.mergedFrom.map((m) => m.gitSha + ":" + m.rows)));

/* 历史件（修复前写的：没有逐行戳） */
const legacyDoc = { gitSha: SHA1, updatedAt: "2026-09-26T00:00:00.000Z", results: [{ manifest: "M", id: "OLD", status: "EXECUTED" }] };
const sL = stampMerged(legacyDoc, legacyDoc.results, [{ manifest: "M", id: "NEW", gitSha: SHA2, bootId: "b2" }], SHA2, "b2");
const old = sL.merged.find((r) => r.id === "OLD");
t("历史行没有逐行戳 ⇒ 退回上一份文件头那一枚并写明是继承（绝不套本 boot 的戳）",
  old.gitSha === SHA1 && /^inherited-prior-file/.test(old.gitShaSource),
  old.gitSha + " / " + String(old.gitShaSource).slice(0, 46));
t("上一份文件头也没戳 ⇒ unknown，不猜", stampMerged({}, [{ manifest: "M", id: "X" }], [], SHA2, "b").merged[0].gitSha === "unknown");
t("继承来的行与本轮跑的行在 rowShas 里分开（不能被算成同一次跑的账）",
  sL.rowShas[SHA1] === 1 && sL.rowShas[SHA2] === 1, JSON.stringify(sL.rowShas));

/* ── 空转防护：修复前的形状必须违反上面同一条主断言 ── */
function legacyMerge(priorRows, newRows, bootSha) {
  const m = new Map();
  for (const r of [...priorRows, ...newRows]) m.set(r.manifest + "|" + r.id, r);
  return { gitSha: bootSha, results: [...m.values()].map((r) => Object.assign({}, r, { gitSha: bootSha })) };
}
const pre = legacyMerge(boot1Rows, boot2Rows, SHA2);
const violated = pre.results.filter((r) => ["A", "B", "C"].includes(r.id) && r.gitSha !== SHA1);
t("空转防护：修复前的合并形状确实把 A/B/C 顶成了第二枚戳 ⇒ 主断言真的会红",
  violated.length === 3, "被顶替的行数=" + violated.length);
t("空转防护：修复前那份文件读不出多 boot（只有文件头一枚戳，帧按它受审就成了 PRE_STAMP）",
  !("rowShas" in pre) && !("mergedFrom" in pre), Object.keys(pre).join(","));

console.log("SUMMARY: assertion failures = " + fails);
console.log(fails ? "ROWSHA_TEST=FAIL" : "ROWSHA_TEST=PASS");
process.exit(fails ? 1 : 0);
