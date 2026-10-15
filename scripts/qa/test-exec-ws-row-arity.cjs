#!/usr/bin/env node
/* WS 腿行生产者（scripts/qa/r-exec-ws.mjs 的 row()/mkRow()）的 arity 守卫。
   为什么必须存在：覆盖率门（scripts/qa/verify-real-coverage.mjs）只认行上那四列
     band / identity / loginVerify / sessionSource
   （判点 REAL_BAND=:181 读 String(r.band)、身份两条轴 :237-238 读 identity、会话核对读后两列），
   而这四列**全部**由 r-exec-ws.mjs 的 mkRow 盖。上一版 mkRow 写成
     const mkRow = (...a) => row(...a, BAND_STR, IDENTITY, SESSION)
   —— 三个常量按位置接在实参尾巴上，于是调用点少传一个入参不报错，只把这一排往左滑：
   只传 7 个的那 11 条状态出口（tapDeny/tapNoTarget×3/tapFail/开页失败/requiresReal 跳/
   落在别的页/未开 --tap/判据没点名/currentPage 无结果）落盘的行是
     band={"source":…,"verify":…}  identity=""  evidence="real@<sha8>"  missingEvidence="A"
   门读成 String(band)="[object Object]" ⇒ REAL_BAND 不认 ⇒ 这些行一条也不领钱（盘上实测：
   round-7 exec-realcov-b1c 的 VI34、exec-realcov-b3 的 VRN07）。伪证据那一半更阴：
   rowMeasured()（r-exec-ws.mjs:175）把"evidence 非空"读成量到了，于是零取证的开页失败批
   能被 classifyBatch 判成 judged 放行，正好掩盖 :132 那块注释描述的 round-8 stage-8 事故。
   本文件钉两件事，缺一不可：
     ① 结构：mkRow 必须是**逐位写死的形参**（不再是 ...a 散布），band/identity/session 由它
        自己闭包模块常量注入 ⇒ 调用点在结构上就没有能漏掉这四列的位置；且本腿除 mkRow 内部
        那一次之外不许出现裸 row(...) 调用（:333 那条既有纪律）。
     ② 行为：把源码里**现抠**的 row()+mkRow() 真的 eval 出来（取不到就红，绝不回落到测试
        自己写的桩，口径同 scripts/qa/test-exec-row-sha.cjs:25-47），对每一个调用点 arity 各
        构造一次行，断言 band 是**字符串**且匹配 /^(real|mock|showcase)(@|$)/（三档词表见
        scripts/qa/artifact-band.mjs:20 的 VITE_API_MODE）、identity 非空且是门两条轴读得动的
        词、loginVerify/sessionSource 是字符串、evid/miss 落在 evidence/missingEvidence 上没滑位；
        再多塞一个位置参数必须**抛**（不许静默把调用点自带的档位当 band 落账）。
   负例咬不动=没测：
     · 内建空转防护——把修复前的 (...a)=>row(...a,…) 形状与它的 7 参调用点再跑一遍**同一条**
       主断言，那条必须红；
     · 外置红证——QA_WS_ROW_SRC 指向 .zcode/tmp 下的副本，副本里删掉任一调用点的一个实参，
       本文件必须退 1（在源件上不许做这种破坏）。
   跑法：D:/codex-tools/node-v22.17.0-win-x64/node.exe scripts/qa/test-exec-ws-row-arity.cjs
   聚合器接线：文件名匹配 run-qa-selftests.mjs:25 的 ^test-.+\\.(cjs|mjs)$ ⇒ 放着就被收；
   自报口径见 run-qa-selftests.mjs:49-55（SUMMARY 行 + *_TEST= 判据行，stem 7 字符合 [A-Z]{2,8}）。 */
"use strict";
const fs = require("node:fs");
const path = require("node:path");

const REPO = path.resolve(__dirname, "..", "..");
const DEFAULT_WS = path.join(REPO, "scripts", "qa", "r-exec-ws.mjs");
const SRC_FILE = process.env.QA_WS_ROW_SRC ? path.resolve(process.env.QA_WS_ROW_SRC) : DEFAULT_WS;
const GATE = path.join(REPO, "scripts", "qa", "verify-real-coverage.mjs");
const CLI = path.join(REPO, "scripts", "qa", "r-exec-cli.mjs");

