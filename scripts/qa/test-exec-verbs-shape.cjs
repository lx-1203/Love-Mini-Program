#!/usr/bin/node
/* 负例（capability 车道 #10-c 的另一半：**不带旗标时形状守恒**）
   ── 这条测试要钉住的病 ──────────────────────────────────────────────────────────────
   #10-c 往在役 runner（scripts/qa/r-exec-cli.mjs）里接了三条通道：--rapid（重复下发）、
   --scroll（页级/scroll-view 滚动 + scrollOffset 回读）、--geom-pos（boundingClientRect 的
   left/top 与 scroll-view 内部滚动位置进 geometry）。三条都必须是**加法**：
   一个旗标都不带时，落盘行的**字段名与取值形状**必须与接它们之前逐字相同 ——
   因为 reports/audit/round-7 下那 1107 条既有批次（各 out 目录里的 exec-results.json）正拿这套形状做比对
   （queue-reconcile / evidence-integrity / readjudicate-evidence 三个门禁都读这些键）。
   "新旗标顺手改了缺省形状"是本仓为"载具自己改账本"记过账的那类失败，比少接一条通道更贵。
   ── 为什么不是文本代理 ────────────────────────────────────────────────────────────
   本文件不扫注释、不比"关键字个数"：它把 runner 里的 row()/probeStartSource()/interpretProbe()/
   geomText() **现抠出来、喂桩依赖真的执行一遍**，再和冻在文件里的基线（接 #10-c 之前那份的取值）
   逐字段比。桩只有一个：nativeDrain（设备取件），其余全是纯函数依赖。
   基线冻在本文件里而不是去 git 里现取 —— HEAD 会移动（别的车道一提交，"基线"就成了被测物本身，
   那条断言立刻空转）。冻在这里 ⇒ 谁改了形状，这里就红。
   ── 空转防护 ────────────────────────────────────────────────────────────────────
   三具变异体各只改一维（always-on 的 rect、把 toast 从"空串"改成"空数组"、把 __geom 的键名改掉），
   口径仍抠得到 ⇒ 上面那批"形状守恒"断言必须变红；变异体只被文本扫描 + 现抠纯函数执行，
   **从不执行 runner 主体**（不碰设备、不取租约、不派生 IDE），用完即删。
   跑法：PATH=<node22 目录>:$PATH node scripts/qa/test-exec-verbs-shape.cjs
   聚合器认：SUMMARY: assertion failures = N + VERBSHAPE_TEST=PASS|FAIL。 */
"use strict";
const fs = require("node:fs");
const path = require("node:path");

const REPO = path.resolve(__dirname, "..", "..");
const LIVE = process.env.EXEC_UNDER_TEST
  ? path.resolve(REPO, process.env.EXEC_UNDER_TEST)
  : path.join(REPO, "scripts", "qa", "r-exec-cli.mjs");
const DIR = path.join(REPO, ".zcode", "tmp");
const MUT = [
  path.join(DIR, "mutant-verbs-shape-a.mjs"),
  path.join(DIR, "mutant-verbs-shape-b.mjs"),
  path.join(DIR, "mutant-verbs-shape-c.mjs"),
];

