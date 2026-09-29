#!/usr/bin/node
/* 负例（capability 车道 #2：longpress / pullDown 动线 + 防降级闸）
   ── 这条测试要钉住的病 ──────────────────────────────────────────────────────────────
   r-exec-cli.mjs 只有**一个**元素级下发点（element(…, sel, …) 那一句），动词只在 tap 与 input 里二选一。
   于是判据点名 长按 / rapidTap×5 / 拖动 / 在 showModal 点「取消」 / 断网 时，它照发一次普通 tap，
   然后顺着末尾的 else 记 EXECUTED —— 拿换动词冒充"这条已按判据点名的动作测过"（假绿，不是假红）。
   老执行器有这道闸：scripts/qa/r-exec.cjs:1174 UNIMPLEMENTABLE_ACTION_RE（回归测试
   scripts/qa/test-observe-markers.cjs）；本文件里以前**没有对应物**。
   同时 r1-exec.cjs 早就写好的两条动线一直没接过来：longpress（:1033+:1068）、
   pullDown / stopPullDownRefresh（:1115-1126）。本车道接的是这两条，外加那条闸。
   ── 不许被做成的事（钉死在断言里）───────────────────────────────────────────────
   MSG26 / DND08 / DC08 / VI40 四条不许因为"换个更省事的动词"而变绿。发不出去的动词就必须
   记 NOT_SHOOTABLE（SKIPPED + 原因点名欠的是哪个原语），**不许**退化成一次 tap。
   ── 空转防护 ────────────────────────────────────────────────────────────────────
   把活文件拷到 .zcode/tmp 下、摘掉这六个纯函数并把下发点还原成 `isInput ? "input" : "tap"`，
   同一套断言必须变红；变异体用完即删，活文件全程不改。
   跑法：PATH=<node22 目录>:$PATH node scripts/qa/test-exec-verb-dispatch.cjs
   聚合器认：SUMMARY: assertion failures = N + VERB_TEST=PASS|FAIL。只读判据台，不碰设备。 */
"use strict";
const fs = require("node:fs");
const path = require("node:path");

const REPO = path.resolve(__dirname, "..", "..");
const LIVE = process.env.EXEC_UNDER_TEST
  ? path.resolve(REPO, process.env.EXEC_UNDER_TEST)
  : path.join(REPO, "scripts", "qa", "r-exec-cli.mjs");
const OPS = path.join(REPO, "reports", "audit", "round-6", "ops");
const MUTANT = path.join(REPO, ".zcode", "tmp", "mutant-exec-verb-dispatch.mjs");

let fails = 0, checks = 0;
function t(name, cond, detail) {
  checks++;
  if (!cond) { fails++; console.log("FAIL " + name + (detail === undefined ? "" : " :: " + String(detail).slice(0, 300))); }
  else console.log("ok   " + name + (detail === undefined ? "" : "  (" + String(detail).slice(0, 170) + ")"));
}
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
/* 字面量 → RegExp 对象用 new Function 拿，别拿 lastIndexOf("/") 去切（串里出现 / 就切错，
   而且切出来的 pattern 与 flags 分离后语义可能变 —— 要测的就是活实现那一枚正则本身）。 */
function toRe(lit) { try { return lit ? new Function("return " + lit)() : null; } catch (e) { return null; } }
function grabArr(src, name) {
  const at = src.indexOf("const " + name + " = [");
  if (at < 0) return null;
  const close = src.indexOf("\n];", at);
  if (close < 0) return null;
  return src.slice(at, close + 3);
}
const FNS = ["wantsInputLeg", "inputVerbOnly", "verbsNamed", "verbRefusal", "pickElementVerb", "pullDownSource", "stopRefreshSource", "pullDownVerdict"];
/* 这些常量是被抠出来的函数**引用**的：不一起带上，new Function 里就是自由标识符 ⇒ 一调就 ReferenceError
   （"抠了函数没抠依赖"是这类只读测试自己的假绿，必须当场判废而不是让它抛）。 */
