#!/usr/bin/env node
/* 把 NEEDS_UI_FRAME 欠款按「源文件」切成 lane 简报，交给并行 agent 写取景配方。
 *
 * 为什么按源文件切而不是按页切：一个页的欠款往往散在多个组件里，而配方要写
 * 「selector 在哪一行、期望值是什么」——那必须读同一个文件。按文件切，lane 之间不会
 * 抢同一个源文件（本仓库吃过多次两个 writer 撞一个文件的亏）。
 *
 * 用法：node scripts/qa/split-frame-debt-lanes.mjs [--lanes 5] [--max 16]
 * 输出：reports/audit/round-7/frameplan-lane-<X>-items.json（含每条的判据原文 + 该 lane 的文件清单）
 * 守恒：所有 lane 的条目并集必须等于欠款总数，且不重复。 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const N = Math.max(1, Number(arg("lanes", "5")));
const MAX = Math.max(1, Number(arg("max", "16")));
const SRC = resolve(REPO, "reports/audit/round-7/ui-frame-debt-classes.json");
const j = JSON.parse(readFileSync(SRC, "utf8"));
const rows = j.rows.slice();
if (!rows.length) { console.log("SPLIT_RESULT=FAIL reason=欠款清单为空，切了个寂寞"); process.exit(2); }

/* 同一文件的条目必须落在同一个桶里（配方要读同一个源文件，不能两个 lane 撞一个文件）；
   文件之间再按「哪个桶最空」贪心分配，并保证单桶不超过 MAX。 */
rows.sort((a, b) => (a.src || "").localeCompare(b.src || "") || a.id.localeCompare(b.id));
const groups = new Map();
for (const r of rows) {
  const key = r.src || "(未知源文件:" + r.id + ")";
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(r);
}
const lanes = Array.from({ length: N }, () => ({ items: [], files: new Map() }));
/* 大组先装，避免小组把桶填满后大组无处可去 */
for (const [key, grp] of [...groups.entries()].sort((a, b) => b[1].length - a[1].length)) {
  if (grp.length > MAX) { console.log("SPLIT_RESULT=FAIL reason=文件 " + key + " 独占 " + grp.length + " 条 > 单桶上限 " + MAX + " ⇒ 加大 --max"); process.exit(2); }
  const l = lanes.filter((x) => x.items.length + grp.length <= MAX).sort((a, b) => a.items.length - b.items.length)[0];
  if (!l) { console.log("SPLIT_RESULT=FAIL reason=" + N + " 个桶都放不下文件 " + key + "（" + grp.length + " 条）⇒ 加 --lanes 或 --max"); process.exit(2); }
  for (const r of grp) { l.items.push(r); l.files.set(key, (l.files.get(key) || 0) + 1); }
}
const flat = lanes.flatMap((l) => l.items.map((r) => r.id));
const dup = flat.length - new Set(flat).size;
if (flat.length !== rows.length || dup) { console.log("SPLIT_RESULT=FAIL reason=守恒不成立 分出去=" + flat.length + " 欠款=" + rows.length + " 重复=" + dup); process.exit(2); }

const names = "ABCDEFGH";
const dir = dirname(SRC);
lanes.forEach((l, i) => {
  const tag = names[i];
  const out = resolve(dir, "frameplan-lane-" + tag + "-items.json");
  writeFileSync(out, JSON.stringify({ lane: tag, generatedAt: new Date().toISOString(), total: l.items.length, files: [...l.files.keys()], items: l.items }, null, 1));
  console.log("LANE " + tag + " items=" + l.items.length + " files=" + l.files.size + " → " + basename(out));
});
console.log("SPLIT_RESULT=OK lanes=" + N + " items=" + flat.length + "/" + rows.length + " 重复=" + dup);
