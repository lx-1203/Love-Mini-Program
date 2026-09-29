#!/usr/bin/env node
/* 分诊台「两载皆无 → 死选择器判决表认领」这一支的行为测试（独立 oracle，不复制实现）。
   测的是 round-7 EMIT_RESULT 里 unclassified=1 那行（CH12 @ subpackages/campus/campus/hub）的归因与新增分类：
     triage-exec-failures.mjs 的 absentAttribution(kind=unknown)
       → deadSelectorDisposition（判决表点名 + 判据台改名落地 + 新目标在两载查得到）
       → 桶 SKIPPED-tap-target-dead-selector-renamed + items[].deadSel + tapShapeRows["dead-selector-renamed"]
       → 四格仍如实记「两载皆无」（没被藏起来）＋文末 notClosedClauses 计入"命名不等于结案"。

   断言形状按"能变红"设计（本项目在负例上返工过三次：未 scoped 的 replace、fixture 没被真的读、
   断言写成 A and B in text 而 A/B 不相邻）：
   · 全部用**真 spawn 的分诊台**跑钉死的 fixture 语料（--dist/--src/--ops/--dead-selectors/--guest-book 都指到夹具，
     并断言 stdout 的 TRIAGE_INPUTS 回显了夹具路径 ⇒ 夹具没被读到就立刻红，不会假绿）；
   · 每条否定断言都锚在**同一行或同一个 item 对象**上（roster 行同时含 id 与 → proposed；
     NEG 的判决取 items[].note，不取整份 stdout），不做"全文里能找到就算过"；
   · NEG1–NEG5 是"真缺口照旧红"：没有判决表 / 表里是别的 id / 表里的 dead 与本行测的名不同 /
     改名改到第二个幽灵名 / 判据台没落地改名 —— 任何一条被放宽吸收，本测试立刻红（变异检验就按这个方向做）；
   · NEG6/NEG7 守着分支顺序与新桶不抢旧支（既有 tap-skipped 交叉核对、组件作用域未归因那一支）；
   · C19 是 fail-closed：判决表文件读不到 ⇒ 一行都不许认（防"读不到账就豁免"）。
   临时件只写 .zcode/tmp/lane-panel/dead-sel-test/，不碰任何权威件、不跑全局门禁。 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const TMP = join(REPO, ".zcode", "tmp", "lane-panel", "dead-sel-test");
mkdirSync(TMP, { recursive: true });

const fails = [];
let checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) fails.push(msg); };

function pickNode() {
  const v = Number(process.versions.node.split(".")[0]);
  if (v >= 20) return process.execPath;
  const alt = process.env.QA_TDS_NODE22 || "D:/codex-tools/node-v22.17.0-win-x64/node.exe";
  return existsSync(alt) ? alt : null;
}
const NODE = pickNode();
if (!NODE) {
  console.log("TDS_SUMMARY checks=1 fail=1");
  console.log("TDS_TEST=FAIL reason=找不到能跑分诊台的 node（需 >=20；env QA_TDS_NODE22 可指定）——测试不可信，不许静默跳过");
  process.exit(1);
}

/* ---------------- 夹具：两载 + 判据台 + 死选择器判决表 ----------------
   类名一律带 tds 前缀，权威件里不可能出现 ⇒ 任何"回落到真实输入"的走偏都会因为数字对不上而红。 */
const F = {
  dist: join(TMP, "fixture-dist"),
  src: join(TMP, "fixture-src"),
  ops: join(TMP, "fixture-ops"),
  table: join(TMP, "fixture-dead-selectors.json"),
  noBook: join(TMP, "fixture-no-guest-book.json"), // 故意不存在：落地对账整段跳过，退出码只由本次测的这支决定
};
const w = (p, s) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, s); };
/* 新目标 .tds-live__btn：dist 与 src 都查得到（判决表要的是"复跑有载具"） */
w(join(F.dist, "pages/demo/index.wxml"), `<view class="tds-demo"><view class="tds-live__btn" bindtap="{{a}}"><text class="tds-live__btn-text">{{b}}</text></view></view>`);
/* 组件作用域样本：只在 components/**，不在页 own file ⇒ 该走 unattributed 那一支 */
w(join(F.dist, "components/demo/widget.wxml"), `<view class="tds-comp__inner" bindtap="{{a}}" />`);
w(join(F.src, "pages/demo/index.vue"), `<template><view class="tds-demo"><view class="tds-live__btn">{{b}}</view></view></template>`);

