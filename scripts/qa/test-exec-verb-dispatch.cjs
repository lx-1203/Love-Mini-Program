#!/usr/bin/node
/* 负例（capability 车道 #2：longpress / pullDown 动线 + 防降级闸）
   ── 这条测试要钉住的病 ──────────────────────────────────────────────────────────────
   r-exec-cli.mjs 只有**一个**元素级下发点（element(…, sel, …) 那一句），动词只在 tap 与 input 里二选一。
   于是判据点名 长按 / rapidTap×5 / 拖动 / 在 showModal 点「取消」 / 断网 时，它照发一次普通 tap，
   然后顺着末尾的 else 记 EXECUTED —— 拿换动词冒充「这条已按判据点名的动作测过」（假绿，不是假红）。
   老执行器有这道闸：scripts/qa/r-exec.cjs:1174 UNIMPLEMENTABLE_ACTION_RE（回归测试
   scripts/qa/test-observe-markers.cjs）；本文件里以前**没有对应物**。
   同时 r1-exec.cjs 早就写好的两条动线一直没接过来：longpress（:1033+:1068）、
   pullDown / stopPullDownRefresh（:1115-1126）。本车道接的是这两条，外加那条闸。
   ── 不许被做成的事（钉死在断言里）───────────────────────────────────────────────
   MSG26 / DND08 / DC08 / VI40 四条不许因为「换个更省事的动词」而变绿。发不出去的动词就必须
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
const FNS = ["wantsInputLeg", "inputVerbOnly", "verbsNamed", "verbRefusal", "pickElementVerb", "pullDownSource", "stopRefreshSource", "pullDownVerdict",
  /* #10-c 动线车道的口径：caps 那一维全靠这四个纯函数，抠不到就是「闸还在但通道是空的" ⇒ 当场判废。
     组装进同一个闭包时它们必须一起带上，否则 verbsNamed 里就是自由标识符（ReferenceError = 假绿）。 */
  "specSatisfies", "parseRepeatSpec", "parseScrollSpec", "rapidVerdict", "rapidDeltas", "scrollVerdict", "pageScrollSource", "scrollOffsetStartSource", "interpretScrollOffsets", "pageScrollCallVerdict"];
/* 这些常量是被抠出来的函数**引用**的：不一起带上，new Function 里就是自由标识符 ⇒ 一调就 ReferenceError
   （「抠了函数没抠依赖」是这类只读测试自己的假绿，必须当场判废而不是让它抛）。 */