let fails = 0, checks = 0;
function t(name, cond, detail) {
  checks++;
  if (!cond) { fails++; console.log("FAIL " + name + (detail === undefined ? "" : " :: " + String(detail).slice(0, 300))); }
  else console.log("ok   " + name + (detail === undefined ? "" : "  (" + String(detail).slice(0, 200) + ")"));
}
/* 与 scripts/qa/test-exec-verb-dispatch.cjs:36-53 同一份抠法（口径不许两半分家）。 */
function extract(src, name) {
  const at = src.indexOf("function " + name + "(");
  if (at < 0) return null;
  const rest = src.slice(at);
  /* 单行函数（authorityTargets 那种）必须整体取第一行：直接找 "\n}" 会跨到**下一个**函数尾巴上，
     于是抠出来的是两段函数的杂交体 ⇒ "抠了函数没抠依赖"那一族的翻版（这里踩过一次，注释留着）。 */
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
function toRe(lit) { try { return lit ? new Function("return " + lit)() : null; } catch (e) { return null; } }

/* ── 基线（接 #10-c 之前的实测量，不是抄来的字符串）────────────────────────────────
   ROW_KEYS：缺省那一腿落盘行的键序（28 → **#10-d 接线后 30**：`evidence` 之后多了
   `network` / `netCapture` 两枚，缺省时取值分别是 "" 与 "off"，见下面 r0 的逐字段比对；
   这次增键是**声明式加法**，不是把谁挤掉——键序其余部分与 28 键基线逐字相同）；
   PAYLOAD_NO_FLAG：折叠探测发给渲染器的那段函数串（878 字符，只问 size、只留 [w,h]）。 */
const ROW_KEYS = ["suite", "manifest", "id", "page", "tier", "identity", "band", "loginVerify", "sessionSource",
  "requiresReal", "title", "status", "observed", "missingEvidence", "failureReason", "route", "toast", "console",
  "evidence", "network", "netCapture", "nativeCapture", "consoleScope", "evidenceGaps", "geometry", "gitSha",
  "gitShaSource", "bootId", "durationMs", "at"];
const PAYLOAD_NO_FLAG = `() => { const app = getApp(); const bag = {}; app.__probeBag = bag; const num = function (v) { return (typeof v === 'number' && isFinite(v)) ? Math.round(v * 100) / 100 : null; }; try { const wi = (wx.getWindowInfo ? wx.getWindowInfo() : (wx.getSystemInfoSync ? wx.getSystemInfoSync() : null)); bag.__win = (wi && typeof wi.windowWidth === 'number') ? wi.windowWidth : null; } catch (e) { bag.__win = null; } const sels = [".a-b"]; sels.forEach(function (s, i) { try { const q = wx.createSelectorQuery(); q.selectAll(s).fields({ size: true }, function (res) { var arr = Array.isArray(res) ? res : (res ? [res] : []); var boxes = []; for (var k = 0; k < arr.length && k < 4; k++) { boxes.push([num(arr[k] && arr[k].width), num(arr[k] && arr[k].height)]); } bag[i] = { c: arr.length, b: boxes }; }); q.exec(); } catch (e) { bag[i] = 'ERR'; } }); return 'started:' + sels.length; }`;
/* 缺省行的取值形状（只有类型/字面量这一层，时间戳与耗时是 volatile）。 */
const VOLATILE = new Set(["at", "durationMs"]);

let src = "";
try { src = fs.readFileSync(LIVE, "utf8"); } catch (e) { console.log("READ_ERR " + e.message); }
if (!src) { console.log("SUMMARY: assertion failures = 1"); console.log("VERBSHAPE_TEST=FAIL（活文件读不到，一条断言都没跑）"); process.exit(1); }
console.log("被测文件=" + path.relative(REPO, LIVE) + " 行数=" + src.split(/\r?\n|\r/).length + " 基线载荷长度=" + PAYLOAD_NO_FLAG.length);

/* row() 的依赖桩：只桩 nativeDrain / netDrain（这两个是设备取件，离线拿不到），其余用真实现
   （形状就是由它们决定的）。网络那半边的 networkGap/STATE **从模块里现抠**，不在本文件重写一份
   —— 重写就等于测我的抄本。桩 netDrain⇒null 正是"没带 --net-count"那一腿，行上必须是
   network:"" / netCapture:"off"，这条由下面的逐字段比对钉住。 */
const NETMOD = path.join(REPO, "scripts", "qa", "exec-network-observe.mjs");
function netDeps() {
  let ms = "";
  try { ms = fs.readFileSync(NETMOD, "utf8"); } catch { return null; }
  const st = /export const STATE = (\{[^}]*\})/.exec(ms);
  const fn = extract(ms, "networkGap");
  if (!st || !fn) return null;
  const STATE = new Function("return " + st[1] + ";")();
  return { STATE, networkGap: new Function("STATE", fn + "\n return networkGap;")(STATE) };
}
function loadRow(source, label, cap) {
  const b = extract(source, "row");
  const helpers = ["consoleLines", "toastSummary", "evidenceGaps", "evidenceKindsNamed", "geomText", "interpretProbe", "pxToRpx", "judgeTargets", "authorityTargets", "classesOf", "probeStartSource", "parseRepeatSpec", "parseScrollSpec", "rapidVerdict", "scrollVerdict"];
  const bodies = {};
  for (const n of helpers) bodies[n] = extract(source, n);
  const FRAME_RE = toRe(grabRe(source, "FRAME_RE"));
  const ND = netDeps();
  const missing = Object.keys(bodies).filter((n) => !bodies[n]).concat(FRAME_RE ? [] : ["FRAME_RE"]).concat(ND ? [] : ["networkGap/STATE"]);
  if (!b || missing.length) { console.log("[" + label + "] 抠不到：" + (!b ? "row" : missing.join(","))); return null; }
  try {
    const mk = new Function("nativeDrain", "netDrain", "NET_INSTALL", "networkGap", "NET_STATE", "IDENTITY", "BAND", "GIT_SHA", "BOOT_ID", "CUR_T0", "LOGIN_VERIFY", "SESSION_SOURCE", "CUR_GEOM", "FRAME_RE",
      helpers.map((n) => bodies[n]).join("\n") + "\n" + b + "\n return row;");
    return (geom, capOn) => mk(() => cap, () => null, null, ND.networkGap, ND.STATE, "A", { mode: "mock", sha8: "deadbeef" }, "SHA1", "B1", 0, "logged-in", "phone-login", geom, FRAME_RE);
  } catch (e) { console.log("[" + label + "] 组装失败：" + e.message); return null; }
}
const CASE = { id: "X1", title: "t", tier: "normal", requiresReal: false, action: "点 .a-b 保存", expected: "", evidence: "截图", automatable: true };
/* loadRow 返回的是"造一行"的工厂：先用 geom 起一行（把 CUR_GEOM 传进去），再拿它跑 row()。 */
function mkRow(build, geom) {
  return build(geom)("M", "pages/a/index", CASE, "EXECUTED", "pages/a/index", "", "observed", "ev.png", ["miss"]);
}
const NO_CAP = null;
const WITH_CAP = { toasts: [{ api: "showToast", title: "设置已保存" }], logs: [{ level: "error", text: "boom" }], hooked: true };