let fails = 0, checks = 0;
function t(name, cond, detail) {
  checks++;
  if (!cond) { fails++; console.log("FAIL " + name + (detail === undefined ? "" : " :: " + String(detail).slice(0, 260))); }
  else console.log("ok   " + name + (detail === undefined ? "" : "  (" + String(detail).slice(0, 170) + ")"));
}

/* ── 词表：三档前缀 + 门的两条身份轴（门的正则从门源码现抠，不在这里抄第二份口径） ── */
const BAND_MODE_RE = /^(real|mock|showcase)(@|$)/;
let gateRealBand = null;
try {
  const g = fs.readFileSync(GATE, "utf8");
  gateRealBand = (/^const REAL_BAND = (\/.+\/[a-z]*);/m.exec(g) || [])[1] || null;
} catch (e) { }
t("从门源码抠到 REAL_BAND（抠不到就红，本测试不许自己编一条判点）", !!gateRealBand, gateRealBand);
const REAL_BAND = gateRealBand ? eval(gateRealBand) : null;

/* 参照实现：CLI 腿的 row() 形参数（它闭包常量、只收 9 个位置参数）——WS 的 mkRow 必须同形。 */
let cliRowParams = null;
try {
  const c = fs.readFileSync(CLI, "utf8");
  const m = /^function row\(([^)]*)\)\s*\{/m.exec(c);
  if (m) cliRowParams = m[1].split(",").map((s) => s.trim()).filter(Boolean);
} catch (e) { }
t("参照实现 r-exec-cli.mjs 的 row() 形参读到了（band/identity 由它自己闭包常量注入）",
  !!cliRowParams && cliRowParams.length === 9, cliRowParams && cliRowParams.join(","));

/* ── 词法扫描器：跳过注释/字符串/正则字面量，给出「这一位是不是代码」的掩码 ────────
   上一版没有认正则字面量，于是 /\s+/ 这类式子里的引号与括号把状态机带偏，括号配平一路跑到
   后面几个函数头上（取到的"mkRow 体"里混进了 OPEN_ATTEMPTS/automator）—— 那本身就是这一族
   缺陷的形状：解析口径错了，断言就只是看起来在咬。正则/除法用"前一个代码 token"判。 */
const REGEX_OK_AFTER = new Set(["", "(", ",", "=", ":", "[", "!", "&", "|", "?", "{", "}", ";", "+", "-", "*", "%", "<", ">", "~", "^", "/", "\n"]);
const REGEX_KEYWORDS = /(?:^|[^A-Za-z0-9_$])(return|typeof|case|in|of|do|else|yield|await|new|delete|void|instanceof)\s+$/;
function codeMask(src) {
  const m = new Uint8Array(src.length).fill(1);
  const prevCodeChar = (i) => { for (let j = i - 1; j >= 0; j--) { if (/\s/.test(src[j])) continue; return src[j]; } return ""; };
  let i = 0;
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (c === "/" && d === "/") { while (i < src.length && src[i] !== "\n") { m[i] = 0; i++; } continue; }
    if (c === "/" && d === "*") { m[i] = 0; m[i + 1] = 0; i += 2; while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) { m[i] = 0; i++; } m[i] = 0; m[i + 1] = 0; i += 2; continue; }
    if (c === "/") {
      const p = prevCodeChar(i);
      const isRegex = REGEX_OK_AFTER.has(p) || REGEX_KEYWORDS.test(src.slice(Math.max(0, i - 14), i));
      if (isRegex) {
        m[i] = 0; i++; let cls = false;
        while (i < src.length) {
          const x = src[i];
          if (x === "\\") { m[i] = 0; m[i + 1] = 0; i += 2; continue; }
          if (x === "\n") break;
          m[i] = 0;
          if (x === "[") cls = true;
          else if (x === "]") cls = false;
          else if (x === "/" && !cls) { i++; break; }
          i++;
        }
        continue;
      }
      i++; continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      const q = c; m[i] = 0; i++;
      while (i < src.length) {
        if (src[i] === "\\") { m[i] = 0; m[i + 1] = 0; i += 2; continue; }
        if (q !== "`" && src[i] === "\n") break;
        m[i] = 0;
        if (src[i] === q) { i++; break; }
        i++;
      }
      continue;
    }
    i++;
  }
  return m;
}

