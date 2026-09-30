#!/usr/bin/env node
/* 负例（F-04 车道，2026-09-30）：DENY_TAP 的「清空」收窄成"按宾语判"之后，
   这条测试必须**两个方向都能变红**：
     方向①（放行）：两条被误拦的判据（round-7/ops 次要18|TD03、次要20|OT09，它们的「清空」
       清的是 .reply-input / textarea 里的内容）现在过得了护栏；
     方向②（拦截）：语料里真的是账号级/存储级的清空必须照旧被拦
       （次要20|PR05「清空 storage」、次要18|HS07「tap 确认清空」→handleClear、
        次要19|SE05「tap「清空历史」」→clearHistory、CPT33「清空/拦截数据源」）。
   方向②不能只靠"今天正好还拦得住"：所以本测试会**临时造一个放宽版 mutant**（把
   clearsATextField 的存储宾语否决去掉 ⇒ PR05 会被放出去），跑同一批断言，要求它必须变红；
   mutant 没被抓到 = 这条负例是空的（绿灯等于没测）。mutant 只活在 .zcode/tmp 下，
   跑完立刻删，并在收尾用 existsSync 自证它没了。
   第三条轴是漂移守恒：护栏在 1107 条判据上拒绝的集合，相对"收窄前的旧正则"必须
   **恰好只少了 TD03/OT09 两行**，不许多放一个、也不许多拦一个 —— 少/多出来的每一行
   都是本车道没被授权改的状态变化。
   跑法：PATH=<node22 目录>:$PATH node scripts/qa/test-deny-tap-field-clear.cjs
   聚合器认的输出：SUMMARY: assertion failures = N + DENYTAP_TEST=PASS|FAIL */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const REPO = path.resolve(__dirname, "..", "..");
const QA = path.join(REPO, "scripts", "qa");
const MODULE = path.join(QA, "deny-tap.cjs");
const TMP_ROOT = path.join(REPO, ".zcode", "tmp", "lane-denyf04");
const TMP = path.join(TMP_ROOT, "mutant");
const MUTANT = path.join(TMP, "deny-tap.widened.cjs");
const OPS_DIRS = ["reports/audit/round-7/ops", "reports/audit/round-6/ops"];
/* 收窄前的词表（逐字，来自 git 上的两份副本）—— 守恒轴的"before"就用它算 */
const OLD_DENY = /注销|解绑|清空|删除账号|删除帐号|退出登录|登出/;

let fails = 0, checks = 0;
function t(name, cond, detail) {
  checks++;
  if (!cond) { fails++; console.log("FAIL " + san(name) + (detail === undefined ? "" : " :: " + san(String(detail)).slice(0, 300))); }
  else console.log("ok   " + san(name) + (detail === undefined ? "" : "  (" + san(String(detail)).slice(0, 200) + ")"));
}
/* 子进程/mutant 自己会印 *_TEST= 或 *_RESULT=；这些 token 原样进本测试的 stdout 会让
   聚合器 run-qa-selftests.mjs:52 的 selfVerdict 抓到**第一条**而不是我这条（假绿/假红都会发生）。 */
function san(s) {
  return String(s).replace(/_RESULT=/g, "_RESULT~").replace(/_TEST=/g, "_TEST~")
    .replace(/assertion failures =/g, "assertion-failures(引用)");
}
/* 保险闸：本测试的写/删只许落在 .zcode/tmp 下面。 */
function guarded(p, what) {
  const rel = path.relative(path.join(REPO, ".zcode", "tmp"), p);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel))
    throw new Error("夹具路径越界，拒绝操作 " + what + "：" + p);
  return p;
}

/* ── 判据原文一律从 ops 现取，不硬编码文本（硬编码会在台账被改写时假红/假绿）──── */
function loadCorpus(dir) {
  const abs = path.join(REPO, dir);
  const out = [];
  for (const f of fs.readdirSync(abs).filter((x) => x.endsWith(".json")).sort()) {
    let mf;
    try { mf = JSON.parse(fs.readFileSync(path.join(abs, f), "utf8")); } catch (e) { continue; }
    const suite = f.replace(/\.json$/, "");
    for (const c of (mf.cases || [])) out.push({ k: suite + "|" + c.id, action: String(c.action || "") });
  }
  return out;
}
function caseAction(dir, suite, id) {
  const hit = loadCorpus(dir).find((r) => r.k === suite + "|" + id);
  return hit ? hit.action : null;
}

