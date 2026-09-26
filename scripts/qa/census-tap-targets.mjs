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
const OUT = resolve(REPO, "reports/audit/round-7");

if (!existsSync(OPS)) { console.log("TAPCENSUS_RESULT=FAIL reason=判据台目录不存在 " + OPS); process.exit(2); }

const TAP_RE = /(点击|按下|长按|双击|输入|滑动|滚动|拖动|下拉|勾选|切换后|聚焦|失焦|tap|click|input|scroll|swipe|trigger)/i;
/* 类名抽取规则与执行器保持一致（同一份正则两份实现 = 两张表会打架） */
const CLS_RE = /\.([a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:__|--)[a-z0-9_-]+)/g;
/* 裸类名（`.title-input`、`.error-btn`）：至少一个连字符，避免把句点/小数当成选择器 */
const BARE_CLS_RE = /\.([a-z][a-z0-9]*(?:-[a-z0-9]+)+)/g;
const SRC_ROOT = "apps/client/src";

const pages = new Map();
let total = 0, tapCases = 0, named = 0;
for (const f of readdirSync(OPS).filter((x) => x.endsWith(".json"))) {
  let mf; try { mf = JSON.parse(readFileSync(join(OPS, f), "utf8")); } catch { console.log("TAPCENSUS_SKIP unreadable " + f); continue; }
  for (const c of (mf.cases || [])) {
    total++;
    const actionText = String(c.action || "") + " " + String(c.pre || "");
    if (!TAP_RE.test(actionText)) continue;
    tapCases++;
    /* 两种"已点名"都要算：
       (1) action 文本里能抠出类名（BEM 或裸类名都算——之前只认 BEM，把 .title-input 这类
           真目标误记成"没点名"，普查就低估了进度）；
       (2) 判据带显式 tapTarget 字段（merge-tapfix-lanes 落进去的权威目标）。 */
    const has = [...actionText.matchAll(CLS_RE)].length > 0 ||
      [...actionText.matchAll(BARE_CLS_RE)].length > 0 ||
      /[.#]?[a-z][a-z0-9]*(-[a-z0-9]+)+/i.test(String(c.tapTarget || ""));
    if (has) { named++; continue; }
    const p = c.page || "(无页)";
    if (!pages.has(p)) pages.set(p, { page: p, missing: [], manifest: f, sourceGuess: "" });
    const rec = pages.get(p);
    rec.missing.push({ id: c.id, manifest: f.replace(/\.json$/, ""), title: String(c.title || "").slice(0, 90), action: String(c.action || "").slice(0, 160), requiresReal: c.requiresReal === true });
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
  totals: { cases: total, withTapVerb: tapCases, actionNamesSelector: named, actionMissingSelector: missingTotal },
  conservation: { sum: named + missingTotal, equalsTapVerb: named + missingTotal === tapCases },
  pagesWithoutSource: noSrc,
  pages: rows,
}, null, 1));

const md = ["# 交互判点点名率普查",
  "",
  "- 判据台用例：" + total + "；含交互动词：" + tapCases + "；其中 action 里点名了 `.class` 的：" + named + "；**没点名的：" + missingTotal + "**",
  "- 守恒：" + named + " + " + missingTotal + " = " + tapCases + " → " + (named + missingTotal === tapCases ? "yes" : "**NO（有交互用例既没算进点名也没算进缺失）**"),
  "- 读法：**这 " + missingTotal + " 条不是「工具点不动」，是「判据没写要点哪儿」**。补上 --tap（真点击/真输入）之后实测整页 0 个可点目标（r-exec-cli 的 `交互没点名` 计数器）。",
  "",
  "| 页 | 缺点名用例数 | 源码起点 |", "|---|---|---|",
];
for (const r of rows) md.push("| `" + r.page + "` | " + r.missing.length + " | " + (r.sourceFile || "**按路由没找到 .vue，lane 要先自己定位**") + " |");
if (noSrc.length) md.push("", "按路由没找到源码文件的页（" + noSrc.length + " 个）：" + noSrc.join(", "));
writeFileSync(join(OUT, "tap-target-census.md"), md.join("\n") + "\n");

console.log("TAPCENSUS cases=" + total + " 含交互动词=" + tapCases + " action点名了class=" + named + " 没点名=" + missingTotal +
  "（守恒：" + (named + missingTotal === tapCases ? "yes" : "NO") + "）");
console.log("TAPCENSUS 涉及页数=" + rows.length + " 其中按路由找不到源码的页=" + noSrc.length);
console.log("TAPCENSUS_WRITTEN=" + join(OUT, "tap-target-census.json"));
process.exit(named + missingTotal === tapCases ? 0 : 2);
