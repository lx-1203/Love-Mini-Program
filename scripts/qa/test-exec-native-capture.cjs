#!/usr/bin/node
/* 负例（capability 车道 #1：Toast / 原生 Modal 调用流）
   ── 这条测试要钉住的病 ──────────────────────────────────────────────────────────────
   r-exec-cli.mjs 以前把 row.toast / row.console 钉死成字面空串（全文件再无第二处赋值），
   于是"Toast 文案/条数"这类判点在本项目被宣告成**不可测**（c21 审计 G-4：372 条判据点名 Toast、
   G-5：864 条点名 console，零条记下欠账）。而同一件事在老执行器里是做得到的：
   scripts/qa/r1-exec.cjs:278-299 installToastHook（包 showToast/hideToast/showModal/showLoading，
   见 :293）与 :300-305 drainToasts 都是**纯 evaluate 载荷**，而 r-exec-cli.mjs:25 早就 import 了
   evaluate ⇒ 这是"能接而没接"，不是新造通道。
   ── 空转防护（这条测试自己的负例）────────────────────────────────────────────────
   它会把**特征摘掉**做一遍：把活文件拷到 .zcode/tmp/ 下、把这几个纯函数改名并把 row() 的字段还原成
   钉死的空串，再拿同一套断言去跑那份变异体 ⇒ 必须变红。跑完立刻删掉变异体（绝不留盘、
   绝不改活脚本来测负例）。红不出来就说明上面那批"toast 落进字段"的断言是空转的绿。
   ── 聚合器认的输出 ───────────────────────────────────────────────────────────────
   SUMMARY: assertion failures = N（run-qa-selftests.mjs:49）+ NATIVE_TEST=PASS|FAIL（:52）
   跑法：PATH=<node22 目录>:$PATH node scripts/qa/test-exec-native-capture.cjs
   只读判据台 + 只读活文件，不碰模拟器、不取租约、不派生 IDE。 */
"use strict";
const fs = require("node:fs");
const path = require("node:path");

const REPO = path.resolve(__dirname, "..", "..");
const LIVE = process.env.EXEC_UNDER_TEST
  ? path.resolve(REPO, process.env.EXEC_UNDER_TEST)
  : path.join(REPO, "scripts", "qa", "r-exec-cli.mjs");
const OPS = path.join(REPO, "reports", "audit", "round-6", "ops");
/* 变异体只落在 .zcode/tmp 下，且**每条都带 return 路径**（本仓为"删到一半失败却把剩下的删了"记过账：
   不用 rm -rf 一个可能被占的目录，只按文件名删自己造的那两个）。 */
const MUTANT = path.join(REPO, ".zcode", "tmp", "mutant-exec-native-capture.mjs");

let fails = 0, checks = 0;
function t(name, cond, detail) {
  checks++;
  if (!cond) { fails++; console.log("FAIL " + name + (detail === undefined ? "" : " :: " + String(detail).slice(0, 300))); }
  else console.log("ok   " + name + (detail === undefined ? "" : "  (" + String(detail).slice(0, 170) + ")"));
}

/* 与 scripts/qa/test-exec-probe-geometry.cjs:27-39 同一份抠法（口径不许两半分家）：
   纯函数从**活文件里现抠**，测试里绝不另抄一份实现 —— 抄了测的就不是执行器。 */
function extract(src, name) {
  const at = src.indexOf("function " + name + "(");
  if (at < 0) return null;
  const rest = src.slice(at);
  const firstLine = rest.slice(0, rest.indexOf("\n")).trim();
  if (firstLine.endsWith("}") && !firstLine.endsWith("{")) return firstLine;
  const close = rest.indexOf("\n}");
  if (close < 0) return null;
  const body = rest.slice(0, close + 2).trim();
  return body.startsWith("function " + name + "(") && body.endsWith("}") ? body : null;
}
function grabRe(src, name) {
  const m = new RegExp("const " + name + " = (/.*/[a-z]*);").exec(src);
  return m ? m[1] : null;
}

