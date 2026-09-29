#!/usr/bin/env node
/* 交互判点的"点名率"普查：哪几条用例真的能被机器点下去。
   为什么单独做这张表：执行轮的跳过原因写的是"action 含交互动词 ⇒ 本切片只跑 observe-only"，
   听起来像"工具还没做"。但补上 --tap（真点击/真输入）之后实测：一条页里 5 个交互用例
   **没有一个在 action 里点名 .class** ⇒ 点击没法归属到某个东西。
   到底是工具欠的，还是判据欠的，得用数说，不能靠印象。
   输出：
     reports/audit/round-7/tap-target-census.json  机器件（每页一条，含没点名的用例清单）
     reports/audit/round-7/tap-target-census.md    人读件
   用法：node scripts/qa/census-tap-targets.mjs [--ops reports/audit/round-6/ops] */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const OPS = resolve(REPO, arg("ops", "reports/audit/round-6/ops"));
/* --out 默认值就是原来的权威目录（不传旗标行为不变）。加这一条只为让回归测试
   （scripts/qa/test-exec-tap-verb-camel.cjs）能把产物写进自己的目录：
   test-probe-hygiene.cjs:16-19 记过一次同类事故 —— 测试跑生产工具，把生产载体覆盖了。 */
const OUT = resolve(REPO, arg("out", "reports/audit/round-7"));

if (!existsSync(OPS)) { console.log("TAPCENSUS_RESULT=FAIL reason=判据台目录不存在 " + OPS); process.exit(2); }

/* "含交互动词"这条轴也不能自己发明：上一版这里自带一张 /i 无边界表，于是
   getApp()（含 "tAp"）、「长按提示」「勾选态」这种名词都被算成"这条要点东西"，
   把 36/69 条本不欠点名的判据混进了待补清单（只读复判第三刀抓到）。
   现在直接取执行器那一行 TAP_RE 的原文；取不到就 exit 2，绝不回落到自己抄的那张表。
   2026-09-29（#C-3 驼峰动词假绿）：执行器把口径拆成了 TAP_RE + TAP_CAMEL_RE 两条字面量
   （驼峰接缝只能靠大小写认，并进带 /i 的那条就会失效），所以这里必须**两条都取**、
   合成同一个判定函数；任何一条取不到、或者驼峰那条被加上了 i 旗标，一律 exit 2 ⇒
   口径分家只会响，不会静默数出一张按旧动词表的普查。 */