const RES = ["INPUTISH", "VERB_LONGPRESS_RE", "VERB_PULLDOWN_RE", "VERB_RAPID_RE", "VERB_SWIPE_RE", "VERB_MODAL_RE", "VERB_OFFLINE_RE"];
function loadExec(src, label) {
  const f = {}, r = {};
  for (const n of FNS) f[n] = extract(src, n);
  for (const n of RES) r[n] = toRe(grabRe(src, n));
  const rulesSrc = grabArr(src, "VERB_RULES");
  const missing = FNS.filter((n) => !f[n]).concat(RES.filter((n) => !r[n]));
  if (missing.length || !rulesSrc) { console.log("[" + label + "] 抠不到：" + (missing.join(",") + (rulesSrc ? "" : ",VERB_RULES"))); return null; }
  /* VERB_RULES 的数组体里就写着 `re: VERB_LONGPRESS_RE` ⇒ 它和函数体一样要吃同一批常量：
     把 7 枚正则 + VERB_RULES 的**定义**一起当参数喂进去，组装成同一个闭包。 */
  const keys = RES.slice();
  const vals = RES.map((n) => r[n]);
  const prelude = rulesSrc.replace(/^const VERB_RULES = /, "var VERB_RULES = ");
  try {
    return new Function(keys.join(","),
      prelude + "\n" + FNS.map((n) => f[n]).join("\n") + "\n return {" + FNS.join(",") + "};").apply(null, vals);
  } catch (e) { console.log("[" + label + "] 组装失败：" + e.message); return null; }
}

let src = "";
try { src = fs.readFileSync(LIVE, "utf8"); } catch (e) { console.log("READ_ERR " + e.message); }
if (!src) { console.log("SUMMARY: assertion failures = 1"); console.log("VERB_TEST=FAIL（活文件读不到）"); process.exit(1); }
console.log("被测文件=" + path.relative(REPO, LIVE) + " 行数=" + src.split(/\r\n|\n/).length);

const M = loadExec(src, "live");
t("执行器里取到本车道的 8 个纯函数与 7 条动词语料正则 + VERB_RULES（取不到就是没接线）", !!M, M ? "ok" : "见上面 missing");
if (!M) { console.log("SUMMARY: assertion failures = " + (fails + 1)); console.log("VERB_TEST=FAIL（口径取不到，后面的断言一条都没跑）"); process.exit(1); }
const { verbsNamed, verbRefusal, pickElementVerb, pullDownSource, stopRefreshSource, pullDownVerdict } = M;
const VERB_RAPID_RE = toRe(grabRe(src, "VERB_RAPID_RE"));

/* ── 1. 动词清单：点名了什么，发不发得出去 ── */
t("长按：无旗标 ⇒ 发不出去（这是整车道要防的第一种冒充）",
  verbsNamed("长按 .msg-row 呼出菜单", false).some((v) => v.verb === "longpress" && v.emittable === false));
t("长按：带 --gestures ⇒ 发得出去（载具 r1-exec.cjs:1033+:1068，CLI 侧就是换 --action）",
  verbsNamed("长按 .msg-row 呼出菜单", true).some((v) => v.verb === "longpress" && v.emittable === true));
t("下拉刷新：无旗标发不出去、带旗标发得出去（载具 r1-exec.cjs:1115-1120）",
  verbsNamed("下拉刷新看列表是否重置", false).some((v) => v.verb === "pullDown" && !v.emittable) &&
  verbsNamed("下拉刷新看列表是否重置", true).some((v) => v.verb === "pullDown" && v.emittable));
t("rapidTap / 拖动 / 原生Modal / 断网：两种模式下都发不出去（不是旗标问题，是原语缺失）",
  ["rapidTap×5", "向右拖动超过阈值", "在 showModal 点取消", "断网执行确定"].every((s, i) =>
    verbsNamed(s, false).length === 1 && verbsNamed(s, true).length === 1 && verbsNamed(s, false)[0].emittable === false));
t("动词名与审计的 gap 编号对得上（rapidTap=G-6 longpress=G-7 swipe=G-8 pullDown=G-9 modal=G-11/12 offline=G-3）",
  verbsNamed("rapidTap×5", true)[0].verb === "rapidTap" && verbsNamed("长按", true)[0].verb === "longpress" &&
  verbsNamed("向右拖动", true)[0].verb === "swipe" && verbsNamed("在 showModal 点取消", true)[0].verb === "nativeModal" &&
  verbsNamed("断网执行确定", true)[0].verb === "networkFault");
