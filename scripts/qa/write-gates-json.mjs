#!/usr/bin/env node
/* 重写真实模式的历史载体 reports/audit/real-e2e/GATES.json —— 不是手改，而是把
   G7/G8/G9 与"后端已重启"前置件当场跑一遍再落盘。
   为什么要这个脚本：这个载体此前没有任何生产者写它（报告读它、门禁面板读它，
   仓里却搜不到写它的代码），于是它停在 874ff52f 的 6/6 环上，而实跑早就是 10 环。
   "载体说 PASS 但没人能重跑出这个 PASS" 就是本轮 ④ 里那条"过期载体"。
   失败形状（都是刻意的）：
     - 前置件不 PASS ⇒ 三道 Gate 一律记 BLOCKED 并以非零退出，不沿用旧值；
     - 任一机的 KEY 没出现 ⇒ 拒绝写盘（缺席不等于空值，更不等于通过）；
     - 环数与判据台期望不一致 ⇒ 照样如实写进去，只在 caveat 里点名。
   用法：PATH=<node22 目录>:$PATH node scripts/qa/write-gates-json.mjs [--out <path>] [--dry] */
import { execFileSync, execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const OUT = resolve(ROOT, arg("out", "reports/audit/real-e2e/GATES.json"));

function run(cmd, args, opts = {}) {
  try {
    const out = execFileSync(cmd, args, { cwd: ROOT, encoding: "utf8", timeout: opts.timeout || 900000, maxBuffer: 32 * 1024 * 1024 });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status == null ? 1 : e.status, out: String((e.stdout || "") + (e.stderr || "")) };
  }
}
function git(a) { try { return execSync("git " + a, { cwd: ROOT, encoding: "utf8" }).trim(); } catch { return ""; } }
/** 只认行首 KEY=，取该行剩下的部分；读不到就返回 null（调用方必须拒绝写盘，不能当空串） */
function key(out, k) {
  const m = String(out).match(new RegExp("^" + k + "=(.*)$", "m"));
  return m ? m[1].trim() : null;
}
function need(out, k, who) {
  const v = key(out, k);
  if (v === null) { BAD.push(`${who} 没打出 ${k}= ⇒ 该机没真跑起来，载体不写`); return ""; }
  return v;
}
/** 有的机器行是 `KEY 空格 内容`（G9_CONTROL 就是这种），不能一律按 KEY= 找 */
/** 同一行里还有别的 KEY 时（G9 那行是 G9_PROBED=455 G9_OK=455 …），必须允许行内匹配 */
function anywhere(out, k, who) {
  const m = String(out).match(new RegExp("(?:^|\\s)" + k + "=(\\S+)"));
  if (!m) { BAD.push(who + " 没打出 " + k + "= ⇒ 该机没真跑起来，载体不写"); return ""; }
  return m[1];
}
function restLine(out, k) {
  const m = String(out).match(new RegExp("^" + k + "[ =](.*)$", "m"));
  return m ? m[1].trim() : "";
}
const BAD = [];
const capturedAt = new Date().toISOString();
const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : null;

const pre = run(process.execPath, ["scripts/qa/verify-backend-restarted.mjs"], { timeout: 120000 });
/* 前置件把结论与说明印在同一行（RESTARTED_RESULT=PASS JVM 晚于…），所以判定要看**词**而不是整行相等。
   写错这行会怎样：整趟被判成"前置件未 PASS"⇒ 三道 Gate 全记 BLOCKED。故障方向是安全的
   （宁可拒发 PASS 也不伪造），但确实是假阴性——本轮第一次跑就中过。 */
const preRaw = need(pre.out, "RESTARTED_RESULT", "前置件 verify-backend-restarted");
const prePass = /^PASS(\s|$)/.test(String(preRaw));
const preResult = preRaw ? (prePass ? "PASS" : String(preRaw).split(/\s/)[0]) : "MISSING";
const prePid = need(pre.out, "RESTARTED_PID", "前置件 verify-backend-restarted");
const preStart = (String(pre.out).match(/startedAt="([^"]*)"/) || [null, ""])[1];
const preNote = String(pre.out).split(/\r?\n/).filter((l) => /RESTARTED_(NEWEST_SOURCE|HEAD_COMMIT_TIME|STALE_SOURCE|HEAD_DRIFT)=/.test(l)).join(" ; ");

let g7 = { code: 0, out: "" }, g8 = { code: 0, out: "" }, g9 = { code: 0, out: "" };
if (preResult === "PASS") {
  g7 = run(process.execPath, ["apps/client/scripts/build-real-isolated.mjs", "--check-only"]);
  g8 = run(process.execPath, ["scripts/qa/g8-e2e.cjs"]);
  g9 = run(process.execPath, ["scripts/qa/g9-probe.cjs"]);
} else {
  console.log("GATESJSON_note=前置件未 PASS ⇒ G7/G8/G9 一律记 BLOCKED（不沿用上一版载体的值）");
}

