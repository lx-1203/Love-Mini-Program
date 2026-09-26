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
const FRAME_LIST = arg("frames", "reports/audit/round-7/uidebt-shoot-ws/shoot-results.json").split(",").map((s) => resolve(REPO, s.trim())).filter(Boolean);
const PROJECT_LIST = arg("project", "apps/client/dist/build/mp-weixin").split(",").map((s) => resolve(REPO, s.trim())).filter(Boolean);
const FRAMES = FRAME_LIST[0], PROJECT = PROJECT_LIST[0];
const PLAN = resolve(REPO, arg("plan", "reports/audit/round-7/frameplan-merged.json"));
const CELLPLAN = resolve(REPO, arg("cellplan", "reports/audit/round-7/cellplan-round7-frames.json"));
const OUT = resolve(REPO, "reports/audit/round-7");

for (const f of [...FRAME_LIST, PLAN, CELLPLAN]) {
  if (!existsSync(f)) { console.log("FRA_RESULT=FAIL reason=输入不存在 " + f); process.exit(2); }
}
for (const p of PROJECT_LIST) {
  if (!existsSync(join(p, "app.json"))) { console.log("FRA_RESULT=FAIL reason=--project 不是编译产物目录 " + p); process.exit(2); }
}

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
  /* 帧可以来自多档产物（mock / real），"查无此 class"必须按并集判：
     real 档会 strip 掉 mock 专用的类名，只看一档会把另一档的真类名说成编造。 */
  for (const p of PROJECT_LIST) walk(p);
  return toks;
})();

/* 多份帧文件按传入顺序合并，后传的赢（档内自我复跑同理）。
   与 verdict-from-frames 同一口径，否则两边看到的"这一行的帧"会不一致。 */
const fr = { rows: [], gitSha: "", project: PROJECT_LIST.join(",") };
const seenIdx = new Map();
const srcLog = [];
let gitShaFirst = "";
for (const f of FRAME_LIST) {
  const one = JSON.parse(readFileSync(f, "utf8"));
  if (!gitShaFirst) gitShaFirst = one.gitSha || "";
  for (const r of (one.rows || [])) {
    const k = r.id;
    if (seenIdx.has(k)) {
      const old = fr.rows[seenIdx.get(k)];
      console.log("FRA_WARN 同一 id 后传帧覆盖先传：" + k + " " + (old.frameFrom || old.frame || "?") + " → " + (r.frame || "?"));
      fr.rows[seenIdx.get(k)] = r;
    } else { seenIdx.set(k, fr.rows.length); fr.rows.push(r); }
  }
  srcLog.push((f.split("reports/audit/round-7/")[1] || f) + "@" + (one.gitSha || "?") + "/ident=" + (one.identitySeen || "?") + "/rows=" + (one.rows || []).length);
}
fr.gitSha = gitShaFirst;
console.log("FRA_SOURCES " + srcLog.join(" ｜ "));
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
const restoreLog = [];
if (RESTORE) {
  /* 撤销要分三种去向，不能一律"退回备份值"：
       · 备份是取景前的普通状态 ⇒ 照抄回去（这才是撤销）。
       · 备份本身是上一轮的帧级**绿** ⇒ 也照抄：本轮这条红是被撤销的对象，
         留着红不管等于"撤销"只写在日志里（第一版就在这里漏了：`continue` 让红留在台账上）。
       · 备份本身是上一轮的帧级**判红** ⇒ 绝不能照抄：那会把"本轮判红不可判"
         重新写成一条判红，只是换了轮次。改写成中性的"帧级判点不可判"，
         状态仍是待修复（不因为撤了红就变绿），但不再冒充"产品未修"这条结论。 */
  const GREEN_BEFORE = /^已修复（帧级复验/;
  const RED_BEFORE = /^待修复（帧级复验判红/;
  for (const x of held) {
    const prev = oldCell.get(x.id);
    if (prev === undefined) { console.log("FRA_WARN 撤销无源：备份里查无 " + x.id); restoreLog.push([x.id, "备份查无 ⇒ 未动"]); continue; }
    if (RED_BEFORE.test(String(prev))) {
      patches.push({
        id: x.id, col: 6,
        new: "待修复（帧级判点不可判：本轮与上一轮的帧级判红一并撤销，欠的是能问对物件的探针/载体，不是产品未修；详见 reports/audit/round-7/frame-red-audit.md）",
        why: "备份值本身也是帧级判红 ⇒ 照抄会把撤销写成一条新判红",
      });
      restoreLog.push([x.id, "备份也是判红 ⇒ 改写为『帧级判点不可判』"]);
    } else {
      patches.push({ id: x.id, col: 6, new: prev, why: "撤销本轮判红：探针不可判（" + x.problems[0].slice(0, 60) + "），恢复取景前台账值，不冒充已验" + (GREEN_BEFORE.test(String(prev)) ? "（备份那格是上一轮的帧级绿，撤销后回到它）" : "") });
      restoreLog.push([x.id, GREEN_BEFORE.test(String(prev)) ? "备份是帧级绿 ⇒ 回到那条绿" : "回到取景前的账值"]);
    }
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
md.push("", "## 撤销去向（每条被扣住的判红，台账那一格被写成什么）", "");
for (const [id, how] of restoreLog) md.push("- `" + id + "` → " + how);
const rewrote = restoreLog.filter(([, h]) => /改写为/.test(h)).length;
md.push("", "- 合计 " + restoreLog.length + " 条，其中 " + rewrote + " 条因『备份本身也是判红』改写成不可判，其余回到取景前的账值。");
writeFileSync(join(OUT, "frame-red-audit.md"), md.join("\n"));

console.log("FRA_REDLINES=" + rows.length + " 可落账=" + ok.length + " 不作判据=" + held.length + " 补丁剔掉=" + dropped + " 撤销旧写入=" + restored + "（守恒：" + (ok.length + held.length === rows.length ? "yes" : "NO") + "）");
console.log("FRA_RESTORE_CONSERVE 被扣住=" + held.length + " 有去向记录=" + restoreLog.length + " 改写为不可判=" + rewrote + " 备份查无=" + restoreLog.filter(([, h]) => /查无/.test(h)).length +
  "（守恒：" + (!RESTORE ? "未给 --restore-from ⇒ 本轮不撤销，不适用" : restoreLog.length === held.length ? "yes" : "NO ⇒ 有红既没落账也没撤销，台账会留着一条没人认领的判决") + "）");
for (const x of held) console.log("HELD " + x.id + " :: " + x.problems[0]);
console.log("FRA_RESULT=OK 已写 frame-red-audit.md 与 cellplan-round7-frames-admissible.json");
process.exit(ok.length + held.length === rows.length ? 0 : 2);