const DEAD = ".tds-dead__btn";        // 两载皆无（真没有）
const OTHERDEAD = ".tds-otherdead__btn"; // 两载皆无，但表里给某个 id 记的是这个名字
const GHOST = ".tds-ghost__btn";      // 两载皆无 —— 用作"改名改到第二个幽灵名"
const LIVE = ".tds-live__btn";        // 两载皆有 —— 用作 proposed
const NOWHERE = ".tds-nowhere__btn";  // 两载皆无且表里没有这一条 ⇒ 真缺口，必须照旧红
const COMP = ".tds-comp__inner";      // 构建里有但不在本页文件 ⇒ 组件作用域未归因

const reason = (sel) => `目标元素 ${sel} 当前不在页上（可能要先展开/滚动/登录态）⇒ 不盲点，待补前置态`;
const SEL_BY_ID = {};   // 夹具自报"这一行测的到底是哪一串类名"⇒ scoping 断言做成关系式的，不靠二次解析实现的正则
const row = (id, sel, observed = `top=pages/demo/index | pre: ${sel}:absent | tap-skipped`) => {
  SEL_BY_ID[id] = sel;
  return ({
  suite: "TDS-SUITE", manifest: "TDS-SUITE", id, page: "pages/demo/index", tier: "critical",
  requiresReal: false, title: `tds fixture ${id}`, status: "SKIPPED", failureReason: reason(sel),
  observed, missingEvidence: [], route: "pages/demo/index", toast: "", console: "", evidence: "", durationMs: 0, transport: "ws+cli-shot",
}); };

/* 判据台：POS1/NEG3/NEG4 都"已把改名落地"，NEG5 没有 cellplanRename（表里认了名也没用） */
const opsCase = (id, from, to) => {
  const c = { id, page: "pages/demo/index", title: `tds ops ${id}`, action: `tap ${to || LIVE}` };
  if (from) c.cellplanRename = { from, to, source: "fixture-dead-selectors.json" };
  if (to) c.tapTarget = to;
  return c;
};
w(join(F.ops, "TDS-SUITE.json"), JSON.stringify({
  suite: "TDS-SUITE",
  cases: [
    opsCase("POS1", DEAD, LIVE),
    opsCase("NEG2", DEAD, LIVE),        // 判据台这边也落了改名 ⇒ NEG2 只剩"表里没点名这个 id"一把尺可守（测 scoped 匹配）
    opsCase("NEG3", OTHERDEAD, LIVE),   // 表里给 NEG3 记的 dead 与本行测的不是同一个名
    opsCase("NEG4", DEAD, GHOST),       // 改名改到了第二个幽灵名（两载皆无）
    opsCase("NEG5", null, null),        // 判据台没落地任何改名
    opsCase("NEG7", COMP, LIVE),        // 有表条目、有落地改名，但本行走的是组件作用域那一支
    opsCase("OTHER9", DEAD, LIVE),      // 表里点名的是 OTHER9，不是 NEG2 ⇒ 按 id 精确匹配才拦得住
  ],
}, null, 1));

w(F.table, JSON.stringify({
  $comment: "夹具表：只有带 dead+proposed 两个类名形态的条目才可认领这一支",
  "A-rename-to-real-name": [
    { manifest: "TDS-SUITE", id: "POS1", dead: DEAD, proposed: LIVE, file: "fixture-src/pages/demo/index.vue", line: 1, prestate: "节点在 v-if=!isVerified 里 ⇒ 复测腿要带未认证夹具", blocking: true },
    { manifest: "TDS-SUITE", id: "NEG3", dead: OTHERDEAD, proposed: LIVE, file: "fixture-src/pages/demo/index.vue", line: 1, blocking: true },
    { manifest: "TDS-SUITE", id: "NEG4", dead: DEAD, proposed: GHOST, file: "fixture-src/pages/demo/index.vue", line: 1, blocking: true },
    { manifest: "TDS-SUITE", id: "NEG5", dead: DEAD, proposed: LIVE, file: "fixture-src/pages/demo/index.vue", line: 1, blocking: true },
    { manifest: "TDS-SUITE", id: "NEG7", dead: COMP, proposed: LIVE, file: "fixture-src/pages/demo/index.vue", line: 1, blocking: true },
    { manifest: "TDS-SUITE", id: "OTHER9", dead: DEAD, proposed: LIVE, file: "fixture-src/pages/demo/index.vue", line: 1, blocking: true },
  ],
  /* 没有 proposed 的那一族（整删/改文案）必须被忽略 —— 它们给不出可复跑的目标 */
  "B-criterion-targets-a-removed-feature": [
    { manifest: "TDS-SUITE", ids: ["NEGB1", "NEGB2"], dead: NOWHERE, finding: "整删，没有 proposed", disposition: "拆两件事落", blocking: true },
  ],
  "C-advisory-not-blocking": { count: 1, rows: ["TDS-SUITE#TDSX .tds-advisory —— 只提示不否决"], rule: "夹具" },
}, null, 1));