const G7 = preResult === "PASS" ? need(g7.out, "G7_RESULT", "G7") : "BLOCKED";
const G8 = preResult === "PASS" ? need(g8.out, "G8_RESULT", "G8") : "BLOCKED";
const G9 = preResult === "PASS" ? need(g9.out, "G9_RESULT", "G9") : "BLOCKED";
const G8rings = preResult === "PASS" ? need(g8.out, "G8_RINGS_OK", "G8") : "BLOCKED";
const G8artifacts = preResult === "PASS" ? restLine(g8.out, "G8_ARTIFACTS") : "";
const G9probed = preResult === "PASS" ? anywhere(g9.out, "G9_PROBED", "G9") : "0";
const G9ok = preResult === "PASS" ? anywhere(g9.out, "G9_OK", "G9") : "0";
const G9control = preResult === "PASS" ? restLine(g9.out, "G9_CONTROL") : "";

const artifactIds = {};
for (const part of G8artifacts.split(";")) {
  const m = part.trim().match(/^([a-z_]+)\.id=(\d+)$/);
  if (m) artifactIds[m[1]] = Number(m[2]);
}
const controlTable = {};
for (const part of G9control.split(/\s+(?=\S+=)/)) {
  const m = part.trim().match(/^(\S+?)=(\d+)(?:\s+(.*))?$/);
  if (m) controlTable[m[1] + (m[3] ? " " + m[3] : "")] = Number(m[2]);
}
const ringCount = (String(G8rings).match(/\/(\d+)$/) || [null, null])[1];

const doc = {
  schemaVersion: "gates-2",
  gateSet: "真实模式三道 Gate G7/G8/G9 + 后端已重启前置件",
  gitSha: git("rev-parse --short HEAD") || "unknown",
  gitShaSource: "运行时 git rev-parse --short HEAD（本文件不写死 SHA）",
  capturedAt,
  headSubject: git("log -1 --format=%s"),
  supersedes: prev ? { gitSha: prev.gitSha, capturedAt: prev.capturedAt, G8rings: prev.detail && prev.detail.G8 && prev.detail.G8.ringsOk } : null,
  precondition: {
    check: "scripts/qa/verify-backend-restarted.mjs",
    result: preResult || "MISSING",
    jvmPid: Number(prePid) || null,
    jvmStartedAt: preStart,
    note: preNote,
  },
  G7_RESULT: G7, G8_RESULT: G8, G9_RESULT: G9,
  detail: {
    G7: { result: G7, exitCode: preResult === "PASS" ? g7.code : null, checkedBy: "apps/client/scripts/build-real-isolated.mjs --check-only" },
    G8: { result: G8, exitCode: preResult === "PASS" ? g8.code : null, ringsOk: G8rings, runner: "scripts/qa/g8-e2e.cjs" },
    G9: { result: G9, exitCode: preResult === "PASS" ? g9.code : null, probed: Number(G9probed) || 0, ok: Number(G9ok) || 0, controlTable },
  },
  newDbKeysThisRound: artifactIds,
  dbWriteDisclosure: "G8 每跑一次都会真写库（发帖/评论/点赞/校园话题/匿名回复），按既定裁定这些行保留不删；本载体的 newDbKeysThisRound 就是本轮新增主键的清单。",
  notEvidenced: ["wx.login 真机链路（本机无 secret，POST 必 502）"],
  caveat: [],
};
if (ringCount && ringCount !== "6") doc.caveat.push(`G8 环数已是 ${ringCount}（历史载体记 6），载体与报告都必须按当前环数读`);
if (preResult !== "PASS") doc.caveat.push("前置件未 PASS ⇒ 三道 Gate 记 BLOCKED，本报告不产出真实模式结论");
if (BAD.length) doc.caveat.push("有机器没打出必要 KEY：" + BAD.join(" / "));

const ring = (doc.G7 === "PASS" && doc.G8 === "PASS" && doc.G9 === "PASS" && preResult === "PASS") ? "PASS" : "NOT_PASS";
doc.overall = ring;
console.log(`GATESJSON precondition=${preResult} G7=${doc.G7_RESULT} G8=${doc.G8_RESULT}(${G8rings}) G9=${doc.G9_RESULT}(${G9ok}/${G9probed}) overall=${ring}`);
console.log(`GATESJSON newDbKeys=${JSON.stringify(artifactIds)} missing-keys=${BAD.length}`);
if (BAD.length) { console.log("GATESJSON_RESULT=FAIL reason=有机器的 KEY 取不到，写出来的载体就是假账"); process.exit(2); }
if (!process.argv.includes("--write")) { console.log("GATESJSON_RESULT=DRY 加 --write 才落盘（防手滑覆盖历史载体）"); process.exit(0); }
writeFileSync(OUT, JSON.stringify(doc, null, 2) + "\n");
console.log(`GATESJSON_RESULT=OK written=${OUT.replace(ROOT + "/", "")} gitSha=${doc.gitSha}`);