const L = loadRow(src, "live", NO_CAP);
t("执行器里抠得到 row() 与它的全部纯函数依赖（抠不到就是这条测试自己在空转）", !!L, L ? "ok" : "见上面 missing");
if (!L) { console.log("SUMMARY: assertion failures = " + (fails + 1)); console.log("VERBSHAPE_TEST=FAIL（口径取不到）"); process.exit(1); }

/* ── 1. 缺省那一腿：键序 + 取值形状与基线逐字段一致 ── */
const r0 = mkRow(L, "");
t("不带任何旗标时行上就是基线那 28 个键、且**键序一致**（下游按名抠，多一个少一个都是账本变更）",
  Object.keys(r0).join(",") === ROW_KEYS.join(","), Object.keys(r0).join(","));
t("toast/console 缺省仍是**字面空串**（不是 null、更不是空数组：空数组会被 Array.isArray 的读者误读成「采过且没有」）",
  typeof r0.toast === "string" && r0.toast === "" && typeof r0.console === "string" && r0.console === "");
t("nativeCapture/consoleScope 缺省串没漂（off / none 这两个字面量有门禁在读）",
  r0.nativeCapture === "off" && r0.consoleScope === "none", r0.nativeCapture + "/" + r0.consoleScope);
t("geometry 缺省是字符串（空串=这条没量到，不是没这个字段）", typeof r0.geometry === "string", JSON.stringify(r0.geometry));
t("evidenceGaps 缺省是数组且形状可 JSON 化（守恒检查之外的读者按数组抠）",
  Array.isArray(r0.evidenceGaps) && typeof JSON.stringify(r0.evidenceGaps) === "string");