const mkCorpus = (name, results) => {
  const p = join(TMP, name + ".exec-results.json");
  writeFileSync(p, JSON.stringify({ gitSha: "tds-fixture", updatedAt: new Date().toISOString(), runner: "tds-fixture", results }, null, 1));
  return p;
};
function runTriage(tag, corpusRows, over = {}) {
  const corpus = mkCorpus(tag, corpusRows);
  const outBase = join(TMP, "triage-" + tag);
  const args = [
    join(HERE, "triage-exec-failures.mjs"), "--results", corpus, "--out", outBase,
    "--dist", F.dist, "--src", F.src, "--ops", F.ops, "--dead-selectors", over.table || F.table,
    "--guest-book", F.noBook,
  ];
  const r = spawnSync(NODE, args, { cwd: REPO, encoding: "utf8", timeout: 240000, maxBuffer: 64 * 1024 * 1024 });
  const stdout = String(r.stdout || "") + String(r.stderr || "");
  let json = null;
  try { json = JSON.parse(readFileSync(outBase + ".json", "utf8")); } catch { /* 交给断言判红 */ }
  let md = "";
  try { md = readFileSync(outBase + ".md", "utf8"); } catch { /* same */ }
  return { code: r.status, stdout, json, md, corpus, outBase };
}
const lineOf = (stdout, re) => (stdout.split(/\r?\n/).find((l) => re.test(l)) || null);
const itemOf = (json, id) => (json ? (json.items || []).find((it) => it.id === id) || null : null);

/* ================= POS：四把尺全过 ⇒ 具名桶、不进 unclassified、四格仍可见 ================= */
const pos = runTriage("pos", [row("POS1", DEAD)]);
ok(pos.json !== null, "C1a: 分诊台对 POS 夹具没写出 sidecar（夹具根本没被读） exit=" + pos.code + " out=" + pos.stdout.slice(0, 400));
ok(/TRIAGE_INPUTS results=.*dead-sel-test[\\/]+pos\.exec-results\.json/.test(pos.stdout),
  "C1b: POS 跑没回显夹具语料路径（说明它回落到了默认输入，后面所有断言都不算数）：" + (lineOf(pos.stdout, /TRIAGE_INPUTS/) || "(无该行)"));