t("普通点击判据一个动词都不点名 ⇒ 不许被扣（防降级闸不许把可发的交互全挡了）",
  verbsNamed("点 .save-btn 保存", true).length === 0 && verbRefusal("点 .save-btn 保存", true) === "");

/* ── 2. 拒发原因串：必须是机读的、点名欠哪个原语的、且不许冒充成产品失败 ── */
const refDnd = verbRefusal("500ms 内对 .save-btn rapidTap×5，逐次记录：客户端 PUT /dnd 请求条数、Toast 条数", true);
t("DND08 的串以 NOT_SHOOTABLE(verb=rapidTap) 开头（本仓既有拼写：artifact-band.mjs:70 / shoot-frameplan.mjs:227）",
  /^NOT_SHOOTABLE\(verb=rapidTap\)/.test(refDnd), refDnd.slice(0, 90));
t("原因串点名「为什么这条腿做不到」而不只是「做不到」：要说清每次 element() 都是进程派生",
  /execFileSync|进程派生/.test(refDnd));
t("原因串末句给出补救路径（换载具/补原语/人工判），且明写不许记成产品 FAILED",
  /不许记成产品 FAILED/.test(refDnd) && /--gestures|换载具|人工判/.test(refDnd));
t("一次点名多个发不出的动词 ⇒ 全列出来，不许只报一个（MSG26：长按+连点+showModal+断网）",
  (function () { const r = verbRefusal("① 长按→在 showModal 点「取消」；③ 500ms 内连点删除入口 5 次；④ 断网执行确定", false); return ["longpress", "rapidTap", "nativeModal", "networkFault"].every((v) => r.includes("verb=" + v) || r.includes(v + " ::")); })());
t("拒发函数是纯函数：动词表只读 c.action，旗标由参数传入 ⇒ 离线能把两种模式都跑出来（不读 argv）",
  !/process\.argv|GESTURE_MODE|STRICT_VERBS/.test(extract(src, "verbRefusal") + extract(src, "verbsNamed")));

/* ── 3. 下发点：旗标下才换动词，不带旗标时逐字保持旧形状 ── */
t("pickElementVerb：长按只在旗标下顶掉 tap；不带旗标时永远 tap/input（旧腿的动词面一字不变）",
  pickElementVerb("长按 .msg-row", ".msg-row", true) === "longpress" &&
  pickElementVerb("长按 .msg-row", ".msg-row", false) === "tap" &&
  pickElementVerb("点 .save-btn", ".save-btn", true) === "tap");
t("输入腿口径没被动过（动词+输入框才走 input，#70④ 那三条老断言仍成立）",
  pickElementVerb("输入手机号", ".phone-input", true) === "input" &&
  pickElementVerb("输入验证码后点", ".hero__back", true) === "tap" &&
  pickElementVerb("查看列表", ".search-input", true) === "tap");
