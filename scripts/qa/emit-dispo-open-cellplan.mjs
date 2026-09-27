#!/usr/bin/env node
/* 把 `verify-status-vs-disposition` 报出的"状态列写着已修复、处置列却还欠东西"的行，
   生成一份把状态**改成真实状态**的台账格子计划（#72 的一层）。

 为什么要有这个脚本：那 13 行不是判据错了，是第 6 列写糊了 —— 下一轮的门会把 `已修复`
 当结案读，于是"欠人复验/欠帧"这件事永远不会再有人认领。修法只有两种：
   (a) 把欠款挂进取景配方/登记表（行不动）；
   (b) 把第 6 列改成真实状态（`已修复待复验` = 改动已落但复验没做）。
 本脚本走 (b)，并且**只从门自己的输出派生**：门说什么标记，就按标记决定新状态，
 不手抄 id（手抄一份名单=下一次门改了口径，计划还在按旧名单改判）。

 用法：node scripts/qa/emit-dispo-open-cellplan.mjs [--out scripts/qa/cellplan-round7-dispo-open.json]
      之后照收口波第 6 步：merge-cellplans.mjs --plan <这份> （先 dry 再 --apply）
*/
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
{
  const KNOWN = ["out", "gate", "ledger"];
  const bad = process.argv.slice(2).filter((a) => a.startsWith("--") && !KNOWN.includes(a.slice(2)));
  if (bad.length) { console.log("DISPOPLAN_RESULT=FAIL reason=不认识的旗标 " + bad.join(",")); process.exit(2); }
}
const OUT = resolve(REPO, arg("out", "scripts/qa/cellplan-round7-dispo-open.json"));
const GATE = arg("gate", "scripts/qa/verify-status-vs-disposition.mjs");
const NODE = process.execPath;

let out = "";
try {
  out = execFileSync(NODE, [resolve(REPO, GATE)], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
} catch (e) {
  /* 这条门按设计就是 advisory 退出码非 0 的（它报的就是"有行自相矛盾"）。
     只认它打出来的 DISPO_HIT 明细，退出码在这里不代表读不到。 */
  if (!e || typeof e.stdout !== "string" || !/DISPO_HIT/.test(e.stdout)) throw e;
  out = e.stdout;
}

/* 标记 → 新状态：只列有明确去向的口径；认不出的标记一律不自动改（宁可留红给人看）。 */
const MAP = [
  { re: /需人复验|待复验|仍欠|状态停在/, to: "已修复待复验", why: "处置/证据列自己写着还欠复验 ⇒ 第 6 列不能停在裸「已修复」（那会被下一轮当结案读）。改成 已修复待复验，欠款由取景配方与复验腿认领。" },
];
const SKIP = [];
const patches = [];
const seen = new Set();
for (const line of out.split(/\r?\n/)) {
  const m = line.match(/^\s*DISPO_HIT\s+(\S+)\s+\[([^\]]*)\]\s+标记=(\S+)\s+在=(\S+)/);
  if (!m) continue;
  const [, id, now, marker, where] = m;
  if (seen.has(id)) { SKIP.push(`${id} :: 门里出现了两次（同一行被两个标记命中，须先修门）`); continue; }
  seen.add(id);
  if (/^已修复待复验/.test(now)) { SKIP.push(`${id} :: 状态本来就是开放态（${now}），不需要改`); continue; }
  const hit = MAP.find((x) => x.re.test(marker));
  if (!hit) { SKIP.push(`${id} :: 标记「${marker}」没有映射规则 ⇒ 不自动改判，留给人判`); continue; }
  if (now === "并入-不另立案") { SKIP.push(`${id} :: 并案行的状态词是「并入-不另立案」而不是已修复 ⇒ 欠款应挂在并案目标那一行，本行不改`); continue; }
  if (!/^已修复$/.test(now)) { SKIP.push(`${id} :: 状态=${now} 不是裸「已修复」⇒ 不动`); continue; }
  patches.push({ id, col: 6, new: hit.to, why: `门 verify-status-vs-disposition 现量：标记=${marker}（在${where}列）⇒ 原状态「${now}」与处置自相矛盾。` + hit.why });
}
if (!patches.length) {
  console.log("DISPOPLAN_RESULT=FAIL reason=一条都没派生出来（门输出格式变了？跳过明细如下）");
  for (const s of SKIP) console.log("  SKIP " + s);
  process.exit(2);
}
const json = {
  note: "由 scripts/qa/emit-dispo-open-cellplan.mjs 从 verify-status-vs-disposition 的现场输出派生（不是手抄名单）。方向是**开账**不是销账：把裸「已修复」改成 已修复待复验，让下一轮还能认领这些复验债。",
  source: `node ${GATE}`,
  generatedAt: new Date().toISOString(),
  patches,
};
if (existsSync(OUT) && !process.argv.includes("--force")) {
  const prev = JSON.parse(readFileSync(OUT, "utf8"));
  if ((prev.patches || []).length !== patches.length) console.log("DISPOPLAN_WARN 目标文件已存在且条数不同（旧=" + (prev.patches || []).length + " 新=" + patches.length + "）⇒ 仍要覆盖请加 --force；本轮按" + (patches.length < (prev.patches || []).length ? "保留旧文件并停" : "覆盖") + "处理");
  if ((prev.patches || []).length < patches.length) { console.log("DISPOPLAN_RESULT=FAIL reason=门又长出新的自相矛盾行，不覆盖旧计划（先看清再写）"); process.exit(2); }
}
writeFileSync(OUT, JSON.stringify(json, null, 2) + "\n");
console.log(`DISPOPLAN 派生格子=${patches.length} 跳过=${SKIP.length} → ${OUT.replace(REPO + "/", "")}`);
for (const p of patches) console.log("  PLAN " + p.id + " 第6列 → " + p.new);
for (const s of SKIP) console.log("  SKIP " + s);
console.log("DISPOPLAN_RESULT=OK");