const REL = ["次要18|TD03", "次要20|OT09"];
const KEEP = ["次要20|PR05", "次要18|HS07", "次要19|SE05",
  "SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC|CPT33"];

function refusedSet(rows, pred) {
  return new Set(rows.filter((r) => r.action && pred(r.action)).map((r) => r.k));
}

/* ───────────── ① 单一来源 + 接线（"建了不接"是同类缺陷）───────────── */
const modSrc = fs.readFileSync(MODULE, "utf8");
t("S1 共享模块存在且导出 denyTapMatch", /function denyTapMatch/.test(modSrc) && /denyTapMatch:\s*denyTapMatch/.test(modSrc));
for (const carrier of ["r-exec-cli.mjs", "r-exec-ws.mjs"]) {
  const src = fs.readFileSync(path.join(QA, carrier), "utf8");
  t("S1 载具 " + carrier + " 真接了共享清单", /require\("\.\/deny-tap\.cjs"\)/.test(src) && /denyTapMatch\(/.test(src),
    "缺 require 或缺调用 ⇒ 又回到两份词表各自漂移");
  t("S1 载具 " + carrier + " 不再另存词表副本", !/注销\|解绑/.test(src) && !/const DENY_TAP\s*=/.test(src));
}

const D = require(MODULE);
const nowDenies = (a) => D.deniesTap(a);

/* ───────────── ② 方向①：两条误拦行现在过得了护栏 ───────────── */
for (const dir of OPS_DIRS) {
  for (const k of REL) {
    const [suite, id] = k.split("|");
    const a = caseAction(dir, suite, id);
    if (a === null) { t("S2 " + dir + " " + k + " 取到判据原文", false, "判据不在语料里（守恒轴会跟着失真）"); continue; }
    if (!/清空/.test(a)) { t("S2 " + dir + " " + k + " 的 action 仍含「清空」", false, "原文已不含「清空」⇒ F-04 的前提变了，要人重看：" + a.slice(0, 90)); continue; }
    t("S2[放行] " + dir + " " + k + " 过得了护栏", !nowDenies(a), "denyTapMatch=" + JSON.stringify(D.denyTapMatch(a)));
  }
}

/* ───────────── ③ 方向②：账号级/存储级清空照旧被拦 ───────────── */
for (const dir of OPS_DIRS) {
  for (const k of KEEP) {
    const [suite, id] = k.split("|");
    const a = caseAction(dir, suite, id);
    if (a === null) { t("S3 " + dir + " " + k + " 取到判据原文", false, "判据不在语料里"); continue; }
    t("S3[仍拦] " + dir + " " + k + " 必须仍被拒", nowDenies(a), "命中词=" + D.denyTapMatch(a) + " 原文=" + a.slice(0, 60));
  }
}
/* 除「清空」外的词条一个字没放宽（不依赖语料，钉语义） */
t("S3[仍拦] 注销/解绑/退出登录 类词条照旧按词拒",
  ["点 注销 按钮", "tap 退出登录", "解绑微信", "删除账号"].every((s) => D.deniesTap(s)));
t("S3[仍拦] 证明不了宾语是字段的「清空」默认拒（保守侧）",
  D.deniesTap("清空后观察") && D.deniesTap("清空 storage") && D.deniesTap("清空数据源"));

/* ───────────── ④ 守恒：1107 条上拒绝集合只允许少这两行 ───────────── */
const deltas = {};
for (const dir of OPS_DIRS) {
  const rows = loadCorpus(dir);
  const before = refusedSet(rows, (a) => OLD_DENY.test(a));
  const after = refusedSet(rows, nowDenies);
  const released = [...before].filter((x) => !after.has(x)).sort();
  const added = [...after].filter((x) => !before.has(x)).sort();
  deltas[dir] = { total: rows.length, before: before.size, after: after.size, released, added };
  t("S4 " + dir + " 判据总数守恒 = 1107", rows.length === 1107, "实得 " + rows.length);
  t("S4 " + dir + " 拒绝集合只减少 TD03/OT09 两行",
    released.length === 2 && REL.every((k) => released.includes(k)),
    "released=" + JSON.stringify(released));
  t("S4 " + dir + " 没有多拦任何一行（新红必须是显式的）", added.length === 0, "newlyDenied=" + JSON.stringify(added));
  console.log("DENYTAP_CORPUS dir=" + dir + " cases=" + rows.length + " refuse_before=" + before.size + " refuse_after=" + after.size +
    " released=" + released.join(",") + " newly_denied=" + (added.length ? added.join(",") : "(none)"));
}

/* ───────────── ⑤ 双向 RED：同一支探针打"干净版"和"放宽版(mutant)" ─────────────
   探针不硬编码判据文本，现取 round-7/ops，只问两件事：
     ① 四条账号级/存储级清空是否还被拒；② 相对旧正则多放出去几行。
   干净版必须 0 泄漏 0 多放（否则这条门是永远红的假门）；
   放宽版必须泄漏 PR05 且多放行>0（否则 ③④ 是永远抓不住红的空门）。 */
fs.mkdirSync(guarded(TMP, "TMP"), { recursive: true });
const probe = path.join(TMP, "probe.cjs");
fs.writeFileSync(guarded(probe, "probe"), [
  '"use strict";',
  "const path = require('node:path');",
  "const fs = require('node:fs');",
  "const TARGET = process.argv[2];",
  "const D = require(TARGET);",
  "const REPO = path.resolve(__dirname, '..', '..', '..', '..');",
  "const DIR = path.join(REPO, 'reports/audit/round-7/ops');",
  "const rows = [];",
  "for (const f of fs.readdirSync(DIR).filter(x=>x.endsWith('.json')).sort()) {",
  "  const mf = JSON.parse(fs.readFileSync(path.join(DIR,f),'utf8'));",
  "  for (const c of (mf.cases||[])) rows.push({k: f.replace(/\\.json$/,'')+'|'+c.id, action: String(c.action||'')});",
  "}",
  "const OLD = /注销|解绑|清空|删除账号|删除帐号|退出登录|登出/;",
  "const KEEP = ['次要20|PR05','次要18|HS07','次要19|SE05','SUBPACKAGES-CIRCLES-CIRCLES-POST-TOPIC|CPT33'];",
  "const byKey = new Map(rows.map(r=>[r.k,r]));",
  "const leakedKeep = KEEP.filter(k => { const r = byKey.get(k); return r && r.action && !D.deniesTap(r.action); });",
  "const after = new Set(rows.filter(r=>r.action && D.deniesTap(r.action)).map(r=>r.k));",
  "const before = new Set(rows.filter(r=>r.action && OLD.test(r.action)).map(r=>r.k));",
  "const released = [...before].filter(x=>!after.has(x)).sort();",
  "const overRelease = released.filter(x=>!['次要18|TD03','次要20|OT09'].includes(x)).sort();",
  "console.log('PROBE_LEAKED_KEEP=' + (leakedKeep.join(',')||'(none)'));",
  "console.log('PROBE_RELEASED=' + released.join(','));",
  "console.log('PROBE_OVER_RELEASE_COUNT=' + overRelease.length);",
  "process.exit((leakedKeep.length || overRelease.length) ? 1 : 0);",
  ""].join("\n"));

function runProbe(target) {
  const r = spawnSync(process.execPath, [probe, target], { cwd: REPO, encoding: "utf8", timeout: 120000 });
  const out = String((r.stdout || "") + (r.stderr || ""));
  return {
    status: r.status,
    leaked: (out.match(/PROBE_LEAKED_KEEP=(\S+)/) || [, "(无读数)"])[1],
    released: (out.match(/PROBE_RELEASED=(.*)/) || [, "(无读数)"])[1].trim(),
    over: Number((out.match(/PROBE_OVER_RELEASE_COUNT=(\d+)/) || [, "-1"])[1]),
    out
  };
}
const clean = runProbe(MODULE);
console.log("PROBE_CLEAN  leaked=" + san(clean.leaked) + " released=" + san(clean.released) + " over=" + clean.over);
t("S5[门可绿] 未放宽的真模块跑同一探针必须退 0、零泄漏",
  clean.status === 0 && clean.leaked === "(none)" && clean.over === 0,
  "exit=" + clean.status + " leaked=" + clean.leaked + " over=" + clean.over);

/* 反例取的是**最像"顺手放宽"的那种写法**：把「清空」整条从禁触清单里摘掉
   （在 `if (!/清空/.test(s)) return false;` 之后直接 return true）。
   实测记在报告里：只删单个反向否决（PERSISTENCE_OBJECT / FIELD_PROOF 闸门）在今天这份
   语料上是**惰性的**（released 仍是 TD03/OT09 两行），所以它们不是本次放行的操作轴、
   只是纵深防御；能把账号级清空放出去的必须是一个"不再问宾语"的写法 —— 那就用这个。
   它必须同时被两条轴抓住：账号级对照被放出去（拦方向红）+ 多放行行数>0（守恒方向红）。 */
const ANCHOR = "  if (!/清空/.test(s)) return false;";
const widened = modSrc.replace(ANCHOR, ANCHOR + "\n  return true; /* MUTANT(F-04 反例)：不再问宾语，「清空」整条放行 */");
t("S5[可造] mutant 锚点行还在 deny-tap.cjs 里", widened !== modSrc,
  "锚点 " + ANCHOR.trim() + " 找不到 ⇒ 这条 mutation 检查已失效，必须重新接线");
if (widened !== modSrc) {
  fs.writeFileSync(guarded(MUTANT, "MUTANT"), widened);
  const mut = runProbe(MUTANT);
  console.log("PROBE_MUTANT leaked=" + san(mut.leaked) + " over=" + mut.over);
  t("S5[RED 可达·拦方向] 放宽版把账号级清空放出去了（PR05 必须漏 ⇒ 证明 ③ 真在管这件事）",
    mut.status === 1 && mut.leaked.indexOf("PR05") >= 0,
    "exit=" + mut.status + " leaked=" + mut.leaked);
  t("S5[RED 可达·守恒方向] 放宽版同时被守恒轴抓住（多放行 > 0）", mut.over > 0, "over_release=" + mut.over);
}

/* ───────────── ⑥ mutant 必须被删掉并自证不存在 ───────────── */
for (const p of [MUTANT, probe]) {
  try { fs.rmSync(guarded(p, "cleanup"), { force: true }); } catch (e) { /* 没造出来就算没删 */ }
}
t("S6 mutant 已删除（磁盘上不再存在放宽版词表）", !fs.existsSync(MUTANT), MUTANT);
t("S6 探针已删除（.zcode/tmp 下不留夹具）", !fs.existsSync(probe));
try { fs.rmSync(guarded(TMP, "rmdir"), { recursive: true, force: true }); } catch (e) { /* 非空目录 */ }
try { fs.rmSync(guarded(TMP_ROOT, "rmdir root"), { recursive: true, force: true }); } catch (e) { /* 非空目录 */ }
t("S6 临时目录整条收回（不留空命名空间给下一位）", !fs.existsSync(TMP_ROOT), TMP_ROOT);
t("S6 mutant 命名空间内一个文件都不剩", !fs.existsSync(TMP_ROOT) || fs.readdirSync(TMP_ROOT).length === 0, TMP_ROOT);

console.log("checks=" + checks + " assertion failures = " + fails);
console.log("SUMMARY: assertion failures = " + fails);
console.log(fails === 0 ? "DENYTAP_TEST=PASS" : "DENYTAP_TEST=FAIL");
process.exit(fails === 0 ? 0 : 1);
