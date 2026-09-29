#!/usr/bin/node
/* 负例（刀三 #C-1）：probeMany 明明问了渲染器要 size，却只留 res.length，width/height 当场丢掉
   ⇒ "逐个 boundingClientRect 量测、回填 rpx 对照 88rpx"这一类判据（VI40/VI42/DND12/FHT14/CI21/CS23…）
   从来没被量到过，行却还是 EXECUTED 且带帧。
   本测试把探针拆出来的两个纯函数现抠自执行器（同一份实现，不许在测试里另抄）：
     probeStartSource(selectors) —— 注入给 app 的那段脚本原文（可以不含设备地检查它问了什么、留了什么）
     interpretProbe(selectors, bag) —— 把袋子里的原始读数翻译成"计数 + 几何"
     geomText(c, d) / pxToRpx(px, win) —— 拼成行内 geometry 字段的那一行读数
   空转防护：把"丢掉几何"的老形状（纯数字袋子）喂进同一个翻译函数，几何必须是空 ⇒
   上面那条"尺寸 survive"的断言确实会红，不是碰巧绿。
   跑法：PATH=<node22 目录>:$PATH node scripts/qa/test-exec-probe-geometry.cjs
   聚合器认的输出：SUMMARY: assertion failures = N（run-qa-selftests.mjs:45-51）+ GEOM_TEST=PASS|FAIL */
"use strict";
const fs = require("node:fs");
const path = require("node:path");

const REPO = path.resolve(__dirname, "..", "..");
const EXEC = path.join(REPO, "scripts", "qa", "r-exec-cli.mjs");
const OPS = path.join(REPO, "reports", "audit", "round-6", "ops", "SUBPACKAGES-VILLAGE-VILLAGE-INDEX.json");

let fails = 0, checks = 0;
function t(name, cond, detail) {
  checks++;
  if (!cond) { fails++; console.log("FAIL " + name + (detail === undefined ? "" : " :: " + String(detail).slice(0, 260))); }
  else console.log("ok   " + name + (detail === undefined ? "" : "  (" + String(detail).slice(0, 170) + ")"));
}
function extract(src, name) {
  const at = src.indexOf("function " + name + "(");
  if (at < 0) return null;
  const rest = src.slice(at);
  const firstLine = rest.slice(0, rest.indexOf("\n")).trim();
  /* 执行器里有几个 helper 是一行写完的（authorityTargets/judgeTargets/pxToRpx）：
     一行函数若按 "\n}" 找结尾，会一路吞到下一个多行函数的末尾 ⇒ 拼出来的源码里函数重复声明。 */
  if (firstLine.endsWith("}") && !firstLine.endsWith("{")) return firstLine;
  const close = rest.indexOf("\n}");
  if (close < 0) return null;
  const body = rest.slice(0, close + 2).trim();
  return body.startsWith("function " + name + "(") && body.endsWith("}") ? body : null;
}
let src = "";
try { src = fs.readFileSync(EXEC, "utf8"); } catch (e) { }
const NAMES = ["classesOf", "authorityTargets", "judgeTargets", "pxToRpx", "interpretProbe", "geomText", "probeStartSource"];
const got = {};
for (const n of NAMES) { got[n] = extract(src, n); t("执行器里取到纯函数 " + n + "()", !!got[n]); }
if (NAMES.some((n) => !got[n])) {
  console.log("SUMMARY: assertion failures = " + (fails + 1));
  console.log("GEOM_TEST=FAIL（口径取不到，后面的断言一条都没跑）");
  process.exit(1);
}
let M = null;
try { M = new Function(NAMES.map((n) => got[n]).join("\n") + "\n return {" + NAMES.join(",") + "};")(); }
catch (e) { console.log("EVAL_ERR " + e.message); }
const { interpretProbe, geomText, probeStartSource, pxToRpx } = M || {};
t("eval 出来的是函数", typeof interpretProbe === "function" && typeof geomText === "function" && typeof probeStartSource === "function");