const EXEC_SRC = join(REPO, "scripts", "qa", "r-exec-cli.mjs");
function grabLiteral(src, key, why) {
  const p = src.indexOf(key);
  if (p < 0) { console.log("TAPCENSUS_RESULT=FAIL reason=" + why); process.exit(2); }
  const line = src.slice(p + key.length - 1).split(String.fromCharCode(10))[0].trim();
  const end = line.lastIndexOf("/");
  if (!line.startsWith("/") || end <= 0) { console.log("TAPCENSUS_RESULT=FAIL reason=" + key + " 那行读成了 " + JSON.stringify(line.slice(0, 60))); process.exit(2); }
  const flags = line.slice(end + 1).replace(/[^a-zgimsuy]/g, "");
  try { return new RegExp(line.slice(1, end), flags); }
  catch (e) { console.log("TAPCENSUS_RESULT=FAIL reason=" + key + " 抠出来重建失败：" + String(e.message).slice(0, 80)); process.exit(2); }
}
const { TAP_RE, TAP_CAMEL_RE, TAP_TEST } = (() => {
  const src0 = readFileSync(EXEC_SRC, "utf8");
  const TAP_RE = grabLiteral(src0, "const TAP_RE = /", "取不到执行器的 TAP_RE ⇒ 动词轴无法对齐");
  const TAP_CAMEL_RE = grabLiteral(src0, "const TAP_CAMEL_RE = /",
    "取不到执行器的 TAP_CAMEL_RE ⇒ 驼峰动词那一半丢了（rapidTap×5 一族会被普查漏计，正是 #C-3 假绿的形状）");
  if (/i/.test(TAP_CAMEL_RE.flags)) {
    console.log("TAPCENSUS_RESULT=FAIL reason=TAP_CAMEL_RE 带上了 i 旗标 ⇒ [a-z][A-Z] 的驼峰接缝被大小写折叠掉，catchtap/bindtap 全会被算成交互（实测形状）");
    process.exit(2);
  }
  const TAP_TEST = (() => {
    /* 合成式也必须从执行器里取（不许在这儿自己写 `a || b`）：执行器真正下发/跳过交互判的是
       wantsInteraction()，测试里若各拼各的，把驼峰半边从 wantsInteraction 里摘掉都不会响。 */
    const p = src0.indexOf("const wantsInteraction = ");
    if (p < 0) { console.log("TAPCENSUS_RESULT=FAIL reason=取不到执行器的 wantsInteraction() ⇒ 动词轴的两半由谁合成不知道，口径已分家"); process.exit(2); }
    const line = src0.slice(p).split(String.fromCharCode(10))[0].trim();
    let fn = null;
    try { fn = new Function("TAP_RE", "TAP_CAMEL_RE", "return " + line.slice("const wantsInteraction = ".length).replace(/;$/, ""))(TAP_RE, TAP_CAMEL_RE); } catch (e) { }
    if (typeof fn !== "function") { console.log("TAPCENSUS_RESULT=FAIL reason=wantsInteraction 取出来了但不是函数：" + JSON.stringify(line.slice(0, 80))); process.exit(2); }
    if (/TAP_RE\.test\(String\(c\.action/.test(src0)) {
      console.log("TAPCENSUS_RESULT=FAIL reason=执行器里还有一处直接读 TAP_RE.test(c.action) 的判点（没走 wantsInteraction）⇒ 两半口径在该处会分家");
      process.exit(2);
    }
    return (s) => fn(s);
  })();
  /* 四条对照，缺一即红（这些就是"口径可不可信"的全部依据，宁可不出表）：
     ① getApp() 里的 tAp 不许算交互（幽灵入口断言误判的历史来源）
     ② lane 写的英文 tap 必须算交互（旧表不认 ⇒ 13 条静默不测）
     ③ rapidTap×5 必须算交互 —— #C-3：DND08/TP04/SCU06/SCU10/SCH10/RP06/INT07/FB07/TK05
        就因为旧边界认不出驼峰，一次交互都没发出却记成 EXECUTED（假绿）
     ④ emit('searchTap') 不许算交互：它与 rapidTap 同形（小写→大写接缝 + 末段 Tap），
        唯一分得开的是引号；把引号守卫删了这条就红 */
  const CTRL = [
    { s: "调用 getApp() 取应用实例", want: false, why: "TAP_RE 把 getApp() 里的 tAp 当成交互动词 ⇒ 字母边界守卫丢了，动词轴不可信" },
    { s: "tap .code-input 提交", want: true, why: "TAP_RE 不认英文动词 ⇒ lane 写的 tap 点名会被漏计" },
    { s: "500ms 内对 .save-btn rapidTap×5", want: true, why: "驼峰动词 rapidTap 没被认出来 ⇒ #C-3 假绿复活（DND08 一族会继续一行不跑却记 EXECUTED）" },
    { s: "der.vue:17 emit('searchTap') 声明", want: false, why: "引号里的驼峰名被当成动作 ⇒ 幽灵入口断言会重新混进待补清单" },
  ];
  for (const c of CTRL) {
    let got = false;
    try { got = TAP_TEST(c.s); } catch (e) { got = "throw:" + e.message; }
    if (got !== c.want) { console.log("TAPCENSUS_RESULT=FAIL reason=取到的 TAP_RE/TAP_CAMEL_RE 对照不过：" + c.why + "（样本 " + JSON.stringify(c.s) + " 期望 " + c.want + " 实得 " + got + "）"); process.exit(2); }
  }
  console.log("TAPCENSUS_CONTROLS 4/4 通过（getApp 负例 / 英文 tap 正例 / rapidTap 驼峰正例 / 'searchTap' 引号负例）口径=" + EXEC_SRC.replace(REPO + "/", "").split("\\").join("/"));
  return { TAP_RE, TAP_CAMEL_RE, TAP_TEST };
})();
/* 类名抽取口径必须**由消费者自己提供**，不能在这里抄一份：
   上一版注释写着"与执行器保持一致"，却在下面多加了 BARE_CLS_RE、又把 pre 一起扫，
   于是普查说"656 条已点名"，执行器实际跳过的比这多（实测 guest 档登录页：普查 3 条没点名，
   执行器 11 条 skipped 且原因就是"本条没点名类名"）。两张表问的不是同一个问题 ⇒
   按普查摊出去的补目标简报会系统性漏掉一批，跑完还是红。
   现在改成从 scripts/qa/r-exec-cli.mjs 里把 classesOf 的正则原文抠出来用，两边不可能再漂。 */
function consumerScraper() {
  const src = readFileSync(join(REPO, "scripts", "qa", "r-exec-cli.mjs"), "utf8");
  /* 执行器的 classesOf 现在是两条正则（BEM + 裸 kebab）。只取第一条字面量的老写法，
     会在 2026-09-27 放宽之后继续按 BEM-only 数"已点名" —— 那就是门与消费者分家的形状。
     改成并起函数体里所有 matchAll 的字面量；一条都读不到就硬失败，绝不回落到旧口径。 */
  const at = src.indexOf("function classesOf(");
  const rest = at < 0 ? "" : src.slice(at);
  /* 与其"用正则去抠正则"（正则字面量里本来就有 ( )，按括号切第一版就把参数截断成空集），
     不如把消费者那一段函数体原样 eval 出来用：口径同一份实现，不会有"门与消费者分家"的窗口。
     读的是本仓自己的脚本，且读不到/eval 不出来一律硬失败，绝不回落到旧口径。 */
  const close = rest.indexOf("\n}");
  const fnSrc = close > 0 ? rest.slice(0, close + 2).trim() : "";
  if (!fnSrc.startsWith("function classesOf(") || !fnSrc.endsWith("}")) {
    console.log("TAPCENSUS_RESULT=FAIL reason=从执行器里取不到完整的 classesOf 函数体 ⇒ 无法对齐口径（宁可红，不许按旧口径数）");
    process.exit(2);
  }
  let fn = null;
  try { fn = eval("(" + fnSrc + ")"); } catch (e) { }
  if (typeof fn !== "function") { console.log("TAPCENSUS_RESULT=FAIL reason=classesOf 取出来了但不是函数 ⇒ 这份普查不可用"); process.exit(2); }
  if (!(fn("点 .save-btn 一下").join() === ".save-btn"
    && fn("点 .circle-card__count").join() === ".circle-card__count"
    && fn("点 .chip").length === 0)) {
    console.log("TAPCENSUS_RESULT=FAIL reason=classesOf 自检不符（裸名/BEM/单词三种样本没按预期抠出来）⇒ 口径来源被改坏，这份普查不可用");
    process.exit(2);
  }
  return { tokens: (t) => fn(String(t || "")), literal: fnSrc.replace(/\s+/g, " ").slice(0, 150) };
}
const SCRAPE = consumerScraper();
/* 裸类名（`.title-input`、`.error-btn`）：人看得出那是个目标，但执行器的抠法认不出来。
   这类不再从"已点名"里蒙混过关，单列一个桶并同样进待补清单（补起来最便宜：正文里已经有类名，
   只差把它抄进显式 tapTarget 字段）。 */
const BARE_CLS_RE = /\.([a-z][a-z0-9]*(?:-[a-z0-9]+)+)/g;
const SRC_ROOT = "apps/client/src";

const pages = new Map();
let total = 0, tapCases = 0, named = 0, bareOnly = 0;
const br = { action: 0, target: 0, both: 0 };
let notAuto = 0;
for (const f of readdirSync(OPS).filter((x) => x.endsWith(".json"))) {
  let mf; try { mf = JSON.parse(readFileSync(join(OPS, f), "utf8")); } catch { console.log("TAPCENSUS_SKIP unreadable " + f); continue; }
  for (const c of (mf.cases || [])) {
    total++;
    const actionText = String(c.action || "");
    if (!TAP_TEST(actionText + " " + String(c.pre || ""))) continue;
    tapCases++;
    /* 判据台里被显式盖章 automatable:false 的条目（apply-ops-cellplans 落的，带 notAutomatableReason）
       不再算"没点名"：它欠的是一次裁决/换载体，不是一个类名。单列一桶并写进守恒等式，
       免得这个桶变成静默缺口（"待补"少了却没人解释为什么少）。 */
    if (c.automatable === false) { notAuto++; continue; }
    /* 两种"已点名"都要算，但口径按**消费者能抠到什么**判：
       (1) action 文本里有执行器那套正则抠得出的类名（BEM 形态）；
       (2) 判据带显式 tapTarget 字段（merge-tapfix-lanes 落进去的权威目标）。
       只有裸类名（.title-input 这种）不算已点名：人看得见，机器抠不到 ⇒ 仍然欠一条显式 tapTarget。 */
    const viaAction = SCRAPE.tokens(actionText).length > 0;
    /* tapTarget 只看"有没有"，不再拿正则去验它长什么样：旧写法要求类名里必须有 "-"，
       于是 .chip / .field 这类**已经由合并器逐行核过源码**的权威目标仍被算成"没点名"
       （实测 5 条），与 notes §46.1 是同一类度量盲区。 */
    const viaTarget = /\S/.test(String(c.tapTarget || ""));
    if (viaAction || viaTarget) {
      named++;
      if (viaAction && viaTarget) br.both++; else if (viaAction) br.action++; else br.target++;
      continue;
    }
    const bare = [...actionText.matchAll(BARE_CLS_RE)].length > 0;
    if (bare) bareOnly++;
    const p = c.page || "(无页)";
    if (!pages.has(p)) pages.set(p, { page: p, missing: [], manifest: f, sourceGuess: "" });
    const rec = pages.get(p);
    rec.missing.push({ id: c.id, manifest: f.replace(/\.json$/, ""), title: String(c.title || "").slice(0, 90), action: String(c.action || "").slice(0, 160), requiresReal: c.requiresReal === true, bareOnly: bare });
  }
}
/* 每页给一个"该去哪儿找真类名"的起点：按路由猜源码路径，猜不中就留空并显式说猜不中，
   免得各 lane 拿一个不存在的路径当真值。 */
for (const rec of pages.values()) {
  const cand = [join(REPO, SRC_ROOT, rec.page + ".vue"), join(REPO, SRC_ROOT, rec.page, "index.vue")].find((p) => existsSync(p));
  rec.sourceFile = cand ? cand.replace(REPO + "/", "").split("\\").join("/") : "";
  rec.sourceFound = !!cand;
}
const rows = [...pages.values()].sort((a, b) => b.missing.length - a.missing.length);
const missingTotal = rows.reduce((n, r) => n + r.missing.length, 0);
const noSrc = rows.filter((r) => !r.sourceFound).map((r) => r.page);

writeFileSync(join(OUT, "tap-target-census.json"), JSON.stringify({
  generatedAt: new Date().toISOString(), ops: OPS.replace(REPO + "/", "").split("\\").join("/"),
  totals: { cases: total, withTapVerb: tapCases, actionNamesSelector: named, actionMissingSelector: missingTotal, missingButBareClassOnly: bareOnly },
  consumerScraper: SCRAPE.literal,
  conservation: { sum: named + missingTotal, equalsTapVerb: named + missingTotal === tapCases },
  pagesWithoutSource: noSrc,
  pages: rows,
}, null, 1));

const md = ["# 交互判点点名率普查",
  "",
  "- 判据台用例：" + total + "；含交互动词：" + tapCases + "；其中 action/tapTarget 点名了的：" + named + "；**没点名的：" + missingTotal + "**；已盖章「不可自动化」的：" + notAuto,
  "- 守恒：" + named + " + " + missingTotal + " + " + notAuto + " = " + tapCases + " → " + (named + missingTotal + notAuto === tapCases ? "yes" : "**NO（有交互用例没落到任何一个桶里，这份普查不可用）**"),
  "- 读法：**这 " + missingTotal + " 条不是「工具点不动」，是「判据没写要点哪儿」**。补上 --tap（真点击/真输入）之后实测整页 0 个可点目标（r-exec-cli 的 `交互没点名` 计数器）。",
  "",
  "| 页 | 缺点名用例数 | 源码起点 |", "|---|---|---|",
];
for (const r of rows) md.push("| `" + r.page + "` | " + r.missing.length + " | " + (r.sourceFile || "**按路由没找到 .vue，lane 要先自己定位**") + " |");
if (noSrc.length) md.push("", "按路由没找到源码文件的页（" + noSrc.length + " 个）：" + noSrc.join(", "));
writeFileSync(join(OUT, "tap-target-census.md"), md.join("\n") + "\n");

console.log("TAPCENSUS cases=" + total + " 含交互动词=" + tapCases + " 点名了=" + named + " 没点名=" + missingTotal +
  " 已盖章不可自动化=" + notAuto + "（守恒：" + (named + missingTotal + notAuto === tapCases ? "yes" : "NO") + "）");
/* 从消费者源码里抠正则，最怕抠到一个"什么都匹配不到"的东西：那会让 named 掉到 0，
   看起来像"全都没点名"，实际是普查自己坏了。所以抠出的正则参与判定时先验一次非零命中。 */
console.log("TAPCENSUS_AXES 口径=执行器 classesOf 本体（eval 同一份实现，源码片段 " + SCRAPE.literal + "） 待补里只有裸类名的=" + bareOnly +
  "（这类补起来最便宜：正文已有类名，只差抄进 tapTarget）");
if (named === 0) { console.log("TAPCENSUS_RESULT=FAIL reason=派生口径命中 0 条 ⇒ 正则抠错或语料变了形，这份普查不可用（不得空过）"); process.exit(2); }
console.log("TAPCENSUS_BRANCH 只在action文本=" + br.action + " 只在 tapTarget 字段=" + br.target + " 两处都有=" + br.both +
  " 相加=" + (br.action + br.target + br.both) + " 应等于已点名 " + named + "：" + (br.action + br.target + br.both === named ? "yes" : "NO"));
console.log("TAPCENSUS 涉及页数=" + rows.length + " 其中按路由找不到源码的页=" + noSrc.length);
console.log("TAPCENSUS_WRITTEN=" + join(OUT, "tap-target-census.json"));
process.exit(named + missingTotal + notAuto === tapCases ? 0 : 2);