/* 从 `at`（指向名字后紧跟的 "("）数顶层实参个数，跨行、括号/方括号/花括号都算深度。 */
function arityAt(src, mask, at) {
  let i = src.indexOf("(", at);
  if (i < 0) return null;
  let depth = 0, args = 0, seenContent = false;
  for (; i < src.length; i++) {
    if (!mask[i]) continue;
    const ch = src[i];
    if (ch === "(" || ch === "[" || ch === "{") { depth++; continue; }
    if (ch === ")" || ch === "]" || ch === "}") {
      depth--;
      if (depth === 0) return seenContent ? args + 1 : 0;
      continue;
    }
    if (depth <= 0) continue;
    if (ch === ",") { if (depth === 1) args++; continue; }
    if (!/\s/.test(ch)) seenContent = true;
  }
  return null;
}
const lineOf = (src, idx) => src.slice(0, idx).split(/\r?\n/).length;
const idChar = (c) => /[A-Za-z0-9_$]/.test(c || "");

/* ── 取源码：默认读权威件；红证跑在 .zcode/tmp 的副本上（源件里不许做破坏性实验） ── */
let src = "";
try { src = fs.readFileSync(SRC_FILE, "utf8"); } catch (e) { }
t("读到执行器源码 " + path.relative(REPO, SRC_FILE), !!src);
if (!src) { console.log("SUMMARY: assertion failures = " + (fails + 1)); console.log("WSARITY_TEST=FAIL（源码读不到，后面的断言一条都没跑）"); process.exit(1); }
const mask = codeMask(src);

/* ── ① 结构：row() 仍是 GATE 区那 12 位的纯函数；mkRow 必须逐位写死 ── */
function extractFn(named) {
  const re = new RegExp("^(export\\s+)?function\\s+" + named + "\\s*\\(", "m");
  const mm = re.exec(src);
  if (mm) {
    const at = src.indexOf("{", mm.index);
    if (at >= 0) {
      let depth = 0;
      for (let i = at; i < src.length; i++) {
        if (!mask[i]) continue;
        if (src[i] === "{") depth++;
        else if (src[i] === "}") { depth--; if (depth === 0) return { start: mm.index, end: i + 1, text: src.slice(mm.index, i + 1) }; }
      }
    }
  }
  /* 退路：生产者被改写成箭头式 `const mkRow = (...) => ...;` 时也要取到（修复前就是这一形），
     否则本测试只会报"取不到"，把真正该红的结构性判据（散布/注入/位数）全部跳过。 */
  const re2 = new RegExp("^(?:export\\s+)?const\\s+" + named + "\\s*=", "m");
  const mm2 = re2.exec(src);
  if (!mm2) return null;
  let end = src.indexOf(";", mm2.index);
  if (end < 0) return null;
  /* 单行到分号；跨行的箭头体按括号配平收到 depth=0 的那个 ")" 后面 */
  let depth = 0, i = src.indexOf("=", mm2.index);
  for (; i < src.length; i++) {
    if (!mask[i]) continue;
    if (src[i] === "(" || src[i] === "[" || src[i] === "{") depth++;
    else if (src[i] === ")" || src[i] === "]" || src[i] === "}") { depth--; if (depth < 0) break; }
  }
  const stop = Math.min(end === -1 ? src.length : end + 1, i < src.length ? i + 1 : src.length);
  return { start: mm2.index, end: stop, text: src.slice(mm2.index, stop) };
}
const ROW = extractFn("row");
const MK = extractFn("mkRow");
t("从执行器里取到 row()（取不到＝那层实现被搬走/删掉，本测试不许当绿）", !!ROW);
t("从执行器里取到 mkRow()（本腿唯一的行生产者；取不到就是被拆成了裸 row() 调用）", !!MK);
if (!ROW || !MK) { console.log("SUMMARY: assertion failures = " + (fails + 1)); console.log("WSARITY_TEST=FAIL（生产者取不到，后面的断言一条都没跑）"); process.exit(1); }

