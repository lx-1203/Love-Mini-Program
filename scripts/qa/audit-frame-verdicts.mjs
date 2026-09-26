#!/usr/bin/env node
/* 帧级判红落账前的最后一道闸：这条"未成立"到底是产品没修，还是我的探针问错了问题？
 *
 * 为什么必须有这个载体（本轮实测）：42 条里有 18 条判红，其中一半的 target 根本不是选择器，
 * 而是「陈默那一行的 .chat-item__time-row 内的 image 与 .chat-item__muted-icon」这类散文。
 * selectorsOf() 会从散文里抠出一个 BEM 片段去 selectAll，抠到的那个物件条件渲染与否、
 * 甚至是否真在产物里存在，都不受判据保证——拿它的 0 去写"待修复"，等于把测量错记成产品缺陷，
 * 和"把红洗成绿"是同一类造假，只是方向相反。
 *
 * 三条可判性条件（缺一即不作判据，逐条点名欠在哪）：
 *   1. target 必须本身就是机器可判物件（不含中文量词/连接词，不是多物件合写）；
 *   2. 探针抠出的每个锚点都必须在被测产物里真实存在（class 名或选择器片段可 grep 到）；
 *   3. 探针必须真给了数字答案（PROBE_NO_ANSWER / 'ERR' 一律不算"没出现"）。
 *
 * 产出：reports/audit/round-7/frame-red-audit.md + cellplan-round7-frames-admissible.json
 * 用法：node scripts/qa/audit-frame-verdicts.mjs [--frames <shoot-results.json>] [--project <编译产物目录>]
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const FRAMES = resolve(REPO, arg("frames", "reports/audit/round-7/uidebt-shoot-ws/shoot-results.json"));
const PROJECT = resolve(REPO, arg("project", "apps/client/dist/build/mp-weixin"));
const PLAN = resolve(REPO, arg("plan", "reports/audit/round-7/frameplan-merged.json"));
const CELLPLAN = resolve(REPO, arg("cellplan", "reports/audit/round-7/cellplan-round7-frames.json"));
const OUT = resolve(REPO, "reports/audit/round-7");

for (const f of [FRAMES, PLAN, CELLPLAN]) {
  if (!existsSync(f)) { console.log("FRA_RESULT=FAIL reason=输入不存在 " + f); process.exit(2); }
}
if (!existsSync(join(PROJECT, "app.json"))) { console.log("FRA_RESULT=FAIL reason=--project 不是编译产物目录 " + PROJECT); process.exit(2); }

/* 产物里的 class 名片段全集：一次性扫完，后面只做集合判断。
   扫的是 js 渲染函数里的 class 字符串，所以既含 static class 也含模板拼出来的片段。 */
const ARTIFACT = (() => {
  const toks = new Set();
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!/\.(js|wxml|json)$/.test(e.name)) continue;
      let s = "";
      try { s = readFileSync(p, "utf8"); } catch { continue; }
      /* 类名片段必须允许连字符出现在 BEM 分隔符**之前**：
         [a-zA-Z]\w*(__|--)\w+ 会把 "today-card__photo" 只切成 "card__photo"，
         于是真在产物里的类名会被误判成"查无此 class"（本轮实测踩过）。 */
      for (const m of s.matchAll(/[a-zA-Z][\w-]*(?:__|--)[\w-]+/g)) toks.add(m[0]);
    }
  };
  walk(PROJECT);
  return toks;
})();

const fr = JSON.parse(readFileSync(FRAMES, "utf8"));
const plan = JSON.parse(readFileSync(PLAN, "utf8"));
const cp = JSON.parse(readFileSync(CELLPLAN, "utf8"));
const byId = new Map((fr.rows || []).map((r) => [r.id, r]));
const planById = new Map((plan.rows || []).map((r) => [r.id, r]));