/* 带 --native-capture 那一腿：同一批键，一个都没多、没少（旗标只改取值形状，不改账本结构） */
const L2 = loadRow(src, "live-cap", WITH_CAP);
const r1 = mkRow(L2, "");
t("开了 --native-capture 之后键集与缺省腿**完全相同**（28 个，一个新键都没加）",
  Object.keys(r1).join(",") === Object.keys(r0).join(","), Object.keys(r1).join(","));
t("开了旗标才把 toast/console 变成数组（r1-exec.cjs:1437-1438 同形 ⇒ readjudicate 那句 Array.isArray 第一次真成立）",
  Array.isArray(r1.toast) && r1.toast.length === 1 && Array.isArray(r1.console) && r1.console.length === 1);
t("观察到的取值差异只在 volatile（时间戳/耗时）与旗标那三处 ⇒ 其余字段与缺省腿一字不差",
  (function () {
    const diff = Object.keys(r0).filter((k) => !VOLATILE.has(k) && ["toast", "console", "nativeCapture", "consoleScope", "observed", "evidenceGaps"].indexOf(k) < 0 && JSON.stringify(r0[k]) !== JSON.stringify(r1[k]));
    return diff.length === 0;
  })(), "多出差异的键=" + Object.keys(r0).filter((k) => !VOLATILE.has(k) && ["toast", "console", "nativeCapture", "consoleScope", "observed", "evidenceGaps"].indexOf(k) < 0 && JSON.stringify(r0[k]) !== JSON.stringify(r1[k])).join(","));

/* ── 2. 折叠探测的载荷：不带 --geom-pos 时逐字节就是基线那段 ── */
function payloadOf(source, posOn) {
  const b = extract(source, "probeStartSource");
  if (!b) return null;
  try { return new Function("JSON", b + "\n return probeStartSource;")(JSON)([".a-b"], posOn); } catch (e) { return "THREW " + e.message; }
}
const pOff = payloadOf(src, false), pOn = payloadOf(src, true);
t("probeStartSource(sel, false) 与基线载荷**逐字符相同**（问渲染器要什么、留哪几位，一个字符都不许多）",
  pOff === PAYLOAD_NO_FLAG, pOff === PAYLOAD_NO_FLAG ? "ok" : "长度 " + String(pOff).length + " vs 基线 " + PAYLOAD_NO_FLAG.length);
t("probeStartSource(sel, true) 才多问 rect/scrollOffset（新读数是加法，且只在旗标下加）",
  pOn !== PAYLOAD_NO_FLAG && pOn.includes("size: true, rect: true, scrollOffset: true") && pOn.includes("left"));
t("两种载荷的**计数口径**没变（都还是 bag[i]={c:arr.length,...} ⇒ present(N)/absent 的读法不受影响）",
  /bag\[i\] = \{ c: arr\.length, b: boxes(, s: scr)? \}/.test(pOff) && /bag\[i\] = \{ c: arr\.length, b: boxes(, s: scr)? \}/.test(pOn));

/* ── 3. interpretProbe / geomText：老袋子翻出来的东西一字不变，新键只在有数据时才存在 ── */
function probeBundle(source) {
  const names = ["interpretProbe", "geomText", "geomPosText", "pxToRpx", "judgeTargets", "authorityTargets", "classesOf"];
  const bodies = names.map((n) => extract(source, n));
  if (bodies.some((x) => !x)) { console.log("[bundle] 抠不到：" + names.filter((n, i) => !bodies[i]).join(",")); return null; }
  try { return new Function(bodies.join("\n") + "\n return {" + names.join(",") + "};")(); }
  catch (e) { console.log("bundle 组装失败:" + e.message); return null; }
}
const PB = probeBundle(src);
t("探针翻译层抠得到（interpretProbe/geomText/geomPosText 及其依赖）", !!PB, PB ? "ok" : "见上面 missing");
const BAG_OLD = { 0: { c: 1, b: [[128, 240]] }, __win: 375 };
const BAG_NEW = { 0: { c: 1, b: [[128, 240, 20, 700]], s: [[0, 4800]] }, __win: 375, __hin: 667 };
const d0 = PB && PB.interpretProbe([".a-b"], { 0: { c: 2, b: [[128, 240], [128, 240]] }, __win: 375 });
t("老袋子（2 元 box、无 __hin）翻出的 __geom 就是 {nodes,boxes,win} 三个键（#C-1 的形状，一个键都没多）",
  !!d0 && Object.keys(d0.__geom[".a-b"]).join(",") === "nodes,boxes,win", d0 ? Object.keys(d0.__geom[".a-b"]).join(",") : "null");