const NAMES = ["nativeHookSource", "nativeDrainSource", "interpretNative", "consoleLines", "toastSummary", "evidenceKindsNamed", "evidenceGaps"];
function loadExec(src, label) {
  const got = {};
  for (const n of NAMES) got[n] = extract(src, n);
  const FRAME_RE = grabRe(src, "FRAME_RE");
  const missing = NAMES.filter((n) => !got[n]).concat(FRAME_RE ? [] : ["FRAME_RE"]);
  if (missing.length) { console.log("[" + label + "] 抠不到：" + missing.join(",")); return null; }
  /* evidenceGaps 用到 toastSummary/evidenceKindsNamed，都在同一批里；参数名 FRAME_RE 作常量注入。 */
  return new Function("FRAME_RE", NAMES.map((n) => got[n]).join("\n") + "\n return {" + NAMES.join(",") + "};")(
    new Function("return " + FRAME_RE)());
}

let src = "";
try { src = fs.readFileSync(LIVE, "utf8"); } catch (e) { console.log("READ_ERR " + e.message); }
if (!src) { console.log("SUMMARY: assertion failures = 1"); console.log("NATIVE_TEST=FAIL（活文件读不到，一条断言都没跑）"); process.exit(1); }
console.log("被测文件=" + path.relative(REPO, LIVE) + " 行数=" + src.split(/\r\n|\n/).length);

const M = loadExec(src, "live");
t("执行器里取到这一车道新增的 7 个纯函数（取不到就是没接线）", !!M, M ? "ok" : "见上面 missing");
if (!M) { console.log("SUMMARY: assertion failures = " + (fails + 1)); console.log("NATIVE_TEST=FAIL（口径取不到，后面的断言一条都没跑）"); process.exit(1); }
const { nativeHookSource, nativeDrainSource, interpretNative, consoleLines, toastSummary, evidenceKindsNamed, evidenceGaps } = M;

/* ── 1. 钩子载荷：它是纯 evaluate 字符串 ⇒ 不碰设备也能审它问了什么、包了谁、留没留原函数 ── */
const hook = nativeHookSource();
/* 判点用「wrap 调用点」的正则，字符串引号写法由这里统一给（活实现用单引号，
   以后谁改成双引号也不该让这条测试假红 —— 测的是"包了哪几个 API"，不是引号样式）。 */
const wrapped = (name) => {
  const r = new RegExp("wrap\\( ?(['\"])" + name + "\\1 ?\\)");
  return r.test(hook);
};
t("包的是 r1-exec.cjs:293 那一列四个 API（showToast/hideToast/showModal/showLoading），一个都不少",
  ["showToast", "hideToast", "showModal", "showLoading"].every(wrapped),
  ["showToast", "hideToast", "showModal", "showLoading"].map((n) => n + "=" + wrapped(n)).join(","));
t("showModal 在包裹列里 ⇒「原生 Modal 有没有被调用过」从此是**可观察**的（c21 (d)-c-3 的观察半边）",
  wrapped("showModal"));
t("不 overclaim：没把 showActionSheet 说成已覆盖（驱动选项那半边是 [NEW]，本车道不接）",
  !wrapped("showActionSheet"));
t("原样透传被包函数（orig.apply）⇒ 装钩子不改变被测小程序的行为，只留调用记录",
  /orig\.apply\(wx, arguments\)/.test(hook) && /orig\.apply\(console, arguments\)/.test(hook));
t("幂等：__qaNativeHooked 在位时返回 already（照 r1-exec.cjs:281，重复装会把 toast 记双份）",
  /__qaNativeHooked/.test(hook) && /already/.test(hook));
t("installed / already / ERR 三态分得开（装不上必须看得见，不能静默当装上了）",
  /return 'installed'/.test(hook) && /return 'already'/.test(hook) && /ERR/.test(hook));
t("包裹记录带 api + title（r1-exec.cjs:288 的字段形状），DND08 判据②要的「Toast 条数=1」由此可数",
  /api: name/.test(hook) && /\.title/.test(hook));
t("console 也进袋（__qaLogs），并把 warn/error 一起包 ⇒ row.console 不再是恒空串",
  /__qaLogs/.test(hook) && /cwrap\('warn'\)/.test(hook) && /cwrap\('error'\)/.test(hook));