const rowParams = (/^export function row\(([^)]*)\)/.exec(ROW.text) || [, ""])[1].split(",").map((s) => s.trim()).filter(Boolean);
t("row() 仍是 12 位形参、尾巴是 band,identity,session（门读的那四列都在这三格上）",
  rowParams.length === 12 && rowParams.slice(9).join(",") === "band,identity,session", rowParams.join(","));
const gateBegin = src.indexOf("/* WSX-GATE-BEGIN */"), gateEnd = src.indexOf("/* WSX-GATE-END */");
t("row() 仍在 WSX-GATE 区内（离线夹具按字节切这段，见 .zcode/tmp/gap-wsx/gate-harness.mjs:24）",
  gateBegin >= 0 && gateEnd >= 0 && ROW.start > gateBegin && ROW.start < gateEnd);
t("row() 保持纯：函数体里不读 BAND_STR/IDENTITY/SESSION 这些模块级量（纯性是 GATE 区的硬约束）",
  !/\bBAND_STR\b|\bIDENTITY\b|(?<![\w.])SESSION\b/.test(ROW.text.slice(ROW.text.indexOf("{"))));
const mkParams = (/^function mkRow\(([^)]*)\)/.exec(MK.text) || [, ""])[1].split(",").map((s) => s.trim().replace(/=.*/, "")).filter(Boolean);
t("mkRow() 形参逐位写死（9 位，与 r-exec-cli.mjs 的 row() 同形），不是 (...a) 散布",
  mkParams.length === 9 && !/\.\.\./.test(MK.text.slice(0, MK.text.indexOf("{"))), mkParams.join(","));
t("mkRow() 把档位/身份/会话证据按闭包常量注入到 band/identity/session 三格",
  /,\s*BAND_STR\s*,\s*IDENTITY\s*,\s*SESSION\s*\)/.test(MK.text));
t("mkRow() 拒绝多余的位置参数（想从调用点塞自己的 band ⇒ 当场抛，不静默落账）",
  /arguments\.length\s*>\s*9/.test(MK.text));

