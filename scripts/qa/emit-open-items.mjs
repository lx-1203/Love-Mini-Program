#!/usr/bin/env node
/* 终报里"还欠什么"这一节不能是我手写的一段话：写完就跑不掉、也数不清。
   本脚本从权威台账直接推导未结案清单，并把每一行归到一个有归属的桶里：
   欠的是代码、是帧、是运行时探针、还是别人的一次拍板 —— 判据来自格子里的字段，不来自我的措辞。
   守恒：桶合计必须等于未结案行数；任何一行落进 "未归类" 就整门红（分类器跟不上现实时，
   红的是分类器，而不是把那一行悄悄塞进某个看起来合理的桶）。
   用法：node scripts/qa/emit-open-items.mjs [--out reports/audit/round-7/open-items.json] */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const LEDGER = resolve(REPO, arg("ledger", "reports/audit/round-6/issue-matrix.md"));
const OUT = resolve(REPO, arg("out", "reports/audit/round-7/open-items.json"));
const text = readFileSync(LEDGER, "utf8");

const rows = [];
let inTable = false;
for (const l of text.split(/\r?\n/)) {
  if (/^\| 新号 \| 历史别名/.test(l)) { inTable = true; continue; }
  if (!inTable) continue;
  if (!l.startsWith("|")) break;
  /* 分隔行 |---|---| 也会切成 11 个空格子 ⇒ 旧版把它当数据行数进主表，
     于是"主表=171"其实是 170 真行 + 1 枚幻影行（id="---"）。
     分母虚高这件事本身不改变未结案数（它的 status 不匹配 OPEN_RE），
     但任何拿"主表行数"做守恒或做口径的地方都会差一 ⇒ 只数真 MP 数据行。 */
  if (/^\|[\s|:-]*\|?$/.test(l) && /---/.test(l)) continue;
  const c = l.split("|").slice(1, -1).map((s) => s.trim());
  /* raw 整行也留下：落地锚判据要看的是"这一行给不给得出落点"，不是落点写在哪一格
     （round-7 把落点写在状态证据格、处置格开头只写「载体：」⇒ 只看处置格就漏了 8 行）。 */
  if (c.length === 11) rows.push({ id: c[0], page: c[2], cat: c[3], sev: c[4], status: c[5], evidence: c[7], statusEvidence: c[8], action: c[10], raw: l });
}
if (rows.length < 100) { console.log(`OPEN_ITEMS=FAIL reason=主表只读到 ${rows.length} 行，定位失败`); process.exit(2); }

const OPEN_RE = /^待修复|^待复验|^已修复待复验|^未取证|^需裁决/;
const open = rows.filter((r) => OPEN_RE.test(r.status));

/* 归属靠字段，不靠我读句子：closer=… / 判据台=… / 缺的载体=… 是 round-6 定下的三格口径。 */
/* 落地锚（landing anchor）= 行内任何一处能把欠账定位到具体代码位置的结构引用。三种形状：
     1) 文件:行号  —— `scripts/qa/r-exec-ws.mjs:156`、`MatchCard.vue:30-31`（扩展名 + 冒号 + 数字）
     2) 路径:数字  —— `apps/client/src/stores:587`（带斜杠的路径 + 冒号 + 数字，扩展名可省）
     3) scripts/…  —— 直接点名 scripts/ 下的载体文件（脚本本身就是这次改动要落的载体）
   为什么用它、而不是再加一个措辞词：code 桶第一版只认「处置格」里的
   `本轮落地|已落|修法|改法|结案条件`，round-7 这 8 行把落点写进「状态证据」格、
   处置格开头写成「载体：」⇒ 全部落进 UNCLASSIFIED。词表永远慢现实一轮，
   而"这行到底欠不欠一次代码改动"是能从行结构读出来的：给得出 file:line / path:数字 /
   scripts/… 就是欠代码，跟它落在哪一列、用哪个词无关。
   这条判据只放宽"进 code 桶"这一侧：它排在 backend/decision/reverify/frame/criteria/probe
   之后（那六桶先判、字节口径不动），也不接 `未取证`（那是欠一次取证、不是欠代码）。
   旧措辞判据保留不删：删掉它会让上一轮靠措辞归好桶、这一轮还没补上锚点的行当场变新红
   （收紧后莫名丢绿 = 同一类事故，本仓已记过）。真正什么都没给的行仍然落 UNCLASSIFIED
   —— UNCLASSIFIED 仍然是红，而且必须是红。 */
