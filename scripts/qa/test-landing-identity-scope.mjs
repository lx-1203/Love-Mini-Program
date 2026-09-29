#!/usr/bin/env node
/* triage-exec-failures.mjs 落地对轴的**判域收窄**能不能变红 —— 用户 2026-09-29 裁定 (b) 路时附的条件：
   "必须同时加一条能变红的负例 —— 一份声明了 identity=guest 的语料里留一组未入账落地对，
    门必须照旧 exit 2（否则 (b) 就成了把红藏起来）"。本文件就是那条负例，另配收窄侧的对照。
   全部离线：只读载具 + 临时 fixture，不开模拟器、不抢 UI 租约、不碰任何权威账本。
   为什么不做第三例（"给了处置就转绿"）：那要伪造复测腿账本的整张形状（landingStatus 的三态与
   debtRows/caseIds 相互守恒），一旦我猜错字段，测的就不是本轴而是我的猜测 —— 宁可少一例，
   也不拿一个自证式的假绿换一例好看。收窄侧因此改测"具名读数必须存在"，静默丢失同样判红。 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const GATE = resolve(REPO, "scripts/qa/triage-exec-failures.mjs");
const TMP = resolve(REPO, ".zcode/tmp/landing-identity-scope");
mkdirSync(TMP, { recursive: true });

let checks = 0, fail = 0;
function t(name, cond, got) {
  checks++;
  if (!cond) { fail++; console.log(`FAIL ${name} :: ${String(got).slice(0, 260)}`); }
  else console.log(`ok   ${name}`);
}

/* 语料只用一张判据：状态 FAILED、reason 以「落在别的页」开头 ⇒ 必然进 FAILED-landing-guard（:450-452）。
   其余轴（词表漂移/证据缺口/复测腿同源）必须保持 0，否则 exit 码就不是这一轴决定的，负例失去意义。 */
function corpus(withIdentity) {
  const row = {
    id: "NEG-LX-01", suite: "P-NEG-01", manifest: "NEGFIXTURE", page: "pages/negative-landing/index",
    status: "FAILED", tier: "critical", requiresReal: false,
    title: "负例夹具：游客声明页与落地页不一致",
    action: "点击 .enter",
    reason: "落在别的页：声明页 pages/negative-landing/index，实测 top=pages/content-board/index",
    failureReason: "落在别的页：声明页 pages/negative-landing/index，实测 top=pages/content-board/index",
    observed: "top=pages/content-board/index ≠ pages/negative-landing/index | dom: .board:present",
    evidence: [], missingEvidence: [],
  };
  if (withIdentity) row.identity = "guest";
  return { round: "NEG", results: [row] };
}

function run(tag, withIdentity) {
  const rp = resolve(TMP, `corpus-${tag}.json`);
  writeFileSync(rp, JSON.stringify(corpus(withIdentity), null, 1));
  /* 载具写的是 OUT + ".json"（:1062），所以 --out 只能给**无后缀**的基名；
     传 sidecar-x.json 会落盘成 sidecar-x.json.json —— 第一版就是这么读不到 sidecar 的。 */
  const outBase = resolve(TMP, `sidecar-${tag}`);
  const r = spawnSync(process.execPath, [GATE, "--results", rp, "--out", outBase],
    { cwd: REPO, encoding: "utf8", timeout: 600000 });
  const stdout = (r.stdout || "") + (r.stderr || "");
  let side = null;
  try { side = JSON.parse(readFileSync(outBase + ".json", "utf8")); } catch { /* 交给断言去红 */ }
  return { code: r.status, stdout, side };
}

const GROUP = "pages/negative-landing/index → pages/content-board/index";

/* A) 声明了 guest 的语料 + 无人处置 ⇒ 这一轴必须咬红 */
{
  const a = run("declared", true);
  t("A 声明 identity=guest 的未处置落地对 ⇒ 退出码 2（收窄不许把红藏起来）",
    a.code === 2, "exit=" + a.code + " ｜ " + a.stdout.split(/\r?\n/).filter(l => /TRIAGE_RESULT|落地对/.test(l)).slice(0, 3).join(" / "));
  t("A 的判红确实来自落地对轴而不是别的轴（landingMissing=1、 undeclared=0、 unclassified=0）",
    !!a.side && a.side.gateFires.landingMissing === 1 && a.side.gateFires.landingUndeclared === 0 && a.side.unclassified === 0,
    a.side ? JSON.stringify(a.side.gateFires) + " unclassified=" + a.side.unclassified : "(sidecar 读不到)");
  t("A 的红句点名了这一组（不是只给一个数）",
    a.stdout.includes(GROUP), "stdout 里找不到 " + GROUP);
  t("A 也须印出判域读数行（载具不许在有信号时沉默）",
    /^TRIAGE_LANDING_SCOPE=/m.test(a.stdout), a.stdout.split(/\r?\n/).find(l => l.startsWith("TRIAGE_LANDING_SCOPE")) || "(没有这一行)");
}

/* B) 同一份语料把 identity 字段剥掉 ⇒ 本轴不判红，但必须留具名读数 */
{
  const b = run("undeclared", false);
  t("B 语料零行声明身份 ⇒ 退出码 0（向身份不明群体索要游客处置本就越界）",
    b.code === 0, "exit=" + b.code + " ｜ " + b.stdout.split(/\r?\n/).filter(l => /TRIAGE_RESULT|落地对/.test(l)).slice(0, 3).join(" / "));
  t("B 收窄的是判域不是阈值：landingMissing=0 而 landingUndeclared=1",
    !!b.side && b.side.gateFires.landingMissing === 0 && b.side.gateFires.landingUndeclared === 1,
    b.side ? JSON.stringify(b.side.gateFires) : "(sidecar 读不到)");
  t("B 必须逐组点名身份未声明（静默吞掉等于把债擦掉）",
    /^  LANDING_IDENTITY_UNDECLARED pages\/negative-landing\/index → pages\/content-board\/index/m.test(b.stdout),
    b.stdout.split(/\r?\n/).find(l => l.includes("LANDING_IDENTITY_UNDECLARED")) || "(没有点名行)");
  t("B 的读数里写明这是 UNVERIFIED-INSTRUMENT 而不是结案",
    /UNVERIFIED-INSTRUMENT=yes/.test(b.stdout),
    b.stdout.split(/\r?\n/).find(l => l.startsWith("TRIAGE_LANDING_SCOPE")) || "(没有读数行)");
}

/* C) 两例的落地对总组数必须一致 ⇒ 收窄只改"谁有权判"，没改"看见了几组" */
{
  const a = run("declared-again", true);
  const b = run("undeclared-again", false);
  const ka = a.side ? Object.keys(a.side.landingGroups).length : -1;
  const kb = b.side ? Object.keys(b.side.landingGroups).length : -1;
  t("C 收窄前后看见的组数相同（本轴不判 ≠ 本轴不存在；两例都必须是 1 组）",
    ka === 1 && kb === 1, "声明侧组数=" + ka + " 未声明侧组数=" + kb);
}

/* 聚合器 run-qa-selftests.mjs:45-49 认两种自报写法，缺一种都不信："assertion failures = N" 与
   "*_TEST=PASS"。只印自己的方言会被读成"无自报断言计数（不可信）"⇒ 绿等于没测。 */
console.log(`SUMMARY: assertion failures = ${fail}`);
console.log(`LANDING_SCOPE_SUMMARY cases=${checks} fail=${fail}`);
console.log(fail === 0 ? "LANDING_SCOPE_TEST=PASS" : "LANDING_SCOPE_TEST=FAIL");
process.exit(fail === 0 ? 0 : 1);