const isBareSelector = (t) => /^[.#]?[\w-]+(?:\s*[>\s]\s*\.?[\w-]+)*$/.test(String(t || "").trim());
/* 文本/尺寸判点用的是"声明过的锚点 + WS 读到的真实文案/盒子"，
   这时 target 写的是人话（"toast 浮层"）不影响可判性——被读的是 anchor，不是 target。
   反过来数量型判点仍要求 target 本身就是单一选择器，否则就是在拿散文里的某个词代替整条判据。 */
const SECOND = /^(TEXT_MATCH|TEXT_CLEAN|TEXT_LEAK|TEXT_MISS|BOX_OK|BOX_SMALL|BOX_OFF)\b/;
const BAD = /PRESENT_UNEXPECTED|ABSENT_UNEXPECTED|PROBE_NO_ANSWER|TEXT_LEAK|TEXT_MISS|BOX_SMALL|BOX_OFF/;
const POSITIVE = /^PRESENT\(\d+\)$|^TEXT_(MATCH|CLEAN)\(|^BOX_OK\(/;

const rows = [];
for (const r of fr.rows || []) {
  if (r.status !== "SHOT" || r.stateApplied === false) continue;
  if (!String(r.landing || "").includes(String(r.route || ""))) continue;
  const bad = (r.checks || []).filter((c) => BAD.test(String(c.check)));
  if (!bad.length) continue;
  const problems = [];
  /* 正对照：同一帧里至少有一个机器判点"看到了东西"（PRESENT(n>0) 或 ABSENT_OK 里的 n>0 支），
     才说明这一帧页面确实渲染了、探针也确实通了。
     全是 0 的那种帧不能判红：物件没出现、页面整片没渲染、探针冷启动没答案，
     三者在数据上一模一样，把它们统一记成"产品未修"就是把测量错写进台账。 */
  const positive = (r.checks || []).filter((c) => POSITIVE.test(String(c.check)) || Number(c.count) > 0);
  const allZeroProbe = bad.every((c) => String(c.check) === "ABSENT_UNEXPECTED") && !positive.length;
  for (const c of bad) {
    const anchors = (c.anchors && c.anchors.length ? c.anchors : []).map((a) => String(a).replace(/^\./, ""));
    /* 文本/尺寸判点读的是 anchor，不是 target 那句人话；这时不因 target 是散文而扣住。 */
    const secondCarrier = SECOND.test(String(c.check)) && c.anchor;
    if (!secondCarrier && !isBareSelector(c.target)) problems.push("target 不是单一选择器：" + String(c.target).slice(0, 60));
    if (!anchors.length) problems.push("探针没有锚点（该条只能人读帧）：" + String(c.target).slice(0, 40));
    for (const a of anchors) if (!ARTIFACT.has(a)) problems.push("产物里查无此 class：." + a);
    if (secondCarrier && !ARTIFACT.has(String(c.anchor).replace(/^\./, ""))) problems.push("WS 读的锚点不在产物里：" + c.anchor);
    if (String(c.check).startsWith("PROBE_NO_ANSWER")) problems.push("探针没给数字答案：" + String(c.note || "").slice(0, 40));
  }
  if (allZeroProbe) problems.push("该帧没有任何正对照（所有机器判点都读成 0）：无法区分「物件不在」与「页面没渲染/探针没通」");
  rows.push({
    id: r.id, route: r.route, frame: r.frame, red: bad.length, hard: (r.checks || []).length,
    admissible: problems.length === 0, problems: [...new Set(problems)],
    wsApplied: r.wsApplied || [], wsFailed: r.wsFailed || [],
  });
}

const ok = rows.filter((x) => x.admissible);
const held = rows.filter((x) => !x.admissible);

/* 被扣住的判红不能只是"不落账"：上一轮已经把它写进台账了，留着不改就是拿一次测量错当结论。
   --restore-from 指到那次落账前的台账备份，逐条把 status 列恢复成取景前的值，
   并在 statusEvidence 里写明"这个判决被撤销是因为探针不可判，不是因为验过了没事"。
   撤销的是我自己的写入，不是别人已经成立的红。 */
const RESTORE = arg("restore-from", "");
const oldCell = new Map();
if (RESTORE) {
  const bf = resolve(REPO, RESTORE);
  if (!existsSync(bf)) { console.log("FRA_RESULT=FAIL reason=--restore-from 文件不存在 " + RESTORE); process.exit(2); }
  const bl = readFileSync(bf, "utf8").split(/\r?\n/);
  for (const l of bl) {
    if (!l.startsWith("|")) continue;
    const c = l.split("|").map((s) => s.trim());
    if (c.length < 12 || !/^MP-|^R2-|^[A-Z0-9-]+$/.test(c[1] || "")) continue;
    oldCell.set(c[1], c[6]);
  }
}
const heldReason = new Map(held.map((x) => [x.id, x.problems.join("；").slice(0, 170)]));

/* 只把可判的判红写进补丁计划；不可判的那些，台账收到的不是"待修复"，
   也不是"已修复"，而是"这条判点当前没有可判载体"——把缺口写清楚才谈得上补。 */
const patches = [];
for (const p of cp.patches || []) {
  if (!heldReason.has(p.id)) { patches.push(p); continue; }          // 非"被扣住的判红"条目原样保留
  if (p.col === 6 && /^待修复/.test(String(p.new || ""))) continue;  // 判红不落账
  if (p.col === 9) {
    patches.push({ id: p.id, col: 9, new: "帧级判点不作判据：" + heldReason.get(p.id) + "；帧 " + (byId.get(p.id) || {}).frame, why: "探针问的不是判据点名的物件，落账就是造假" });
    continue;
  }
  patches.push(p);
}
let restored = 0;
if (RESTORE) {
  for (const x of held) {
    const prev = oldCell.get(x.id);
    if (prev === undefined) { console.log("FRA_WARN 撤销无源：备份里查无 " + x.id); continue; }
    if (/已修复（帧级复验/.test(String(prev))) continue;   // 备份本身就是帧判决写出来的，不再往回退一层
    patches.push({ id: x.id, col: 6, new: prev, why: "撤销本轮判红：探针不可判（" + x.problems[0].slice(0, 60) + "），恢复取景前台账值，不冒充已验" });
    restored++;
  }
}
const dropped = (cp.patches || []).filter((p) => p.col === 6 && /^待修复/.test(String(p.new || ""))).length -
  patches.filter((p) => p.col === 6 && /^待修复/.test(String(p.new || ""))).length;
writeFileSync(join(OUT, "cellplan-round7-frames-admissible.json"), JSON.stringify({
  generatedAt: new Date().toISOString(), source: "audit-frame-verdicts.mjs",
  frames: FRAMES.split("reports/")[1], project: PROJECT.split("apps/")[1],
  artifactClassTokens: ARTIFACT.size, redRows: rows.length, admissible: ok.length, held: held.length,
  patches,
}, null, 1));

const md = ["# 判红可判性审计（帧 " + (fr.gitSha || "?") + " × 产物 " + PROJECT.split("/").pop() + "）", "",
  "- 判红条目：" + rows.length + " ｜ 可落账：" + ok.length + " ｜ 不作判据：" + held.length + " ｜ 撤销上一轮写入：" + restored + (RESTORE ? "（来源 " + RESTORE + "）" : "（未给 --restore-from，旧写入原样留在台账）"),
  "- 产物 class 片段全集：" + ARTIFACT.size + " 个（扫 " + PROJECT + "）", "",
  "## 可落账的判红", ""];
for (const x of ok) md.push("- `" + x.id + "` " + x.route + " 红 " + x.red + "/" + x.hard + "，交互=[" + x.wsApplied.join(",") + "]，帧 " + x.frame);
md.push("", "## 不作判据（探针问的不是这条判据点名的物件）", "");
for (const x of held) md.push("- `" + x.id + "` " + x.route + " 红 " + x.red + "/" + x.hard + "：\n  - " + x.problems.join("\n  - "));
writeFileSync(join(OUT, "frame-red-audit.md"), md.join("\n"));

console.log("FRA_REDLINES=" + rows.length + " 可落账=" + ok.length + " 不作判据=" + held.length + " 补丁剔掉=" + dropped + " 撤销旧写入=" + restored + "（守恒：" + (ok.length + held.length === rows.length ? "yes" : "NO") + "）");
for (const x of held) console.log("HELD " + x.id + " :: " + x.problems[0]);
console.log("FRA_RESULT=OK 已写 frame-red-audit.md 与 cellplan-round7-frames-admissible.json");
process.exit(ok.length + held.length === rows.length ? 0 : 2);
