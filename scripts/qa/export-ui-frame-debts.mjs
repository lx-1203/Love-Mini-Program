#!/usr/bin/env node
/* 把判据台的 NEEDS_UI_FRAME 欠款拆成「要哪种帧」——这一步决定了欠款能不能被清。
 *
 * 为什么要有这个分类：NEEDS_UI_FRAME 一直被当成一个整块债（"79 条要帧"），
 * 但这三种帧的取得成本差两个数量级：
 *   STATIC_SHOOTABLE  只要打开那一页就能拍（判据描述的是静态观感）⇒ 巡检已有的帧能直接复用/补裁
 *   NEEDS_INTERACTION 要先点/输入/滚动 ⇒ 必须点名 selector，没点名就是判据的债不是通道的债
 *   NEEDS_STATE       要让页面进入某个数据态（空列表 / 加载失败 / 无定位授权 / 超长文本）
 *   NEEDS_RUNTIME     要切运行时开关（暗色模式 / 字号 / 网络类型）
 *   UNSHOOTABLE       判据点名的物件在源码里根本不存在（要么判据写错，要么改动没落地）
 *
 * 输出：reports/audit/round-7/ui-frame-debt-classes.md/.json
 * 守恒：分类必须恰好覆盖全部 NEEDS_UI_FRAME 条目，少一条就 exit 2（"分完类"不等于"分对了"）。
 *
 * 用法：node scripts/qa/export-ui-frame-debts.mjs [--verdicts <path>] [--out <dir>]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, join, dirname } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const VERD = arg("verdicts", ".zcode/tmp/fixverify/verdicts.jsonl");
const OUT = arg("out", "reports/audit/round-7");
const LEDGER = arg("ledger", "reports/audit/round-6/issue-matrix.md");

const vp = resolve(REPO, VERD);
if (!existsSync(vp)) { console.log("UIDEBT_RESULT=FAIL reason=判据台结果不存在 " + VERD + "（先跑 verify-fixes-against-artifact.cjs）"); process.exit(2); }
const items = readFileSync(vp, "utf8").split(/\r?\n/).filter(Boolean).map((s) => JSON.parse(s));
if (!items.length) { console.log("UIDEBT_RESULT=FAIL reason=判据台结果为空，分不出东西不算分完"); process.exit(2); }
const debt = items.filter((r) => r.verdict === "NEEDS_UI_FRAME");
if (!debt.length) { console.log("UIDEBT_RESULT=FAIL reason=本轮没有 NEEDS_UI_FRAME 条目，但空集不得写成「已清账」"); process.exit(2); }

/* 台账行的「页面」列 + 处置文本（判据原文在这里），按新号与历史别名都能查 */
const led = new Map();
for (const l of readFileSync(resolve(REPO, LEDGER), "utf8").split(/\r?\n/)) {
  if (!/^\|\s*MP-/.test(l)) continue;
  const c = l.split("|").map((x) => x.trim());
  const rec = { page: c[3], sev: c[5], status: c[6], evid: c[8], action: c[11] || "" };
  led.set(c[1], rec);
  if (c[2]) for (const a of c[2].split(/[;；,，]/)) led.set(a.trim().split("〔")[0], rec);
}

const RE_INTERACT = /点击|按下|长按|双击|输入|滑动|滚动|拖动|下拉|勾选|聚焦|切换后|弹层|弹窗出现|展开/;
const RE_STATE = /为空|空列表|无数据|加载失败|失败态|超长|无定位|未授权|离线|断网|缺失|无头像|未登录|游客|列表不足|两条|多条|0 ?条/;
const RE_RUNTIME = /暗色|深色|dark|大字号|字体缩放|字号|无障碍/;
const RE_ABSENT = /两载体都不存在|产物与源码都没有|找不到该物件/;