t("取件是 splice（排空）⇒ 每条判据拿到的是**自己窗口内**的调用，不会把上一条的 toast 记到这一条头上",
  /\.splice\(0\)/.test(nativeDrainSource()), (nativeDrainSource().match(/splice\(0\)/g) || []).length + " 处");
t("取件串带 hooked 位（钩子掉了必须能看出来，不能读成「这一条没弹 toast」）",
  /__qaNativeHooked/.test(nativeDrainSource()));

/* ── 2. 翻译层：设备回来的串必须变成行字段要的形状 ── */
const ONE = { toasts: [{ api: "showToast", title: "设置已保存", ts: 1 }], logs: [{ level: "error", text: "PUT /dnd 500" }], hooked: true };
const parsed = interpretNative(JSON.stringify(ONE));
t("interpretNative 把取件串翻成两个数组（行要的是数组，不是被截断的字符串）",
  Array.isArray(parsed.toasts) && parsed.toasts.length === 1 && Array.isArray(parsed.logs) && parsed.logs.length === 1,
  JSON.stringify(parsed).slice(0, 120));
t("IDE 常在前面塞一行噪声（CLI_PROJECT_ABS…）⇒ 从第一个 { 起解析，不许整体判废",
  interpretNative('IDE_PROJECT_ABS 传入=x {"toasts":[{"api":"showModal","title":"确认删除"}],"logs":[],"hooked":true}').toasts.length === 1);
t("解析失败不抛、不伪造：返回空数组 + err（把通道故障读成「没有 toast」就是凭空造绿）",
  (function () { const r = interpretNative("not json at all"); return r.toasts.length === 0 && r.logs.length === 0 && !!r.err; })());
t("钩子掉了（hooked=false）时 err/hooked 读得出 ⇒ 行不许把这条读成「本条无 toast」",
  interpretNative(JSON.stringify({ toasts: [], logs: [], hooked: false })).hooked === false);
t("toastSummary 给出条数（DND08 判据②「Toast 条数=1」就是这一串）",
  toastSummary([{ api: "showToast", title: "设置已保存" }]).startsWith("条数=1"),
  toastSummary([{ api: "showToast", title: "设置已保存" }]));
t("一条都没采到时写「无」，不写空 ⇒ 与 条数=0 同义但不会与「字段没填」混",
  toastSummary([]) === "无" && toastSummary(undefined) === "无");
t("consoleLines 照 r1-exec.cjs:1393 的口径：log 级默认不收，但 log 里带 error/warn/fail/TypeError 的收",
  consoleLines([{ level: "log", text: "普通一行" }, { level: "log", text: "TypeError: x is not defined" }, { level: "warn", text: "w" }, { level: "error", text: "e" }]).length === 3,
  JSON.stringify(consoleLines([{ level: "log", text: "普通一行" }, { level: "log", text: "TypeError: x" }, { level: "warn", text: "w" }, { level: "error", text: "e" }])).slice(0, 140));
t("consoleLines 不吞 undefined（喂坏形状不许抛，行必须出得来）",
  Array.isArray(consoleLines(undefined)) && consoleLines(undefined).length === 0);

/* ── 3. 证据点名表 + 欠账（c21 审计 C-3：c.evidence 里五种证据只被读过"截图"那一种）── */
const kinds = evidenceKindsNamed({ evidence: "截图 + Toast 文案 + console + network 计数", title: "" });
t("evidence 串里四类点名都抠得出来（以前只有 FRAME_RE 那一种被读）",
  kinds.frame && kinds.toast && kinds.console && kinds.network, JSON.stringify(kinds));
t("没点名的判据不许凭空欠账（宁缺毋滥：把没要求的证据记成欠项会造出一批假欠）",
  (function () { const k = evidenceKindsNamed({ evidence: "截图", title: "看列表渲染" }); return !k.toast && !k.console && !k.network; })());
t("旗标没开 ⇒ 点名 Toast/console/network 的判据各记一条欠账，且串里写明是**载具没采**",
  (function () { const g = evidenceGaps({ evidence: "Toast + console + network", title: "" }, { on: false, toastCount: 0, consoleCount: 0 }); return g.length === 3 && g.every((x) => /--native-capture|审计 G-2/.test(x)); })(),
  JSON.stringify(evidenceGaps({ evidence: "Toast + console + network", title: "" }, { on: false, toastCount: 0, consoleCount: 0 })).slice(0, 200));