const LANDING_ANCHOR_RE = new RegExp(
  [
    String.raw`[\w.\-/@]+\.(?:mjs|cjs|js|ts|tsx|vue|json|md|java|sql|py|sh|css|scss|wxml|wxss|html)\s*[:：]\s*\d+`,
    String.raw`(?:[\w.\-/@]+\/)+[\w.\-@]+\s*[:：]\s*\d+`,
    String.raw`scripts\/[\w.\-/@]+`,
  ].join("|"),
);
function classify(r) {
  const s = r.status + " " + r.action;
  if (/needs_backend/.test(s)) return "backend";
  if (/需拍板|待裁决|需人拍板|产品口径|设计依据|口径未定|采 \(|裁决/.test(s) && !/缺的载体=渲染帧|缺的载体=判据/.test(r.status)) return "decision";
  if (/^已修复待复验|^待复验/.test(r.status)) return "reverify";
  if (/缺的载体=渲染帧|需排UI帧|真实档.*帧|两态帧/.test(s)) return "frame";
  if (/缺的载体=判据本身没点名|需重写判据|前提被源码推翻/.test(s)) return "criteria";
  if (/探针|载体=能问对物件/.test(s)) return "probe";
  /* 待修复 + 行内已给出改法与结案条件 ⇒ 欠的是这次代码改动本身。
     措辞既收「修法」也收「改法」：同一件事在两轮里被我写成过两个词，分类器跟着现实走，
     不是让现实改词来配合分类器。第二把尺子是行级落地锚：落点在哪个格都算。 */
  if (/^待修复/.test(r.status) && (/本轮落地|已落|修法|改法|结案条件/.test(r.action) || LANDING_ANCHOR_RE.test(r.raw))) return "code";
  /* 裸「未取证」：既没指到帧也没指到探针，欠的是一次取证 —— 单独成桶，不塞进上面任何一类充数。 */
  if (/^未取证/.test(r.status)) return "unverified";
  return "UNCLASSIFIED";
}
/* 每桶对应的复跑载体（能一行命令重跑的那件东西）；没有载体的桶就是我还欠一个工具。 */
const CARRIERS = {
  code: "node scripts/qa/verify-fixes-against-artifact.cjs --baseline 094f7239",
  criteria: "node scripts/qa/verify-source-shape.mjs --dry",
  frame: "node scripts/qa/verify-frame-debt-triage.mjs && node scripts/qa/shoot-frameplan.mjs --plan reports/audit/round-7/frameplan-round7-final.json",
  probe: "node scripts/qa/verify-evidence-holes.mjs && node scripts/qa/verify-guest-landing.mjs --mode measure",
  reverify: "node scripts/qa/verify-guest-landing.mjs --mode book && node scripts/qa/verify-source-shape.mjs --dry",
  backend: "node scripts/qa/verify-backend-restarted.mjs",
  decision: "（无：这一桶要的是人的一次拍板，脚本只能把它钉在账上）",
  unverified: "node scripts/qa/verify-evidence-holes.mjs && node scripts/qa/readjudicate-evidence.mjs <exec-results> --ops reports/audit/round-6/ops",
  UNCLASSIFIED: "（无 —— 分类器需要补口径，不许塞进别的桶）",
};

const buckets = {};
for (const r of open) { const k = classify(r); (buckets[k] = buckets[k] || []).push(r); }
const sum = Object.values(buckets).reduce((a, v) => a + v.length, 0);
const problems = [];
if (sum !== open.length) problems.push(`守恒破：桶合计 ${sum} ≠ 未结案 ${open.length}`);
if (buckets.UNCLASSIFIED && buckets.UNCLASSIFIED.length) problems.push(`有 ${buckets.UNCLASSIFIED.length} 行没落进具名桶（分类器落后于账本现实）：` + buckets.UNCLASSIFIED.map((r) => r.id).join(" "));
const noCarrier = Object.keys(buckets).filter((k) => CARRIERS[k].startsWith("（无"));

const out = {
  generatedAt: new Date().toISOString(), ledger: arg("ledger"), ledgerRows: rows.length,
  open: open.length, by: Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, v.length])),
  carrierByBucket: CARRIERS,
  items: Object.entries(buckets).flatMap(([k, list]) => list.map((r) => ({
    bucket: k, id: r.id, page: r.page, sev: r.sev, status: r.status.slice(0, 160),
    owed: (r.status.match(/缺的载体=([^）;；]+)/) || [])[1] || (r.action.match(/结案条件[：:]([^。]{6,90})/) || [])[1] || "(见处置)",
    rerun: CARRIERS[k],
  }))),
};
writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(`OPEN_ITEMS 主表=${rows.length} 未结案=${open.length} 分桶=` + Object.entries(out.by).map(([k, v]) => k + ":" + v).join(" "));
for (const k of Object.keys(buckets).sort()) console.log(`  ${k.padEnd(13)} ${String(buckets[k].length).padStart(2)}  载体：${CARRIERS[k].slice(0, 88)}`);
console.log("  → " + OUT);
if (problems.length) { console.log(`OPEN_ITEMS_RESULT=FAIL problems=${problems.length}`); for (const p of problems) console.log("  ✗ " + p); process.exit(2); }
console.log(`OPEN_ITEMS_RESULT=OK（${noCarrier.length ? noCarrier.join(",") + " 两桶本就该由人拍板，无脚本载体" : "每行都有可重跑载体"}）`);