const RES = ["INPUTISH", "VERB_LONGPRESS_RE", "VERB_PULLDOWN_RE", "VERB_RAPID_RE", "VERB_SWIPE_RE", "VERB_MODAL_RE", "VERB_OFFLINE_RE", "VERB_SCROLL_RE"];
function loadExec(src, label) {
  const f = {}, r = {};
  for (const n of FNS) f[n] = extract(src, n);
  for (const n of RES) r[n] = toRe(grabRe(src, n));
  const rulesSrc = grabArr(src, "VERB_RULES");
  const missing = FNS.filter((n) => !f[n]).concat(RES.filter((n) => !r[n]));
  if (missing.length || !rulesSrc) { console.log("[" + label + "] 抠不到：" + (missing.join(",") + (rulesSrc ? "" : ",VERB_RULES"))); return null; }
  /* VERB_RULES 的数组体里就写着 `re: VERB_LONGPRESS_RE` ⇒ 它和函数体一样要吃同一批常量：
     把 8 枚正则 + VERB_RULES 的**定义**一起当参数喂进去，组装成同一个闭包。 */
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
t("执行器里取到本车道的 18 个纯函数与 8 条动词语料正则 + VERB_RULES（取不到就是没接线）", !!M, M ? "ok" : "见上面 missing");
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
t("rapidTap / 拖动 / 原生Modal / 断网：**不带对应 caps 时**四条都发不出去（#10-c 之后 rapidTap 的欠账从「原语缺失」变成「旗标没开」，这一条钉的仍是缺省路径）",
  ["rapidTap×5", "向右拖动超过阈值", "在 showModal 点取消", "断网执行确定"].every((s, i) =>
    verbsNamed(s, false).length === 1 && verbsNamed(s, true).length === 1 && verbsNamed(s, false)[0].emittable === false));

/* ── 1.5 #10-c 的三条通道：旗标 ⇒ 发得出；判据要求做不到 ⇒ 仍拒发（两个方向都得能红）── */
const { specSatisfies, parseRepeatSpec, parseScrollSpec, rapidVerdict, rapidDeltas, scrollVerdict, pageScrollSource, scrollOffsetStartSource, interpretScrollOffsets, pageScrollCallVerdict } = M;
const RAPID_DND08 = "500ms 内对 .save-btn rapidTap×5，逐次记录：客户端 PUT /dnd 请求条数、Toast 条数";
t("rapidTap：{rapid:true} 且次数抠得出来 ⇒ 发得出（这正是 DND08/TP04/SCU06/SCU10/SCH10/TK05/RP06/INT07/FB07 那一族欠的东西）",
  verbsNamed(RAPID_DND08, true, { rapid: true }).every((v) => v.emittable) && verbRefusal(RAPID_DND08, true, { rapid: true }) === "");
t("rapidTap：旗标开了但判据没点明次数 ⇒ **仍**拒发（specSatisfies 是「旗标≠做得到」那一维，摘掉它这条就假绿）",
  verbsNamed("重复点击提交按钮若干次", true, { rapid: true }).every((v) => !v.emittable) &&
  specSatisfies("repeat", "重复点击提交按钮若干次") === false && specSatisfies("repeat", RAPID_DND08) === true);
t("parseRepeatSpec 认 ×5 / 连点 3 次 / 500ms 窗口，抠不出的时候给 null 而不是默认值",
  parseRepeatSpec("对 .a rapidTap×5").times === 5 && parseRepeatSpec("500ms 内连点 .a 3 次").windowMs === 500 &&
  parseRepeatSpec("双击 .a").times === 2 && parseRepeatSpec("重复点若干次").times === null,
  JSON.stringify(parseRepeatSpec(RAPID_DND08)));
t("rapidVerdict 四态互不折叠（ok / short / window-miss / no-spec），且 window-miss 一定 ok=false",
  [rapidVerdict({ times: 5, windowMs: 500 }, [0, 100, 200, 300, 400]).kind, rapidVerdict({ times: 5, windowMs: 500 }, [0, 100]).kind,
    rapidVerdict({ times: 5, windowMs: 500 }, [0, 200, 400, 600, 800]).kind, rapidVerdict({ times: null, windowMs: null }, []).kind].join("/") === "ok/short/window-miss/no-spec" &&
  rapidVerdict({ times: 5, windowMs: 500 }, [0, 200, 400, 600, 800]).ok === false);
t("rapidVerdict 的 window-miss 串里同时有实测跨度与判据点名的窗口，且明写不记 EXECUTED（只说「做不到」就等于没解释）",
  /800ms/.test(rapidVerdict({ times: 5, windowMs: 500 }, [0, 200, 400, 600, 800]).text) && /绝不记 EXECUTED/.test(rapidVerdict({ times: 5, windowMs: 500 }, [0, 200, 400, 600, 800]).text));
t("rapidDeltas 逐次间隔串可算（DND08 判据的「逐次记录」要有时间基线），少于两条时给空串不猜",
  rapidDeltas([10, 35, 60]) === "25,25" && rapidDeltas([10]) === "" && rapidDeltas(undefined) === "");
t("scroll：{scroll:true} 且点名方向 ⇒ 发得出；没方向 ⇒ 仍拒发（不猜一个方向去滚）",
  verbRefusal("在面板内容区滚动到底，观察 .a-b 可见性", true, { scroll: true }) === "" &&
  /^NOT_SHOOTABLE\(verb=scroll\)/.test(verbRefusal("列表滚动位置保持不丢", true, { scroll: true })));
t("scroll：--gestures 与 --rapid 都**不能**替掉 scroll 那条旗标（一条通道只解锁它自己那点能力）",
  /^NOT_SHOOTABLE\(verb=scroll\)/.test(verbRefusal("滚动到底看 footer 是否吸底", true, { rapid: true })) &&
  /^NOT_SHOOTABLE\(verb=scroll\)/.test(verbRefusal("滚动到底看 footer 是否吸底", false, { rapid: true, geomPos: true })));
t("parseScrollSpec 认到底/回顶/显式 px，并认得出 scroll-view 作用域（页级与内部是两条动线）",
  parseScrollSpec("滚动到底").to === "bottom" && parseScrollSpec("回到顶部").to === "top" &&
  parseScrollSpec("wx.pageScrollTo(600)").y === 600 && parseScrollSpec(".post-scroll 里滚动到底").sel === ".post-scroll" &&
  parseScrollSpec("看列表") === null);
t("页级滚动载荷 = wx.pageScrollTo（载具 shoot-frameplan.mjs:385 同一条 evaluate）且 wx-ok/uni-ok/no-api/ERR 四态都在串里",
  pageScrollSource(0).includes("wx.pageScrollTo") && /'wx-ok:' \+ v/.test(pageScrollSource(0)) &&
  pageScrollSource(0).includes("uni.pageScrollTo") && pageScrollSource(0).includes("'no-api'") && /var v = 0;/.test(pageScrollSource(0)) && /var v = 99999;/.test(pageScrollSource(99999)));
t("pageScrollCallVerdict 把 sent/unsupported/error/unknown 分开（调用「没抛」绝不等于「滚过了」）",
  pageScrollCallVerdict("wx-ok:0") === "sent" && /unsupported/.test(pageScrollCallVerdict("no-api")) && pageScrollCallVerdict("ERR x") === "error" && pageScrollCallVerdict("") === "unknown");
t("scrollOffset 读件用独立袋子 __qaScroll（顶掉 __probeBag 会把同组折叠探针的读数洗掉），且 no-node 与 not-scrollable 分开",
  scrollOffsetStartSource(["__viewport__"]).includes("app.__qaScroll") && !scrollOffsetStartSource(["__viewport__"]).includes("__probeBag") &&
  scrollOffsetStartSource([".x"]).includes("not-scrollable") && scrollOffsetStartSource([".x"]).includes("no-node"));
t("interpretScrollOffsets 对 IDE 前缀噪声照解析、对非 JSON 报 __err、对 ERR 串报 __err ⇒ 读数取不到不写成「没滚」",
  interpretScrollOffsets('NOISE {"__viewport__":{"t":7}}').__viewport__.t === 7 && !!interpretScrollOffsets("nope").__err && !!interpretScrollOffsets("ERR x").__err);
t("scrollVerdict 四态互不折叠：moved / no-move / no-reader / no-node，且只有 moved 才 ok=true",
  [scrollVerdict({ to: "bottom" }, { __viewport__: { t: 0 } }, { __viewport__: { t: 9 } }).kind, scrollVerdict({ to: "bottom" }, { __viewport__: { t: 9 } }, { __viewport__: { t: 9 } }).kind, scrollVerdict({ to: "bottom" }, { __err: "e" }, { __err: "e" }).kind, scrollVerdict({ sel: ".a" }, { ".a": { t: null, note: "no-node" } }, { ".a": { t: null, note: "no-node" } }).kind].join("/") === "moved/no-move/no-reader/no-node" &&
  scrollVerdict({ to: "bottom" }, { __viewport__: { t: 9 } }, { __viewport__: { t: 9 } }).ok === false);
t("swipe / nativeModal / networkFault 在**全 caps 打开**时仍发不出去（新通道不许顺手把没证过的原语放出去）",
  ["在卡片上向右拖动超过阈值", "在 showModal 点取消", "断网执行确定"].every((s) =>
    /^NOT_SHOOTABLE\(verb=(swipe|nativeModal|networkFault)\)/.test(verbRefusal(s, true, { rapid: true, scroll: true, geomPos: true }))));
t("swipe 的拒发理由点名「桥自述列了 touch*、但 argv 载荷未证」这一具体缺口（含糊一句「做不到」就是没解释）",
  /cli-automator\.mjs:11-13/.test(verbRefusal("向右拖动超过阈值", true, { rapid: true, scroll: true })) &&
  /print-argv/.test(verbRefusal("向右拖动超过阈值", true, { rapid: true, scroll: true })));
t("caps 那一维是纯函数参数：新加的四个函数体里都不许读 argv / GESTURE_MODE / *_MODE（读了离线就驱动不了）",
  ["verbsNamed", "verbRefusal", "specSatisfies", "parseRepeatSpec", "parseScrollSpec", "rapidVerdict", "scrollVerdict"]
    .every((n) => !/process\.argv|GESTURE_MODE|STRICT_VERBS|RAPID_MODE|SCROLL_MODE|GEOM_POS/.test(extract(src, n) || "X")));
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
  /if \(STRICT_VERBS\) \{/.test(src) &&
  /STRICT_VERBS = GESTURE_MODE \|\| RAPID_MODE \|\| SCROLL_MODE \|\| process\.argv\.includes\("--strict-verbs"\)/.test(src));
t("--gestures / --rapid / --scroll 三条都隐含 --strict-verbs（capability 与「不许换动词」必须同批到货；#10-c 把这条纪律从 gestures 扩到新增的两条通道）",
  (function () {
    const m = /const STRICT_VERBS = ([^\n]*);/.exec(src);
    if (!m) return false;
    const chain = m[1];
    return ["GESTURE_MODE", "RAPID_MODE", "SCROLL_MODE"].every((f) => chain.includes(f))
      && /process\.argv\.includes\("--strict-verbs"\)/.test(chain)
      /* 反向也要钉住：GEOM_POS 不改任何判决 ⇒ 它**不许**进这条链（进了就是拿读数旗标去扣交互行） */
      && !chain.includes("GEOM_POS");
  })());
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
/* #10-c 的第三、四档：caps 打开以后各放行多少（这条 print 是"接了通道到底服务多少人"的账） */
const CAPS_ALL = { rapid: true, scroll: true, geomPos: true };
const refuseAll = inter.filter((x) => verbRefusal(T(x.c), true, CAPS_ALL) !== "");
const releasedByCaps = inter.filter((x) => verbRefusal(T(x.c), true) !== "" && verbRefusal(T(x.c), true, CAPS_ALL) === "");
console.log("实测：wantsInteraction 且未被盖章 = " + inter.length +
  " ｜ 无旗标时拒发 = " + refuseDefault.length + " ｜ --gestures 时拒发 = " + refuseGesture.length +
  " ｜ 因旗标新放行 = " + (refuseDefault.length - refuseGesture.length) +
  " ｜ 再加 --rapid/--scroll 后仍拒发 = " + refuseAll.length + "（这一档又被放行 " + releasedByCaps.length + " 条）");
console.log("拒发 id 样本（gestures 开）：" + refuseGesture.slice(0, 25).map((x) => x.c.id).join(","));
console.log("#10-c 放行 id 样本：" + releasedByCaps.slice(0, 25).map((x) => x.c.id).join(","));
t("闸扣住的是成片判据而不是三条特例（>50 条）", refuseGesture.length > 50, refuseGesture.length + " 条");
t("--gestures 让 longpress/pullDown 那一族变成可发（新放行 >0 且确实少于全拒数）",
  refuseDefault.length - refuseGesture.length > 0 && refuseGesture.length < refuseDefault.length);
t("#10-c --rapid/--scroll 也放行成片判据（>20 条），且总拒发数随之下降（新通道服务的不是三条特例）",
  releasedByCaps.length > 20 && refuseAll.length < refuseGesture.length,
  "放行 " + releasedByCaps.length + " 条 ⇒ 仍拒发 " + refuseAll.length + " 条");
t("#10-c 被 caps 放行的每一条，其**扣住它的动词**都只可能是 rapidTap/scroll（混进 swipe/nativeModal/networkFault 就是顺手放行了没证过的原语）",
  releasedByCaps.every((x) => verbsNamed(T(x.c), true).filter((v) => !v.emittable).every((v) => v.verb === "rapidTap" || v.verb === "scroll")) &&
  releasedByCaps.every((x) => verbsNamed(T(x.c), true, CAPS_ALL).every((v) => v.emittable)),
  releasedByCaps.filter((x) => !verbsNamed(T(x.c), true).filter((v) => !v.emittable).every((v) => v.verb === "rapidTap" || v.verb === "scroll")).slice(0, 6).map((x) => x.c.id).join(","));
t("#10-c 全旗标下仍有成片拒发（swipe/原生Modal/断网/次数或方向没点名 ⇒ 新增通道没把闸变成橡皮章）",
  refuseAll.length > 50, refuseAll.length + " 条，样本 " + refuseAll.slice(0, 10).map((x) => x.c.id).join(","));
t("#10-c 缺省那一档的拒发集合与「旗标全关」逐条一致（新参数不改变不带旗标时的判决）",
  all.filter((x) => wantsInteraction(T(x.c))).every((x) =>
    verbRefusal(T(x.c), false) === verbRefusal(T(x.c), false, {}) && verbRefusal(T(x.c), false) === verbRefusal(T(x.c), false, undefined)));
t("新放行的每一条都确实只点名发得出的动词（不许有 rapidTap 混在放行堆里）",
  inter.filter((x) => verbRefusal(T(x.c), false) !== "" && verbRefusal(T(x.c), true) === "")
    .every((x) => verbsNamed(T(x.c), true).every((v) => v.emittable)));
t("闸不许把「只点名普通点击」的判据也扣了（否则 624 条可发交互会被整类挡死，那是另一种假账）",
  inter.filter((x) => !VERB_RAPID_RE.test(T(x.c))).filter((x) => verbRefusal(T(x.c), true) !== "").length < inter.length * 0.4);
/* 下面两条是**结构**判点：拒发分支与 pullDown 动线都在批次循环体内，没有设备就一次都跑不到 ⇒
   离线能证的只有「它在代码里的先后次序」（次序错了就是「先发了 tap 再拒」或「发了 pullDown 却没记账」）。
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
   变异体只做三件事（等价于「这条车道还没落地时的活文件」）：
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

/* ── 6.5 #10-c 三条通道各自的空转防护 ────────────────────────────────────────────────
   上面那具变异体证明的是「整套动词口径摘掉会红」；它**证明不了新增那几条断言不空转**：
   新断言的正反两面各要一具只对它的维度下手的变异体——
     M2 把 caps 那一维抹掉（通道等于没接）⇒ 「带旗标就放行」那条必须红；
     M3 把 specSatisfies 抹掉（只看旗标不看判据要求）⇒ 「次数/方向没点名仍拒发」必须红；
     M4 把 scrollVerdict 的「位置动没动」抹成恒真 ⇒ 「no-move 不算通过」必须红
        （这一具最要紧：它就是「拿调用没抛冒充滚动成功」的形状，判点若取自回读就红不了）。
   三具都只是被**文本扫描 + 现抠函数执行**（纯函数，不碰设备、不取租约），用完即删。 */
const MUTANTS = [
  { key: "caps-off", file: path.join(REPO, ".zcode", "tmp", "mutant-exec-verb-caps-off.mjs"),
    make: (s) => s.replace("(!!on[r.needsCap] && specSatisfies(r.spec, s))", "false"),
    want: (m) => /r\.needsCap \? false\b/.test(m) },
  { key: "spec-off", file: path.join(REPO, ".zcode", "tmp", "mutant-exec-verb-spec-off.mjs"),
    make: (s) => s.replace("!!on[r.needsCap] && specSatisfies(r.spec, s)", "!!on[r.needsCap]"),
    want: (m) => /r\.needsCap \? \(\!\!on\[r\.needsCap\]\)/.test(m) && !/specSatisfies\(r\.spec/.test(m) },
  { key: "scroll-moved-always", file: path.join(REPO, ".zcode", "tmp", "mutant-exec-verb-scroll-always.mjs"),
    make: (s) => s.replace("const moved = at !== bt;", "const moved = true;"),
    want: (m) => /const moved = true;/.test(m) },
];
for (const mu of MUTANTS) {
  let written = false, m2src = "", MM = null;
  try {
    const mut = mu.make(src);
    written = mut !== src && mu.want(mut);
    fs.mkdirSync(path.dirname(mu.file), { recursive: true });
    fs.writeFileSync(mu.file, mut);
    m2src = fs.readFileSync(mu.file, "utf8");
    MM = loadExec(m2src, "mutant:" + mu.key);
  } catch (e) { console.log("MUTANT_ERR " + mu.key + " " + e.message); }
  t("变异体 " + mu.key + " 确实落了盘且只改了这一维（口径仍抠得到 ⇒ 下面的红不是「取不到」造出来的）",
    written && !!MM, written ? (MM ? "ok" : "抠不到（那说明变异改坏了整张表，这条变异测不到点上）") : "变异没落到盘上");
  if (MM) {
    if (mu.key === "caps-off") {
      t("空转防护 caps-off：抹掉 caps 那一维后「带 --rapid/--scroll 就放行」立刻变红（⇒ 活文件那条正断言不是空转）",
        MM.verbRefusal(RAPID_DND08, true, { rapid: true }) !== "" && MM.verbRefusal("滚动到底看 footer", true, { scroll: true }) !== "");
      t("空转防护 caps-off：同一具变异体里**缺省路径一个字没变**（红只许出现在新维度上，否则测的就不是这一刀）",
        MM.verbRefusal(RAPID_DND08, true) === verbRefusal(RAPID_DND08, true) && MM.verbRefusal("点 .save-btn 保存", true) === "");
    }
    if (mu.key === "spec-off") {
      t("空转防护 spec-off：只看旗标不看判据要求 ⇒「次数没点名也照样放行」（活文件必须拦住这一条）",
        MM.verbsNamed("重复点击提交按钮若干次", true, { rapid: true }).every((v) => v.emittable === true));
      t("空转防护 spec-off：scroll 那一维同理（没方向也放行 ⇒ 会凭空选一个方向去滚）",
        MM.verbsNamed("列表滚动位置保持不丢", true, { scroll: true }).every((v) => v.emittable === true));
    }
    if (mu.key === "scroll-moved-always") {
      t("空转防护 scroll-moved-always：把「位置动没动」抹成恒真 ⇒ no-move 被读成 moved（正是「调用没抛就算滚过」那个形状）",
        MM.scrollVerdict({ to: "bottom" }, { __viewport__: { t: 9 } }, { __viewport__: { t: 9 } }).ok === true &&
        scrollVerdict({ to: "bottom" }, { __viewport__: { t: 9 } }, { __viewport__: { t: 9 } }).ok === false);
    }
  }
  try { if (fs.existsSync(mu.file)) fs.unlinkSync(mu.file); } catch (e) { console.log("MUTANT_CLEANUP_ERR " + mu.key + " " + e.message); }
  t("收尾：变异体 " + mu.key + " 不留盘（活文件全程未被改动）", !fs.existsSync(mu.file));
}

console.log("SUMMARY: assertion failures = " + fails);
console.log(fails ? "VERB_TEST=FAIL" : "VERB_TEST=PASS");
process.exit(fails ? 1 : 0);