const dispatchLines = src.split(/\r?\n/).filter((l) => /^\s*element\(/.test(l));
t("下发点已经改成走 pickElementVerb（**代码行**里只剩这一句 element()，且它吃的是 verb；注释里提到旧写法不算）",
  dispatchLines.length === 1 && /element\(verb, sel, \{ project: PROJECT \}/.test(dispatchLines[0]),
  dispatchLines.length + " 行 element() ⇒ " + dispatchLines.map((l) => l.trim().slice(0, 70)).join(" ┊ "));
t("非输入腿的载荷仍是 --wait 1（longpress 与 tap 同一工具同一载荷 ⇒ 没有偷偷改时序）",
  /isInput \? \["--value", "123456"\] : \["--wait", "1"\]/.test(src));
t("done/unmet 记的是**实际动词**（tap: / longpress: 分得开，把长按冒充成点击就没法复盘了）",
  /done\.push\(verb \+ ":"/.test(src) && /unmet\.push\(verb \+ ":"/.test(src));
t("pullDown 载荷问的是 uni.startPullDownRefresh，收尾问的是 uni.stopPullDownRefresh（照 r1-exec.cjs:1115-1126）",
  pullDownSource().includes("uni.startPullDownRefresh") && stopRefreshSource().includes("uni.stopPullDownRefresh"));
t("pullDown 不许静默成功：页面上没挂 uni 时返回 no-uni，没有页时返回 no-page，抛错返回 ERR",
  /return 'no-uni'/.test(pullDownSource()) && /return 'no-page'/.test(pullDownSource()) && /ERR/.test(pullDownSource()));
t("pullDownVerdict 把四种答案分开翻译（把 no-uni 读成「已下拉」就是凭空造绿）",
  [pullDownVerdict("uni-ok"), pullDownVerdict("no-uni"), pullDownVerdict("ERR x"), pullDownVerdict("")].map((v) => String(v).split("(")[0]).join("/") === "ok/unsupported/error/unknown");
t("pullDown 的成功计数不混进 tapsDone（tapsDone 只数元素级下发，点击数不许虚报）",
  /stats\.tapsDone \+= done\.filter\(\(d\) => d\.includes\(":"\)\]\.length|stats\.tapsDone \+= done\.filter\(\(d\) => d\.includes\(":"\)\)\.length/.test(src) &&
  /stats\.pullDowns = \(stats\.pullDowns \|\| 0\) \+ 1/.test(src));
t("pullDown 之后一定跟一次 stopRefresh 收尾（刷新态吊在页上会把同组后面的帧/探针污染成非静息态）",
  (function () { const i = src.indexOf("let pullNote"); return /stopRefreshSource\(\)/.test(src.slice(i, i + 1400)); })());

/* ── 4. 接线判点：拒发也必须把它该填的字段填上（本仓反复吃过的那条教训）── */
t("拒发分支走的是 row()（出一行 SKIPPED，不是把这条判据变没 ⇒ 守恒等式「行数=判据数」继续成立）",
  /stats\.verbRefused\+\+/.test(src) && /rows\.push\(row\(name, page, c, "SKIPPED", route, refuse/.test(src));
t("拒发的行也带 observed（observed0 照跑）⇒ 下游读 observed/geometry 的人不会拿到空行",
  (function () { const i = src.indexOf("stats.verbRefused++"); return /observed0\(c, route, routeOk, dom, " \| 动词拒发\[strict-verbs\]"\)/.test(src.slice(i, i + 700)); })());
t("verbRefused 进了 skippedTotal()（两个 skipped 口径打架这件事本仓记过账）",
  (function () { const i = src.indexOf("const skippedTotal"); return /stats\.verbRefused/.test(src.slice(i, i + 500)); })());
t("verbRefused 与 pullDowns/longpresses 都在 stats 初值里（不是只在外层赋值时才存在的野字段）",
  /verbRefused: 0/.test(src) && /pullDowns: 0/.test(src) && /longpresses: 0/.test(src));
t("闸只在 STRICT_VERBS 下生效（非破坏性：不带旗标时旧腿的判决一字不变）",
  /if \(STRICT_VERBS\) \{/.test(src) && /STRICT_VERBS = GESTURE_MODE \|\| process\.argv\.includes\("--strict-verbs"\)/.test(src));
t("--gestures 隐含 --strict-verbs（capability 与「不许换动词」必须同批到货）",
  /const STRICT_VERBS = GESTURE_MODE \|\|/.test(src));
t("不带旗标时把「会被顶掉的那一类」喊出来（旧口径的假绿不许沉默）",
  /RUNNER_VERBS/.test(src) && /那一类 EXECUTED 不许读成「点名动词已测」|不许读成「点名动词已测」/.test(src));

/* ── 5. 真实判据台：四条不许降级的 id + 全表实测数（扫描集非空，不许合成样本自证）── */
const names = fs.readdirSync(OPS).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")).sort();
const all = [];
for (const n of names) {
  let mf; try { mf = JSON.parse(fs.readFileSync(path.join(OPS, n + ".json"), "utf8")); } catch (e) { continue; }
  for (const c of (mf.cases || [])) all.push({ m: n, c });
}
t("判据台扫到了（1107 量级）", all.length >= 1000, "cases=" + all.length);
const byId = (id) => all.find((x) => x.c.id === id);
const TAP_RE = toRe(grabRe(src, "TAP_RE"));
const TAP_CAMEL_RE = toRe(grabRe(src, "TAP_CAMEL_RE"));
t("两条交互动词正则都抠得到（wantsInteraction 的口径必须来自活文件，不许在测试里另抄一份）",
  !!TAP_RE && !!TAP_CAMEL_RE, "TAP_RE=" + !!TAP_RE + " TAP_CAMEL_RE=" + !!TAP_CAMEL_RE);
const wantsInteraction = (x) => TAP_RE.test(String(x || "")) || TAP_CAMEL_RE.test(String(x || ""));

for (const [id, mustVerb] of [["MSG26", "nativeModal"], ["DND08", "rapidTap"], ["DC08", "swipe"]]) {
  const x = byId(id);
  const act = x ? String(x.c.action || "") : "";
  t(id + " 在判据台里、wantsInteraction=true（会走到下发点），且点名 " + mustVerb + " ⇒ 闸必须扣住它，一次 tap 都不许发",
    !!x && wantsInteraction(act) && /^NOT_SHOOTABLE/.test(verbRefusal(act, true)) &&
    verbsNamed(act, true).some((v) => v.verb === mustVerb && !v.emittable),
    x ? act.slice(0, 60) : "null");
}
const vi40 = byId("VI40");
t("VI40 的特例：判据压根没有点击动词（要的是 boundingClientRect 表）⇒ wantsInteraction=false，永远走不到下发点，" +
  "所以它不会被降级成 tap；它欠的是几何读数与 nth/组件作用域，不是动词",
  !!vi40 && wantsInteraction(vi40.c.action) === false && verbRefusal(vi40.c.action, true) === "",
  vi40 ? String(vi40.c.action).slice(0, 70) : "null");

/* 全表实测：闸在两种模式各扣多少、新动线放行多少（数字打出来给人核，不硬编码进断言） */
const T = (c) => String(c.action || "");
const inter = all.filter((x) => wantsInteraction(T(x.c)) && x.c.automatable !== false);
const refuseDefault = inter.filter((x) => verbRefusal(T(x.c), false) !== "");
const refuseGesture = inter.filter((x) => verbRefusal(T(x.c), true) !== "");
console.log("实测：wantsInteraction 且未被盖章 = " + inter.length +
  " ｜ 无旗标时拒发 = " + refuseDefault.length + " ｜ --gestures 时拒发 = " + refuseGesture.length +
  " ｜ 因旗标新放行 = " + (refuseDefault.length - refuseGesture.length));
console.log("拒发 id 样本（gestures 开）：" + refuseGesture.slice(0, 25).map((x) => x.c.id).join(","));
t("闸扣住的是成片判据而不是三条特例（>50 条）", refuseGesture.length > 50, refuseGesture.length + " 条");
t("--gestures 让 longpress/pullDown 那一族变成可发（新放行 >0 且确实少于全拒数）",
  refuseDefault.length - refuseGesture.length > 0 && refuseGesture.length < refuseDefault.length);
t("新放行的每一条都确实只点名发得出的动词（不许有 rapidTap 混在放行堆里）",
  inter.filter((x) => verbRefusal(T(x.c), false) !== "" && verbRefusal(T(x.c), true) === "")
    .every((x) => verbsNamed(T(x.c), true).every((v) => v.emittable)));
t("闸不许把「只点名普通点击」的判据也扣了（否则 624 条可发交互会被整类挡死，那是另一种假账）",
  inter.filter((x) => !VERB_RAPID_RE.test(T(x.c))).filter((x) => verbRefusal(T(x.c), true) !== "").length < inter.length * 0.4);
/* 下面两条是**结构**判点：拒发分支与 pullDown 动线都在批次循环体内，没有设备就一次都跑不到 ⇒
   离线能证的只有"它在代码里的先后次序"（次序错了就是"先发了 tap 再拒"或"发了 pullDown 却没记账"）。
   真发没发出去，仍是设备上的 UNKNOWN，别把这两条读成行为已证。 */
t("结构次序：拒发判断在 authorityTargets/element() 之前（先扣再解析目标 ⇒ 不可能已经下发过什么）",
  (function () { const iS = src.indexOf("if (STRICT_VERBS) {"); const iA = src.indexOf("const auth = authorityTargets(c);"); const iE = src.indexOf("element(verb, sel"); return iS > 0 && iS < iA && iA < iE; })(),
  "strict=" + src.indexOf("if (STRICT_VERBS) {") + " auth=" + src.indexOf("const auth = authorityTargets(c);") + " element=" + src.indexOf("element(verb, sel"));
t("结构次序：pullDown 在元素循环之后、sleep(SETTLE) 之前记账，且 pullNote 进了 tapNote（发了不记账等于没发）",
  (function () { const iLoopEnd = src.indexOf("sleep(700);"); const iP = src.indexOf("let pullNote"); const iSettle = src.indexOf("sleep(SETTLE);", iP); const iNote = src.indexOf("tapNote = (inputRefused.length"); return iLoopEnd < iP && iP < iSettle && iSettle < iNote && src.slice(iNote, iNote + 700).includes("+ pullNote"); })());
t("结构次序：拒发的行出口在 TAP_MODE 分支内（observe-only 腿不发交互，本闸本就不该改变它的判决）",
  (function () { const iT = src.indexOf("if (TAP_MODE && !bandSkip(c)"); const iS = src.indexOf("if (STRICT_VERBS) {"); const iEnd = src.indexOf("const observed = observed0(c, caseRoute"); return iT > 0 && iT < iS && iS < iEnd; })());
t("已盖章 automatable:false 的行不进这道闸（:notAutomatableSkip 在更前面就出了行，两个原因不许叠成一条）",
  byId("MSG26").c.automatable === false && all.filter((x) => x.c.automatable === false).length > 90);

/* ── 6. 空转防护：把特征摘掉 ⇒ 同一套断言必须变红 ──
   变异体只做三件事（等价于"这条车道还没落地时的活文件"）：
     ① 六个纯函数改名（抠不到口径 ⇒ 所有动词断言一条都跑不了）；
     ② 下发点还原成 `element(isInput ? "input" : "tap", …)`（动词冒充回来了）；
     ③ 把闸的开关条件还原成永真不成立（`if (STRICT_VERBS)` ⇒ `if (false)`）。
   变异体只是被**文本扫描**，从不执行 ⇒ 里面残留的悬挂引用无所谓；活文件全程不改，用完即删。 */
let mutantWritten = false;
let msrc = "";
try {
  const mut = src
    .replace(/function verbsNamed\(/, "function _摘除_verbsNamed(")
    .replace(/function verbRefusal\(/, "function _摘除_verbRefusal(")
    .replace(/function pickElementVerb\(/, "function _摘除_pickElementVerb(")
    .replace(/function pullDownSource\(/, "function _摘除_pullDownSource(")
    .replace(/function stopRefreshSource\(/, "function _摘除_stopRefreshSource(")
    .replace(/function pullDownVerdict\(/, "function _摘除_pullDownVerdict(")
    .replace(/element\(verb, sel, \{ project: PROJECT \}/, 'element(isInput ? "input" : "tap", sel, { project: PROJECT }')
    .replace(/if \(STRICT_VERBS\) \{/, "if (false) {");
  mutantWritten = mut !== src && mut.indexOf('element(isInput ? "input" : "tap"') >= 0 && mut.indexOf("if (false) {") >= 0;
  fs.mkdirSync(path.dirname(MUTANT), { recursive: true });
  fs.writeFileSync(MUTANT, mut);
  msrc = fs.readFileSync(MUTANT, "utf8");
} catch (e) { console.log("MUTANT_ERR " + e.message); }
t("变异确实落了盘（函数改名 + 下发点还原 + 闸关掉，三处都在）",
  mutantWritten && /_摘除_verbRefusal/.test(msrc) && /element\(isInput \? "input" : "tap"/.test(msrc) && /if \(false\) \{/.test(msrc));
t("空转防护：变异体里抠不到这套动词口径 ⇒ 上面那批拒发/放行断言确实会红（不是空转的绿）",
    msrc !== "" && !loadExec(msrc, "mutant"));
t("空转防护：变异体的下发点又回到「只有 tap/input 两个动词」，闸也永不生效 ⇒ 第 3、4 节那两条接线断言会红",
  /element\(isInput \? "input" : "tap"/.test(msrc) && !/if \(STRICT_VERBS\) \{/.test(msrc));
try { if (fs.existsSync(MUTANT)) fs.unlinkSync(MUTANT); } catch (e) { console.log("MUTANT_CLEANUP_ERR " + e.message); }
t("收尾：变异体不留盘（活文件全程未被改动）", !fs.existsSync(MUTANT));

console.log("SUMMARY: assertion failures = " + fails);
console.log(fails ? "VERB_TEST=FAIL" : "VERB_TEST=PASS");
process.exit(fails ? 1 : 0);