t("geomText 对老袋子的输出串没漂（geometry 字段既有批次就是按这串比对的）",
  !!PB && PB.geomText({ action: "点 .a-b" }, PB.interpretProbe([".a-b"], BAG_OLD)) === ".a-b=[128x240px ≈256x480rpx]",
  PB ? PB.geomText({ action: "点 .a-b" }, PB.interpretProbe([".a-b"], BAG_OLD)) : "null");
const d1 = PB && PB.interpretProbe([".a-b"], BAG_NEW);
t("新袋子（4 元 box + s + __hin）才追加 scroll/hin 两个键 ⇒ 计数与尺寸那两位仍然在前两位",
  !!d1 && d1.__geom[".a-b"].boxes[0].length === 4 && d1.__geom[".a-b"].scroll[0][1] === 4800 && d1.__geom[".a-b"].hin === 667,
  d1 ? JSON.stringify(d1.__geom) : "null");
t("新袋子下 geomText 仍然只报尺寸（位置是**追加**的另一段，不是把旧段改写）",
  !!PB && PB.geomText({ action: "点 .a-b" }, d1) === ".a-b=[128x240px ≈256x480rpx]");
t("老袋子上 geomPosText 恒为空串 ⇒ 缺省腿的 geometry 不会因为多了这个函数而变",
  !!PB && PB.geomPosText({ action: "点 .a-b" }, PB.interpretProbe([".a-b"], BAG_OLD)) === "");
t("新袋子上 geomPosText 给出位置/屏外/内部滚动位置三个读数（VI40/CS23/H11 那一族判点的最低要求）",
  !!PB && /^\.a-b=\[@left=20 top=700 右边=148 底边=940\] 视口高=667 屏外=273px\(需滚动才够得着\) scroll=0\/4800$/.test(PB.geomPosText({ action: "点 .a-b" }, d1)),
  PB ? PB.geomPosText({ action: "点 .a-b" }, d1) : "null");
/* 变异体：把 left/top 那两位从 box 里摘掉（只改这一维）⇒ 新袋子再也带不出位置（第 3 节那几条会红 ⇒ 它们不是空转的） */
const mutProbe = src.replace('(posOn ? ", num(arr[k] && arr[k].left), num(arr[k] && arr[k].top)" : "")', '(posOn ? "" : "")');
t("变异体（把 left/top 从 box 里摘掉）之后：缺省载荷仍与基线逐字相同，而**带旗标那一支再也带不出 left** ⇒ 「新袋子才有位置」那条确实拦得住",
  mutProbe !== src && payloadOf(mutProbe, false) === PAYLOAD_NO_FLAG && !payloadOf(mutProbe, true).includes("arr[k].left"));

/* ── 4. 新通道的判点函数不许把「没做到」折叠成「做到了」（这三条是 #10-c 自己的负例）── */
/* 现抠一个纯函数出来（返回**函数本身**，调用方自己带参数）：new Function(...) 已经把外层跑完了，
   所以把实参传给它是错的（第一版就这么错过：拿到的是函数、.ok 恒 undefined ⇒ 假绿）。 */
function pure(source, name, deps) {
  const bodies = [name].concat(deps || []).map((n) => extract(source, n));
  if (bodies.some((x) => !x)) { console.log("[pure] 抠不到 " + name); return null; }
  try { return new Function(bodies.join("\n") + "\n return " + name + ";")(); }
  catch (e) { console.log("pure 组装失败:" + e.message); return null; }
}
t("rapidVerdict：跨度超窗口 ⇒ ok=false（把 5 次点完当成「500ms 内 5 次点完」就是这条车道要防的假绿）",
  pure(src, "rapidVerdict")({ times: 5, windowMs: 500 }, [0, 200, 400, 600, 900]).ok === false &&
  pure(src, "rapidVerdict")({ times: 5, windowMs: 500 }, [0, 100, 200, 300, 400]).ok === true);