if (pos.json) {
  const it = itemOf(pos.json, "POS1");
  ok(it && it.bucket === "SKIPPED-tap-target-dead-selector-renamed",
    "C2: POS 行没落进新具名桶：" + JSON.stringify(it && { bucket: it.bucket, note: it.note }));
  ok(it && it.sel === DEAD && it.token === "tds-dead__btn" && it.tokenKind === "selector" && it.recoverable === true,
    "C2b: POS 行没把本行实际测的目标原样记下来（token/sel 被改写就没法复核）：" + JSON.stringify(it && { sel: it.sel, token: it.token, tokenKind: it.tokenKind, recoverable: it.recoverable }));
  const d = it && it.deadSel;
  ok(d && d.dead === DEAD && d.proposed === LIVE && d.group === "A-rename-to-real-name" && d.opsFrom === DEAD && d.opsTo === LIVE && d.prestate && /未认证/.test(d.prestate),
    "C3: 认领来源三件套（表组名/from/to/前置）没逐字段落在 item.deadSel 上：" + JSON.stringify(d));
  ok(d && d.proposedDist > 0 && d.proposedSrc > 0,
    "C3b: proposed 的两载命中数没记下来（④那把尺无从复核）：" + JSON.stringify(d && { proposedDist: d.proposedDist, proposedSrc: d.proposedSrc }));
  /* 命名不等于隐藏：四格仍要说它两载皆无 */
  ok(it && String(it.verdict || "").startsWith("两载皆无") && it.distHits === 0 && it.srcHits === 0,
    "C4: POS 行没进 dist/src 双载体检（被藏起来了）：" + JSON.stringify(it && { verdict: it.verdict, distHits: it.distHits, srcHits: it.srcHits }));
  ok(pos.json.deadSelectorRenamed === 1 && (pos.json.tapShapeCounts || {})["dead-selector-renamed"] === 1,
    "C4b: sidecar 的 deadSelectorRenamed/tapShapeCounts 计数不是 1：" + JSON.stringify({ a: pos.json.deadSelectorRenamed, b: pos.json.tapShapeCounts }));
  /* gateFires 是"哪条规则在火上"的机器面：这里故意做**全等**比对（多一个键、少一个键、值不对都红），
     所以任何一次判据面扩键都必须同时改这条期望 —— 2026-09-29 落地对判域收窄（decisions §29 路 b）
     新增 landingUndeclared / landingAdjudicable 两键，POS 夹具里它们应当分别是 0 与 0（无可归属组、
     也无身份未声明组）。不把期望改全就当红，是对的方向：静默扩键才是真隐患。 */
  ok(JSON.stringify(pos.json.gateFires || {}) === JSON.stringify({ unclassified: 0, landingMissing: 0, landingUndeclared: 0, landingAdjudicable: 0, coverMismatch: 0, openPageMeasuredDefect: 0, evidenceHoles: 0 }),
    "C4c: gateFires（哪条规则在火上）没记全或 POS 有额外红：" + JSON.stringify(pos.json.gateFires));
}
ok(pos.json && pos.json.unclassified === 0, "C5: POS 夹具的 unclassified 不是 0，实际=" + (pos.json && pos.json.unclassified));
ok(pos.code === 0, "C5b: POS 夹具退出码不是 0（四把尺全过应当结案到「欠复跑」而不是红），exit=" + pos.code);
{
  const l = lineOf(pos.stdout, /^TRIAGE_DEAD_SELECTOR_RENAMED=1（/);
  ok(l !== null, "C6a: stdout 没有行首锚定的 TRIAGE_DEAD_SELECTOR_RENAMED=1 计数行");
  /* 来源可查：这一行必须同时点名判决表与判据台目录（读不到账就无从解释"没认"） */
  ok(l && /fixture-dead-selectors\.json/.test(l) && /fixture-ops/.test(l),
    "C6b: 计数行没交代认领来源（表/判据台路径），下一个人无法判断是「表里真没有」还是「表没读到」：" + (l || "(无该行)"));
  const roster = lineOf(pos.stdout, /^ {2}TAP_DEAD_SEL_RENAMED POS1 @ pages\/demo\/index \.tds-dead__btn → \.tds-live__btn/);
  ok(roster !== null, "C7: 名册行没有把 id、旧名、新名写在同一行（A and B 分别出现在别处不算数）");
  ok(/TRIAGE_GATE=PASS unclassified=0/.test(pos.stdout) && /TRIAGE_DEAD_SELECTOR_RENAMED=1（.*命名不等于结案/.test(pos.stdout),
    "C8: 结案那句没写「命名不等于结案」，或 PASS 句缺失");
  ok(pos.md.includes("SKIPPED-tap-target-dead-selector-renamed") && /TAP_DEAD_SEL_RENAMED（两载皆无/.test(pos.md),
    "C9: 分诊 md 里没有这个桶/这一支分叉的点名（读者只能看到数，看不到账）");
  ok(/命名不等于结案[^\n]*按判决表的 proposed 目标/.test(pos.stdout) || /TRIAGE_DEAD_SELECTOR_RENAMED=1（.*欠按 proposed 复跑/.test(pos.stdout),
    "C9b: 这一支的欠账去向（按新目标复跑）没有随本轮读数打印出来");
}