t("开了旗标且窗口里有 toast ⇒ 不再报欠账（报就是撒谎）；开了但窗口为空 ⇒ 报的是「采了但没弹」，与「没采」**两句不同的话**",
  (function () {
    const ok = evidenceGaps({ evidence: "Toast", title: "" }, { on: true, toastCount: 2, consoleCount: 0 });
    const zero = evidenceGaps({ evidence: "Toast", title: "" }, { on: true, toastCount: 0, consoleCount: 0 });
    return ok.length === 0 && zero.length === 1 && /通道已开但本条窗口内 0 条/.test(zero[0]) && !/没带 --native-capture/.test(zero[0]);
  })());
t("network 那一条在本车道恒记欠账（审计 G-2 判它 [NEW]，没有逐请求计数通道 ⇒ 不许假装覆盖）",
  evidenceGaps({ evidence: "network 请求条数", title: "" }, { on: true, toastCount: 5, consoleCount: 5 }).some((x) => /逐请求计数通道/.test(x)));

/* ── 4. 接线判点：读数必须真的落到 reporters 读的那两个字段上 ── */
t("row() 里 toast/console 不再是字面空串（这条是整车道存在的理由）",
  /toast: toastVal, console: consoleVal/.test(src), /toast: "", console: ""/.test(src) ? "仍在钉死成空串" : "ok");