t("scrollVerdict：scrollTop 没变 ⇒ ok=false（调用没抛不算滚过）",
  pure(src, "scrollVerdict")({ to: "bottom" }, { __viewport__: { t: 30 } }, { __viewport__: { t: 30 } }).ok === false);
t("scrollVerdict：读数取不到 ⇒ ok=false，不许折叠成 no-move 也不许折叠成 moved",
  pure(src, "scrollVerdict")({ to: "bottom" }, { __err: "read:x" }, { __err: "read:x" }).kind === "no-reader");

/* ── 5. 空转防护：三具变异体各只改一维 ⇒ 上面那批形状断言必须红 ── */
const MUTATIONS = [
  { file: MUT[0], name: "always-rect", make: (s) => s.replace('const fields = posOn ? "{ size: true, rect: true, scrollOffset: true }" : "{ size: true }";', 'const fields = "{ size: true, rect: true, scrollOffset: true }";'), want: (m) => !/posOn \? "\{ size: true, rect/.test(m) },
  { file: MUT[1], name: "toast-always-array", make: (s) => s.replace("const toastVal = capOn ? cap.toasts : \"\";", "const toastVal = capOn ? cap.toasts : [];"), want: (m) => /capOn \? cap\.toasts : \[\]/.test(m) },
  { file: MUT[2], name: "rename-geometry-key", make: (s) => s.replace("\n    geometry,", "\n    geometryRead: geometry,"), want: (m) => /geometryRead: geometry,/.test(m) },
];
MUTATIONS.forEach((mu, idx) => {
  let written = false, m = "";
  try {
    const out = mu.make(src);
    written = out !== src && mu.want(out);
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(mu.file, out);
    m = fs.readFileSync(mu.file, "utf8");
  } catch (e) { console.log("MUTANT_ERR " + mu.name + " " + e.message); }
  t("变异体 " + mu.name + " 落了盘且只改了那一维（没改到就别指望它把断言弄红）", written, written ? "ok" : "变异没生效：这条形状断言可能是空转的");
  if (written) {
    if (idx === 0) {
      const p = payloadOf(m, false);
      t("空转防护 always-rect：把 rect 变成常驻后缺省载荷就与基线不同 ⇒ 第 2 节那条逐字符比对确实拦得住",
        p !== PAYLOAD_NO_FLAG && p.includes("rect"));
    }
    if (idx === 1) {
      const mm = loadRow(m, "mutant-toast", NO_CAP);
      const rr = mm ? mkRow(mm, "") : null;
      t("空转防护 toast-always-array：把缺省空串换成空数组 ⇒ 「toast 是字面空串」那条会红（下游 Array.isArray 的读者不会被骗）",
        !!rr && rr.toast !== "" && Array.isArray(rr.toast));
    }
    if (idx === 2) {
      const mm = loadRow(m, "mutant-key", NO_CAP);
      const rr = mm ? mkRow(mm, "") : null;
      t("空转防护 rename-geometry-key：给行改个键名 ⇒ 28 键键序那条立刻红（账本结构不是想动就动）",
        !!rr && Object.keys(rr).join(",") !== ROW_KEYS.join(","));
    }
  }
  try { if (fs.existsSync(mu.file)) fs.unlinkSync(mu.file); } catch (e) { console.log("MUTANT_CLEANUP_ERR " + mu.file + " " + e.message); }
});
t("收尾：三具变异体都不留盘（活文件全程未被本测试改动）", MUT.every((f) => !fs.existsSync(f)));
t("活文件里那条「缺省空串」的写法仍在（这条与上面变异体互为正反：变异体改掉了它才会红）",
  /const toastVal = capOn \? cap\.toasts : "";/.test(src));

console.log("SUMMARY: assertion failures = " + fails);
console.log(fails ? "VERBSHAPE_TEST=FAIL" : "VERBSHAPE_TEST=PASS");
process.exit(fails ? 1 : 0);