/* ================= NEG：五种"其实没人认领"必须照旧红 ================= */
const negRows = [
  row("NEG1", NOWHERE),                       // 表里根本没有这一条 ⇒ 真缺口
  row("NEG2", DEAD),                          // 表里有同一个 dead 名，但点名的是 OTHER9 ⇒ 按 id 匹配才拦得住
  row("NEG3", DEAD),                          // 表给 NEG3 记的 dead 是别的名字
  row("NEG4", DEAD),                          // proposed 也是幽灵名 ⇒ 没有载具
  row("NEG5", DEAD),                          // 判据台没落地改名
  row("NEG6", DEAD, "top=pages/demo/index | pre: .tds-dead__btn:absent"), // 少了 tap-skipped ⇒ 先撞既有交叉核对
  row("NEG7", COMP),                          // 组件作用域那一支不被新桶抢走
];
const neg = runTriage("neg", negRows);
ok(neg.json !== null, "C10a: 分诊台对 NEG 夹具没写出 sidecar exit=" + neg.code);
{
  const l0 = lineOf(neg.stdout, /^TRIAGE_DEAD_SELECTOR_RENAMED=0（/);
  ok(l0 !== null, "C10b: 一行的都没有时也必须报 0（新桶只在命中时才报数 = 「没生效」与「没这种行」读起来一样）");
  ok(neg.json && neg.json.deadSelectorRenamed === 0, "C10c: NEG 夹具的 deadSelectorRenamed 不是 0");
  ok(neg.json && (neg.json.buckets["SKIPPED-tap-target-dead-selector-renamed"] || 0) === 0,
    "C10d: NEG 夹具竟有行落进了新桶，buckets=" + JSON.stringify(neg.json && neg.json.buckets["SKIPPED-tap-target-dead-selector-renamed"]));
}
if (neg.json) {
  const u = (id) => (neg.json.unclassifiedRows || []).filter((s) => s.startsWith(id + " @")).join("\n");
  /* 每条 NEG 的红句必须钉在自己的行上（行首就是这条 id），不许靠"全文里某处出现过"蒙过 */
  ok(/臆造选择器，须人判/.test(u("NEG1")) && !/fixture-dead-selectors/.test(u("NEG1")),
    "C11(NEG1 无判决表=真缺口): 没按原红句「臆造选择器，须人判」落红：" + u("NEG1"));
  {
    const n2 = itemOf(neg.json, "NEG2"), p1 = itemOf(pos.json, "POS1");
    ok(n2 && n2.bucket === "other-fail" && /臆造选择器，须人判/.test(u("NEG2")),
      "C12(NEG2 表里点名的是 OTHER9 而不是这个 id): 被按选择器名兜吸收了吗？" + JSON.stringify({ bucket: n2 && n2.bucket, note: n2 && n2.note, line: u("NEG2").slice(0, 150) }));
    /* 关系式：两行测的是**同一串**选择器、判据台两边都落了改名，唯一区别是表里点名的是谁的 id。
       任何"按 dead 名字在表里捞一条"的实现都会让这条变绿（变异 MUT-B 就是这么想蒙过去的）。 */
    ok(SEL_BY_ID.NEG2 === SEL_BY_ID.POS1 && p1 && p1.sel === SEL_BY_ID.POS1 && n2 && n2.bucket !== p1.bucket,
      "C12b(两行测的是同一串 " + SEL_BY_ID.NEG2 + "，必须一红一绿，否则按 id scoping 是空的): " + JSON.stringify({ neg2bucket: n2 && n2.bucket, pos1bucket: p1 && p1.bucket, pos1sel: p1 && p1.sel }));
  }
  ok(/与本行实际测的/.test((itemOf(neg.json, "NEG3") || {}).note || ""),
    "C13(NEG3 dead 不同名): note 没锚定「表里 dead 与本行测的类名不同」这一判：" + JSON.stringify((itemOf(neg.json, "NEG3") || {}).note));
  ok(/改名改到了第二个幽灵名/.test((itemOf(neg.json, "NEG4") || {}).note || ""),
    "C14(NEG4 proposed 也是幽灵名): note 没锚定「没有载具」这一判：" + JSON.stringify((itemOf(neg.json, "NEG4") || {}).note));
  ok(/判据台该条却没有/.test((itemOf(neg.json, "NEG5") || {}).note || "") && /改名没落进判据/.test((itemOf(neg.json, "NEG5") || {}).note || ""),
    "C15(NEG5 判据台未落地改名): " + JSON.stringify((itemOf(neg.json, "NEG5") || {}).note));
  ok(/observed 里却没有 tap-skipped/.test((itemOf(neg.json, "NEG6") || {}).note || ""),
    "C16(NEG6 缺 tap-skipped): 新桶绕过了既有的本行自报交叉核对：" + JSON.stringify((itemOf(neg.json, "NEG6") || {}).note));
  const n7 = itemOf(neg.json, "NEG7");
  ok(n7 && n7.bucket === "SKIPPED-tap-target-absent-unattributed",
    "C17(NEG7 组件作用域那一支被新桶抢了): bucket=" + (n7 && n7.bucket) + "（分支顺序：outcome/unattributed 必须在 dead 之前）");
  ok(neg.json.unclassified === 6,
    "C18: NEG 夹具未归类行数不是 6（NEG1..NEG6），实际=" + neg.json.unclassified + " 名单=" + JSON.stringify((neg.json.unclassifiedRows || []).map((s) => s.split(" @")[0])));
}
ok(neg.code === 2, "C19: NEG 夹具没判红，exit=" + neg.code);