/* 裸 row(...) 调用：除定义外，只允许出现在 mkRow 体内（:333 那条既有纪律） */
const bareRow = [];
const reRow = /row\s*\(/g; let mm2;
while ((mm2 = reRow.exec(src))) {
  if (!mask[mm2.index]) continue;
  const pre = src.slice(Math.max(0, mm2.index - 1), mm2.index);
  if (idChar(pre) || idChar(src.slice(Math.max(0, mm2.index - 2), mm2.index - 1).slice(0, 1)) && false) continue;
  if (pre && /[A-Za-z0-9_$]/.test(pre)) continue; // mkRow( / rowMeasured( 之类
  const before = src.slice(Math.max(0, mm2.index - 20), mm2.index);
  if (/\bfunction\s+$/.test(before)) continue; // 定义本身
  const at = mm2.index;
  if (at >= MK.start && at < MK.end) continue; // mkRow 体内那一次
  bareRow.push(":" + lineOf(src, at));
}
t("本腿除 mkRow 内部那一次之外没有裸 row(...) 调用（裸调用＝漏盖 band/identity 的入口）",
  bareRow.length === 0, bareRow.join(" "));

/* ── ② 每个调用点的 arity 都必须正好 9（少一个就是往左滑，这条就是"少传必红"） ── */
const sites = [];
const reCall = /mkRow\s*\(/g; let m2;
while ((m2 = reCall.exec(src))) {
  if (!mask[m2.index]) continue;
  const before = src.slice(Math.max(0, m2.index - 20), m2.index);
  if (/\b(function|const|let|var)\s+$/.test(before)) continue; // 定义
  const n = arityAt(src, mask, m2.index);
  sites.push({ line: lineOf(src, m2.index - 6), args: n });
}
t("扫到了 mkRow 调用点（一条都没扫到＝扫描集为空，本测试不许当绿）", sites.length >= 16, "调用点=" + sites.length);
const badSites = sites.filter((s) => s.args !== 9);
t("每一个 mkRow 调用点都传满 9 个位置参数（band/identity/loginVerify/sessionSource 不由调用点负责）",
  badSites.length === 0, "位数≠9 的行：" + badSites.map((s) => ":" + s.line + "=" + s.args).join(" "));
console.log("WSARITY_SITES " + sites.map((s) => ":" + s.line + "=" + s.args).join(" "));

/* ── ③ 行为：现抠的 row()+mkRow() 真造一次行，四列必须是门读得动的形状 ── */
/* new Function 的函数体里不能有 ESM 的 export 关键字 ⇒ 只剥掉那一个词，函数体一字不动 */
const ROW_SRC = ROW.text.replace(/^export\s+/, "");
const BAND_STR = "real@deadbeef", IDENTITY = "A", SESSION = { source: "/auth/login", verify: "logged-in uid=42" };
let M = null, evalErr = "";
const BODY = ROW_SRC + "\n" + MK.text + "\n return { row: row, mkRow: mkRow };";
if (process.env.QA_WS_ROW_DUMP) fs.writeFileSync(path.join(REPO, ".zcode", "tmp", "ws-row-body.js"), BODY, "utf8");
try {
  M = new Function("BAND_STR", "IDENTITY", "SESSION", BODY)(BAND_STR, IDENTITY, SESSION);
} catch (e) { evalErr = String(e && e.stack || e).split("\n").slice(0, 4).join(" / "); }
t("eval 出来的 mkRow 是函数（取不到口径就红，不许回落测试自己写的桩）", !!M && typeof M.mkRow === "function", evalErr);
if (!M) { console.log("SUMMARY: assertion failures = " + (fails + 1)); console.log("WSARITY_TEST=FAIL（生产者 eval 不出来）"); process.exit(1); }

const CASE = { id: "X01", tier: "normal", title: "守卫夹具用例", requiresReal: false };
const FULL = ["MAN", "pages/x/index", CASE, "FAILED", "pages/x/index", "reason", "obs", "evid-帧", ["gap-1"]];
function assertStamped(tag, r, expEvid, expMiss) {
  t(tag + "：band 是字符串且匹配 /^(real|mock|showcase)(@|$)/",
    typeof r.band === "string" && BAND_MODE_RE.test(r.band), JSON.stringify(r.band));
  t(tag + "：String(band) 能被门自己的 REAL_BAND 认领（这就是那条「[object Object]」死掉的判点）",
    !!(REAL_BAND && REAL_BAND.test(String(r.band))), String(r.band));
  t(tag + "：identity 非空且是门两条轴读得动的词（A/B/minor | guest/not-logged-in）",
    typeof r.identity === "string" && /^(A|B|guest|minor|none)$/.test(r.identity), JSON.stringify(r.identity));
  t(tag + "：loginVerify/sessionSource 都是字符串（会话证据与身份标签分家落账）",
    typeof r.loginVerify === "string" && typeof r.sessionSource === "string",
    JSON.stringify(r.loginVerify) + "/" + JSON.stringify(r.sessionSource));
  t(tag + "：会话证据真落上了（不是空串冒充没证据）",
    r.loginVerify === SESSION.verify && r.sessionSource === SESSION.source, r.loginVerify + " | " + r.sessionSource);
  t(tag + "：evid/miss 落在 evidence/missingEvidence 上，没有被挤到别的槽（滑位的直接判据）",
    r.evidence === expEvid && JSON.stringify(r.missingEvidence) === JSON.stringify(expMiss),
    JSON.stringify(r.evidence) + "/" + JSON.stringify(r.missingEvidence));
  t(tag + "：档位串没有冒充证据（缺陷的另一半：evidence 里躺着 real@sha8 ⇒ rowMeasured 假绿）",
    !BAND_MODE_RE.test(String(r.evidence)), String(r.evidence));
}
assertStamped("9 参（满位）", M.mkRow.apply(null, FULL), "evid-帧", ["gap-1"]);

/* 每个调用点 arity 各造一次：少传也必须盖得上（结构上滑不动） */
const arities = [...new Set(sites.map((s) => s.args))].sort();
for (const n of arities) {
  const r = M.mkRow.apply(null, FULL.slice(0, n));
  assertStamped("调用点 arity=" + n, r, n >= 8 ? FULL[7] : "", n >= 9 ? FULL[8] : []);
}
/* 8 参（忘传 miss）与 7 参（忘传 evid+miss）是这次事故的两个形状：band 仍须正确 */
const r7 = M.mkRow("MAN", "p", CASE, "SKIPPED", "route", "reason", "obs");
t("7 参调用（旧缺陷的形状）现在也只是没有帧，band 照样盖上 ⇒ 缺陷类被结构性堵住",
  r7.band === BAND_STR && r7.identity === IDENTITY, r7.band + "/" + r7.identity);
t("7 参调用的 evidence 不再是一枚档位串（伪证据消失）", !BAND_MODE_RE.test(String(r7.evidence)) && r7.evidence === "", JSON.stringify(r7.evidence));
t("7 参调用的 missingEvidence 是数组不是身份标签串", Array.isArray(r7.missingEvidence) && r7.missingEvidence.length === 0, JSON.stringify(r7.missingEvidence));
let threw = false;
try { M.mkRow("MAN", "p", CASE, "SKIPPED", "route", "reason", "obs", "", [], "real@forged"); } catch (e) { threw = /WSX_ROW_ARITY/.test(String(e.message)); }
t("第 10 个位置参数（调用点自带档位）必须抛 WSX_ROW_ARITY", threw);

/* SESSION 是 boot 之后才填的（:1330/:1344 改写同一个对象）⇒ 行必须读得到改写后的值 */
SESSION.source = "/auth/guest-login"; SESSION.verify = "logged-in uid=7";
const late = M.mkRow.apply(null, FULL);
t("mkRow 读的是 SESSION 引用（boot 后改写的会话证据能追上进行）",
  late.sessionSource === "/auth/guest-login" && late.loginVerify === "logged-in uid=7", late.sessionSource + "/" + late.loginVerify);

/* ── ④ 空转防护：修复前的形状必须违反上面同一条主断言（负例咬不动=没测） ── */
const legacy = new Function("BAND_STR", "IDENTITY", "SESSION",
  ROW_SRC + "\n const mkRowLegacy = (...a) => row(...a, BAND_STR, IDENTITY, SESSION);\n return mkRowLegacy;")(BAND_STR, IDENTITY, SESSION);
const pre = legacy("MAN", "p", CASE, "FAILED", "", "open_page 失败", "");
t("空转防护：修复前的 (...a) 散布 + 7 参调用确实产出 band=对象 / identity=\"\" ⇒ 主断言真的会红",
  typeof pre.band === "object" && String(pre.band) === "[object Object]" && pre.identity === "",
  JSON.stringify(pre.band) + " identity=" + JSON.stringify(pre.identity));
t("空转防护：修复前那条行上 evidence=档位串、missingEvidence=身份串（伪证据形状）",
  pre.evidence === BAND_STR && pre.missingEvidence === IDENTITY, JSON.stringify(pre.evidence) + "/" + JSON.stringify(pre.missingEvidence));
t("空转防护：修复前的形状被门的 REAL_BAND 判死（String(band)=「[object Object]」⇒ 一行钱都不领）",
  !(REAL_BAND && REAL_BAND.test(String(pre.band))));
t("空转防护：修复前的 (...a) 形状本身违反本测试的结构判据（不是只有行为判据能咬到它）",
  /\(\s*\.\.\.a\s*\)\s*=>/.test("const mkRow = (...a) => row(...a, BAND_STR, IDENTITY, SESSION);"));

console.log("SUMMARY: assertion failures = " + fails);
console.log(fails ? "WSARITY_TEST=FAIL" : "WSARITY_TEST=PASS");
process.exit(fails ? 1 : 0);