/* ── 1. 注入脚本：问了什么不许变宽，留下了什么必须变多 ── */
const injected = probeStartSource([".village-search", ".back-to-top"]);
const fieldsSeen = (injected.match(/fields\(\{[^)]{0,40}/g) || ["(没找到 fields)"]);
t("仍然只问 size:true（不新增 rect/node 请求 ⇒ 这一刀不改设备面，成败判定与旧版一致）",
  injected.includes("fields({ size: true }") && !/fields\(\{[^}]*\b(rect|node|dataset)\s*:/.test(injected), fieldsSeen[0]);
t("回调把 width/height 留下来（这就是 #C-1 掉的读数）", /\.width/.test(injected) && /\.height/.test(injected));
t("计数口径没被搬走：res.length 仍是节点数的来源", /arr\.length/.test(injected) || /res\.length/.test(injected));
t("每个选择器最多留 4 个节点的框（防载荷爆掉，但 4 个是实测热点判据够用的下限）", /k < 4/.test(injected));
t("取窗口宽度只为换算 rpx，且整段包在 try 里（读不到就只报 px，不许拖垮探针）",
  /try \{[^}]*windowWidth/.test(injected.replace(/\s+/g, " ")) || /getSystemInfoSync/.test(injected));

/* ── 2. 翻译层：尺寸必须 survive 到返回值里 ── */
const SELS = [".village-search", ".channel-feed", ".back-to-top"];
const bag = {
  0: { c: 1, b: [[128, 240]] },
  1: { c: 4, b: [[88, 88], [88, 88], [96, 88], [88, 96]] },
  2: { c: 0, b: [] },
  __win: 375,
};
const d = interpretProbe(SELS, bag);
t("present(N) 计数与旧版逐字一致（放宽几何不许动成败判定）",
  d[".village-search"] === "present(1)" && d[".channel-feed"] === "present(4)" && d[".back-to-top"] === "absent",
  [d[".village-search"], d[".channel-feed"], d[".back-to-top"]].join(" "));
t("尺寸 survive：__geom 里带着 width/height", !!d.__geom && d.__geom[".village-search"].boxes[0][0] === 128 && d.__geom[".village-search"].boxes[0][1] === 240,
  JSON.stringify(d.__geom && d.__geom[".village-search"]));
t("多节点选择器把每个节点的框都留下（同名的 .action-btn×4 就是靠这个分得开）",
  d.__geom[".channel-feed"].boxes.length === 4 && d.__geom[".channel-feed"].nodes === 4);
t("absent 的选择器不进 __geom（没量到东西不许伪造一个框）", !(".back-to-top" in (d.__geom || {})));
t("窗口宽度也带上（rpx 换算的一手依据）", d.__geom[".village-search"].win === 375);
t("ERR 与 no-answer 两种失败形状照旧（新增几何不许把失败读成 0 个）",
  interpretProbe([".a-b"], { 0: "ERR" })[".a-b"] === "ERR" && interpretProbe([".a-b"], {})[".a-b"] === "no-answer");
t("渲染器没给数字时留 null，不偷偷填 0", interpretProbe([".a-b"], { 0: { c: 1, b: [[null, null]] } }).__geom[".a-b"].boxes[0][0] === null);

/* ── 3. 行内读数：px + rpx，且只归属本条点名的选择器 ── */
const vi40Like = { action: "对 .village-search、.back-to-top 逐个 boundingClientRect 量测", tapTarget: "" };
const txt = geomText(vi40Like, d);
t("行内 geometry 给出 px（128x240px）", /128x240px/.test(txt), txt);
t("行内 geometry 按 750rpx=windowWidth 换算 rpx（375px 窗口 ⇒ 128px=256rpx、240px=480rpx）",
  /≈256x480rpx/.test(txt), txt);
t("只归属本条点名的选择器：.channel-feed 的读数不许漏进这一行", !/\.channel-feed/.test(txt), txt);
t("88×88rpx 这类判点可以直接机读对照（rpx 数值在串里）", /[0-9.]+x[0-9.]+rpx/.test(txt));
const noWin = interpretProbe([".village-search"], { 0: { c: 1, b: [[128, 240]] } });
t("没量到窗口宽度 ⇒ 只报 px，绝不凭空造一个 rpx 数", /\.village-search=\[128x240px\]$/.test(geomText(vi40Like, noWin)), geomText(vi40Like, noWin));
const allNull = interpretProbe([".village-search"], { 0: { c: 1, b: [[null, null]] }, __win: 375 });
t("渲染器没给数字 ⇒ 记 ? 而不是记 0（0 是「量到 0 尺寸」，两码事）", /\?\]/.test(geomText(vi40Like, allNull)), geomText(vi40Like, allNull));
t("pxToRpx：窗口宽度缺失/为 0 时返回 null（除零与凭空换算一起挡）", pxToRpx(128, 0) === null && pxToRpx(128, null) === null && pxToRpx("x", 375) === null);

/* ── 4. 接线判点：读数必须真的落到行上，observed 与行内字段同源 ── */
t("row() 里有独立的 geometry 字段（observed 会被下游截到 300 字，尺寸不能只挤在里面）",
  /geometry,/.test(src) || /geometry:/.test(src));
t("observed0 在拼 observed 的同一刻把读数交给 CUR_GEOM", /CUR_GEOM = gm;/.test(src) && /const gm = geomText\(c, d\);/.test(src));
t("尺寸只在量到时才追加进 observed（旧形状对没有几何的行保持不变）", /\(gm \? " \| size: " \+ gm\.slice\(0, 300\) : ""\)/.test(src));
t("跨条残留挡了两道（组边界 + 每条开头都清一次，取用后即清）",
  (src.match(/CUR_GEOM = "";/g) || []).length >= 3 && /const geometry = CUR_GEOM; CUR_GEOM = "";/.test(src),
  "清理点 " + (src.match(/CUR_GEOM = "";/g) || []).length + " 处");

/* ── 5. 真实判据台：VI40 这一条现在量得到东西（扫描集非空、不许是合成样本自证） ── */
let vi40 = null;
try {
  const mf = JSON.parse(fs.readFileSync(OPS, "utf8"));
  vi40 = (mf.cases || []).find((c) => c.id === "VI40");
} catch (e) { }
t("判据台里找得到 VI40（找不到就说明这条测试在空转）", !!vi40, vi40 ? vi40.action.slice(0, 60) : "null");
if (vi40) {
  const named = M.judgeTargets(vi40);
  t("VI40 点名的类名抠得出来（几何要有归属对象）", named.length >= 2, named.join(" "));
  const fake = interpretProbe(named, Object.assign({ __win: 375 }, ...named.map((s, i) => ({ [i]: { c: 1, b: [[128, 88]] } }))));
  const line = geomText(vi40, fake);
  t("喂进 VI40 自己的点名物件时，每个都拿到一行尺寸读数",
    named.every((s) => line.includes(s + "=[") && /256x176rpx/.test(line)), line.slice(0, 180));
}

/* ── 6. 空转防护：老形状（只有条数的袋子）必须量不到任何东西 ── */
const legacyBag = interpretProbe(SELS, { 0: 1, 1: 4, 2: 0 });
t("空转防护：老袋子（纯数字）翻译出来没有 __geom ⇒ 上面那批尺寸断言确实会红",
  !legacyBag.__geom && geomText(vi40Like, legacyBag) === "",
  "keys=" + Object.keys(legacyBag).join(","));
t("空转防护：老袋子的计数形状与新版一致（说明差异只在几何，不在成败判定）",
  legacyBag[".village-search"] === "present(1)" && legacyBag[".back-to-top"] === "absent");

console.log("SUMMARY: assertion failures = " + fails);
console.log(fails ? "GEOM_TEST=FAIL" : "GEOM_TEST=PASS");
process.exit(fails ? 1 : 0);