t("取件在 row() 内部发生 ⇒ 每一条出口（含 SKIPPED/FAILED 这些被拒的路径）都填自己的读数，不会只在成功路径填",
  (function () { const at = src.indexOf("function row("); const body = src.slice(at, at + 2600); return /nativeDrain\(\)/.test(body) && /evidenceGaps\(c,/.test(body); })());
t("行上带 nativeCapture / consoleScope 出处位（应用上下文那一份不许被读成 DevTools 全量控制台）",
  /nativeCapture:/.test(src) && /consoleScope:/.test(src) && /app-context-only/.test(src));
t("evidenceGaps 走**新字段**，不塞进 missingEvidence（那字段的消费者 emit-exec-manifest.mjs:54 是按帧拒收正则抠的）",
  /evidenceGaps: gaps,/.test(src) && !/missingEvidence: .*gaps/.test(src));
t("钩子装在会话就绪之后、开页之前（游客闸门/守卫弹回的 showModal 就在 onLoad 那一刻，装晚了永远采不到）",
  (function () { const iBoot = src.indexOf("RUN.booted = true;"); const iHook = src.indexOf("const NATIVE_INSTALL = nativeInstall();"); const iOpen = src.indexOf("openPage(page, ROUTE_QUERY"); return iBoot > 0 && iHook > iBoot && iOpen > iHook && src.slice(iHook, iOpen).includes("RUNNER_NATIVE_CAPTURE"); })(),
  "boot=" + src.indexOf("RUN.booted = true;") + " install=" + src.indexOf("const NATIVE_INSTALL = nativeInstall();") + " openPage=" + src.indexOf("openPage(page, ROUTE_QUERY"));
t("组基线先排一次件 ⇒ 开页那一瞬的 toast 落进组日志（RUNNER_GROUP_NATIVE），不落到本页第一条判据头上",
  /RUNNER_GROUP_NATIVE/.test(src));
t("不带旗标时一次设备调用都不多发（非破坏性：nativeInstall/nativeDrain 各自先查 NATIVE_CAPTURE）",
  (function () { const i = src.indexOf("function nativeInstall()"); const j = src.indexOf("function nativeDrain()"); return /if \(!NATIVE_CAPTURE\)/.test(src.slice(i, i + 120)) && /if \(!NATIVE_CAPTURE\) return null;/.test(src.slice(j, j + 120)); })());
t("runner 字段里看得见这一腿开没开钩标（+capture），载具不许对自己的能力撒谎",
  /\+capture/.test(src) && /MODE_SUFFIX/.test(src));

/* ── 5. 真实判据台：点名 Toast 的行确实一大片（扫描集非空，不许是合成样本自证）── */
const names = fs.readdirSync(OPS).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")).sort();
let total = 0, toastNamed = 0, sample = [];
for (const n of names) {
  let mf; try { mf = JSON.parse(fs.readFileSync(path.join(OPS, n + ".json"), "utf8")); } catch (e) { continue; }
  for (const c of mf.cases || []) {
    total++;
    if (evidenceKindsNamed(c).toast) { toastNamed++; if (sample.length < 3) sample.push(c.id); }
  }
}
t("判据台扫到了（1107 条量级；扫到 0 条说明这条测试在空转）", total >= 1000, "cases=" + total);
t("点名 Toast 证据的判据确实成片（c21 审计 G-4 记的是 372 条）⇒ 本车道接的不是三条特例",
  toastNamed >= 200, toastNamed + " 条，样本 " + sample.join(","));
const dnd08 = (() => { for (const n of names) { try { const mf = JSON.parse(fs.readFileSync(path.join(OPS, n + ".json"), "utf8")); const f = (mf.cases || []).find((c) => c.id === "DND08"); if (f) return f; } catch (e) { } } return null; })();
const dnd08Text = dnd08 ? String(dnd08.action || "") + " " + String(dnd08.expected || "") : "";
t("DND08 找得到，且它的「Toast…条数=1」这一判点现在有载具可量了",
  !!dnd08 && /Toast/.test(dnd08Text) && /条数\s*=\s*1/.test(dnd08Text) && evidenceKindsNamed(dnd08).toast === true,
  dnd08 ? dnd08Text.slice(0, 70) : "null");

/* ── 6. 空转防护：把特征摘掉，同一套断言必须变红 ── */
t("活文件里已经找不到把 toast/console 钉死成空串的写法", !/toast: "", console: ""/.test(src));
let mutantWritten = false;
try {
  const mut = src
    .replace(/function nativeHookSource\(/, "function _摘除_nativeHookSource(")
    .replace(/function nativeDrainSource\(/, "function _摘除_nativeDrainSource(")
    .replace(/function interpretNative\(/, "function _摘除_interpretNative(")
    .replace(/function consoleLines\(/, "function _摘除_consoleLines(")
    .replace(/function toastSummary\(/, "function _摘除_toastSummary(")
    .replace(/function evidenceKindsNamed\(/, "function _摘除_evidenceKindsNamed(")
    .replace(/function evidenceGaps\(/, "function _摘除_evidenceGaps(")
    .replace(/route: route \|\| "", toast: toastVal, console: consoleVal, evidence: evid \|\| "",/,
      'route: route || "", toast: "", console: "", evidence: evid || "",');
  mutantWritten = mut !== src;
  fs.mkdirSync(path.dirname(MUTANT), { recursive: true });
  fs.writeFileSync(MUTANT, mut);
} catch (e) { console.log("MUTANT_WRITE_ERR " + e.message); }
try {
  const msrc = mutantWritten ? fs.readFileSync(MUTANT, "utf8") : "";
  const mm = msrc ? loadExec(msrc, "mutant") : null;
  t("空转防护：变异体（摘掉这七个纯函数 + 把 row 的 toast/console 还原成钉死空串）里抠不到这套口径 ⇒ 上面那批断言确实会红",
    mutantWritten && !mm, mutantWritten ? (mm ? "变异体居然还能抠到（说明断言空转）" : "抠不到，符合预期") : "变异没落到盘上，负例未成立");
  t("空转防护：变异体的 row() 里 toast/console 又变回字面空串（这就是接线下游会误报的形状）",
    /toast: "", console: "", evidence:/.test(fs.existsSync(MUTANT) ? fs.readFileSync(MUTANT, "utf8") : ""));
} finally {
  /* 变异体用完即删（只删自己造的那一个文件；绝不递归删目录） */
  try { if (fs.existsSync(MUTANT)) fs.unlinkSync(MUTANT); } catch (e) { console.log("MUTANT_CLEANUP_ERR " + e.message); }
}
t("收尾：变异体不留盘（活文件全程未被改动）", !fs.existsSync(MUTANT));

console.log("SUMMARY: assertion failures = " + fails);
console.log(fails ? "NATIVE_TEST=FAIL" : "NATIVE_TEST=PASS");
process.exit(fails ? 1 : 0);