/* ================= fail-closed：判决表读不到 ⇒ 一行都不认 ================= */
const noTable = runTriage("notable", [row("POS1", DEAD)], { table: join(TMP, "fixture-does-not-exist.json") });
ok(noTable.code === 2 && noTable.json && noTable.json.unclassified === 1,
  "C20(fail-closed): 判决表文件不存在时 POS1 仍被认了（没读到账就豁免=假绿），exit=" + noTable.code + " unclassified=" + (noTable.json && noTable.json.unclassified));
ok(/TRIAGE_DEADSEL warn=判决表读不到/.test(noTable.stdout) && /^TRIAGE_DEAD_SELECTOR_RENAMED=0（/m.test(noTable.stdout),
  "C20b: fail-closed 没有明说（warn 行或缺 / 计数行仍报 0）");

/* ================= 接线与判据强度：源码级 scoped 检查（建了不接=本仓公开批评过的同类失败）============ */
const src = readFileSync(join(HERE, "triage-exec-failures.mjs"), "utf8");
{
  const start = src.indexOf("const tapAbsent = reason.match(RE_TAP_ABSENT);");
  const end = src.indexOf("if (RE_TAP_DISPATCH.test(reason))");
  ok(start > 0 && end > start, "C21a: 找不到 RE_TAP_ABSENT 那一段（夹具之外的实现被挪走了？先让测试红再查）");
  if (start > 0 && end > start) {
    const blk = src.slice(start, end);
    ok(/at\.kind === "unknown"/.test(blk), "C21b: 新分支没挂在 kind=unknown（两载皆无）那一支上，可能改成抢前面的两支");
    ok(blk.indexOf('if (at.kind === "unattributed") return') < blk.indexOf("deadSelectorDisposition(sel, r)"),
      "C21c: deadSelectorDisposition 的调用位置在 unattributed 之前（会抢走组件作用域那一支）");
    ok(/bucket: "SKIPPED-tap-target-dead-selector-renamed"/.test(blk),
      "C21d: 桶名不是字面量 ⇒ 文末词表自核 produced() 会把它当空转桶");
    ok(/仍按「臆造选择器，须人判」落红/.test(blk) && /两支都不认这条，落红/.test(blk),
      "C21e: 原红句被删了（放宽判据的铁证：拒绝认领的路径消失了）");
  }
  const known = (src.match(/const KNOWN = \[[^\]]*\]/) || [""])[0];
  ok(/"dead-selectors"/.test(known), "C22: --dead-selectors 没进 KNOWN 旗标表 ⇒ 会被「不认识的旗标」判红或被静默忽略");
  const guard = (src.match(/if \(unclassified\) \{[\s\S]{0,300}?markProblem/) || [""])[0];
  ok(/markProblem/.test(guard), "C23: unclassified 的否决断言被拆了（词表漂移不再变红）");
  const disp = (src.match(/function deadSelectorDisposition[\s\S]*?\n\}/) || [""])[0];
  for (const [re, why] of [
    [/if \(!d\) return null;/, "①表里没点名这一条 manifest+id ⇒ 必须交回原红句"],
    [/if \(d\.dead !== sel\)/, "②表里的 dead 必须精确等于本行测的类名"],
    [/if \(o\.from !== sel\)/, "③判据台必须真的从这个名字改走"],
    [/if \(o\.to !== d\.proposed && o\.tapTarget !== d\.proposed\)/, "③b 两份账的去向必须同源"],
    [/if \(!ph\.dist && !ph\.src\)/, "④新目标必须在两载里查得到，否则没有载具"],
  ]) ok(re.test(disp), "C24 判据强度（" + why + "）：该守卫不在了或在函数体外 = 放宽");
  ok(/tableEntries: DEAD_SEL\.size, tableIgnored: deadSelIgnored/.test(src),
    "C25: sidecar 没记「表里读到了什么/忽略了什么」 ⇒ 无从区分「表里真没有」与「表没读到」");
}

console.log(`TDS_SUMMARY checks=${checks} fail=${fails.length}`);
for (const f of fails) console.log("  TDS_MISS " + f);
console.log(fails.length
  ? "TDS_TEST=FAIL " + fails.length + " 条断言未过（详见 TDS_MISS 行）"
  : "TDS_TEST=PASS 两载皆无只有「判决表点名+判据台改名落地+新目标有载具」才命名；五种无认领形态照旧红、表读不到照旧红、组件作用域那一支不被抢");
process.exit(fails.length ? 1 : 0);