const cls = {};
const rows = [];
for (const r of debt) {
  const rec = led.get(r.id) || {};
  const text = [r.id, rec.page, rec.action, (r.uiMarkers || []).join(" "), (r.probes || []).map((p) => p && (p.sel || p.text || JSON.stringify(p))).join(" ")].join(" ");
  let k = "STATIC_SHOOTABLE";
  if (RE_ABSENT.test(text)) k = "UNSHOOTABLE";
  else if (RE_INTERACT.test(text)) k = "NEEDS_INTERACTION";
  else if (RE_STATE.test(text)) k = "NEEDS_STATE";
  else if (RE_RUNTIME.test(text)) k = "NEEDS_RUNTIME";
  cls[k] = (cls[k] || 0) + 1;
  /* 「有没有点名 selector」必须从 probes 里 kind=class 的 token 取 ——
     uiMarkers 装的是类别标签（runtime/visual/static…），正好被下面那个过滤器全部丢掉。
     上一版只从 uiMarkers 里挑，结果 namedSelectors 对 72/72 行恒为空，
     于是"需交互或状态但没点名 selector=27"变成一句**永远为真**的话：
     它数的是"我从不读的那个字段是空的"，不是判据点名没点名。 */
  const classTokens = (r.probes || []).filter((p) => p && p.kind === "class").map((p) => p.token);
  const markers = [...new Set([
    ...(r.uiMarkers || []).filter((m) => /--|-/.test(m) && !/^(runtime|visual|static|behavior|behavioral|text|style|layout|tap|input)$/.test(m)),
    ...classTokens,
  ])].filter((m) => typeof m === "string" && m.length > 1);
  /* 取景要的是**路由**，而台账「页面」列可能是源文件（组件/store 级条目就是这样）。
     源文件那种从 id 里抠路由（…-PAGES-HOME-INDEX-… ⇒ pages/home/index），抠不出来的交给 lane 去查引用方。 */
  let route = /^pages\/|^subpackages\//.test(rec.page || "") ? rec.page : "";
  if (!route) {
    const mm = /^(?:MP-)?R\d+(VIS)?-((?:PAGES|SUBPACKAGES)-.+?)-\d+$/.exec(r.id);
    if (mm) {
      const segs = mm[2].toLowerCase().split("-");
      const head = segs[0] === "pages" || segs[0] === "subpackages" ? segs.shift() : "pages";
      route = [head, ...segs].join("/");
    }
  }
  rows.push({ id: r.id, cls: k, route, page: rec.page || "", src: r.laneFile || "", namedSelectors: markers.slice(0, 6), why: (r.verdictWhy || "").slice(0, 90), criterion: (rec.action || "").slice(0, 260) });
}

const sum = Object.values(cls).reduce((a, b) => a + b, 0);
if (sum !== debt.length) { console.log("UIDEBT_RESULT=FAIL reason=分类没覆盖全部欠款 " + sum + "≠" + debt.length); process.exit(2); }
const noRoute = rows.filter((r) => !r.route).length;
const noSel = rows.filter((r) => r.cls !== "STATIC_SHOOTABLE" && !r.namedSelectors.length).length;
/* 反空转自检：如果**每一行**的点名列都是空的，那几乎一定是上游字段形状又变了（本项目已发生两次：
   字段名不对、过滤器把有效值全丢）。这时"没点名=N"这种话毫无信息量，必须报错而不是继续打印。 */
const anySel = rows.filter((r) => r.namedSelectors.length).length;
if (rows.length && !anySel) {
  console.log("UIDEBT_RESULT=FAIL reason=" + rows.length + " 行的点名列全为空 ⇒ 这是提取器坏了，不是判据全都没点名（先核对 verdicts 的 probes 形状）");
  process.exit(2);
}

mkdirSync(resolve(REPO, OUT), { recursive: true });
writeFileSync(resolve(REPO, OUT, "ui-frame-debt-classes.json"), JSON.stringify({ generatedAt: new Date().toISOString(), verdictSource: VERD, ledger: LEDGER, total: debt.length, classes: cls, rows }, null, 1));
const md = ["# round-7 · NEEDS_UI_FRAME 欠款分类（判据台 " + VERD + "）", "",
  "总数 " + debt.length + " 条；分类守恒 " + sum + "=" + debt.length + "。", "",
  "| 类别 | 条数 | 这条债在谁身上 |", "|---|---|---|",
  "| STATIC_SHOOTABLE | " + (cls.STATIC_SHOOTABLE || 0) + " | 设备：打开页即可出帧 |",
  "| NEEDS_INTERACTION | " + (cls.NEEDS_INTERACTION || 0) + " | 判据：必须点名 selector 才能自动化 |",
  "| NEEDS_STATE | " + (cls.NEEDS_STATE || 0) + " | 夹具：要造数据态（空/失败/超长/无授权） |",
  "| NEEDS_RUNTIME | " + (cls.NEEDS_RUNTIME || 0) + " | 夹具：要切运行时开关（暗色/字号） |",
  "| UNSHOOTABLE | " + (cls.UNSHOOTABLE || 0) + " | 判据或落地：点名的物件两载体都没有 |", "",
  "## 缺口自检", "",
  "- 台账「页面」列取不到路由、id 里也抠不出来的：" + noRoute + " 条（这些连该去哪个页都不知道）",
  "- 需要交互/状态但没有点名 selector：" + noSel + " 条（判据含糊的那一块）", "",
  "## 逐条", "", "| id | 类别 | 页面 | 点名物件 | 判据（截断） |", "|---|---|---|---|---|",
  ...rows.map((r) => "| " + r.id + " | " + r.cls + " | " + (r.route || "?页面无路由") + " | " + (r.namedSelectors.join(" ") || "—") + " | " + r.criterion.replace(/\|/g, "／").slice(0, 90) + " |")];
writeFileSync(resolve(REPO, OUT, "ui-frame-debt-classes.md"), md.join("\n"));
console.log("UIDEBT_TOTAL=" + debt.length + " " + Object.entries(cls).map(([k, v]) => k + "=" + v).join(" "));
console.log("UIDEBT_GAP 无路由可开=" + noRoute + " 需交互或状态但没点名selector=" + noSel);
console.log("UIDEBT_RESULT=OK 输出=" + join(OUT, "ui-frame-debt-classes.{json,md}"));
