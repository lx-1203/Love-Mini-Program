#!/usr/bin/env node
/* 修掉"拿截断简报当底改写"的 lane 条目，并给出**逐 id 覆盖守恒**。
   为什么单独一个脚本：这类条目不该由 lane 自己重写第二遍（它上次就是照着截断文本写的），
   也不该我手改 16 条（手改没有守恒核对）。这里只做一件没有判断含量的事：
   以判据台现文为底，把 lane 已经查实的 selector + file:line 作为一句附注接在原文后面 ——
   原文一个字不丢，动词自然全留，selector 照样被 classesOf / tapTarget 读到。
   顺手把上一波已落盘的根目录 lane 打上 .applied（否则递归扫描会把它们当新交付整份拒收，
   真正的拒收原因就被淹在噪声里）。
   用法：node scripts/qa/repair-tapfix-truncation.mjs [--apply]（默认只看计划） */
import { readFileSync, writeFileSync, existsSync, renameSync, readdirSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { execSync } from "node:child_process";

const REPO = resolve(import.meta.dirname, "..", "..");
const APPLY = process.argv.includes("--apply");
const OPS = resolve(REPO, "reports/audit/round-6/ops");
const R7 = resolve(REPO, "reports/audit/round-7");
const CENSUS = join(R7, "tap-target-census.json");

const opsCache = new Map();
const opsCase = (mf, id) => {
  const key = String(mf || "").replace(/\.json$/, "");
  if (!opsCache.has(key)) {
    const f = join(OPS, key + ".json");
    opsCache.set(key, existsSync(f) ? new Map((JSON.parse(readFileSync(f, "utf8")).cases || []).map((c) => [c.id, c])) : null);
  }
  const m = opsCache.get(key);
  return m ? (m.get(id) || null) : null;
};
const norm = (s) => String(s || "").replace(/[\s　]+/g, "");
const lostChars = (a, b) => {
  const bag = new Map();
  for (const ch of norm(a)) if (/[\p{Script=Han}\p{L}\p{N}]/u.test(ch)) bag.set(ch, (bag.get(ch) || 0) + 1);
  for (const ch of norm(b)) if (bag.get(ch) > 0) bag.set(ch, bag.get(ch) - 1);
  let n = 0; for (const [, k] of bag) if (k > 0) n += k;
  return n;
};
const walk = (dir) => {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (/^tapfix-lane-.*\.json$/.test(e.name)) out.push(p);
  }
  return out;
};

let renamed = 0;
for (const f of readdirSync(R7)) {
  const p = join(R7, f);
  if (/^tapfix-lane-.*\.json$/.test(f) && statSync(p).isFile()) {
    if (APPLY) renameSync(p, p + ".applied");
    renamed++;
    console.log("REPAIR_RENAMED " + f + " → " + f + ".applied（上一波已落盘，递归扫描不该再判它）");
  }
}

const lanes = walk(R7);
let fixed = 0, kept = 0, dropped = 0;
const coveredIds = new Set();
for (const lf of lanes) {
  const lane = JSON.parse(readFileSync(lf, "utf8"));
  let touched = 0;
  for (const c of (lane.cases || [])) {
    const oc = opsCase(c.manifest, c.id);
    if (!oc) { dropped++; console.log("REPAIR_NOOPS " + lane.lane + " " + c.id + " 判据台里没有这条 ⇒ 不采信"); continue; }
    const full = String(oc.action || "");
    const lost = lostChars(full, c.newAction);
    if (lost > 3) {
      const rebuilt = full + "（本条点名的交互目标 " + c.selector + "，证据 " + c.file + ":" + c.line + "）";
      if (lostChars(full, rebuilt) > 3) { console.log("REPAIR_IMPOSSIBLE " + c.id + " 连原文都装不回，跳过"); dropped++; continue; }
      c.newAction = rebuilt;
      c.oldAction = full;
      c.repairedBy = "repair-tapfix-truncation（原文为底 + selector 附注，不丢一个字）";
      touched++; fixed++;
    } else kept++;
    coveredIds.add(c.id);
    if (!/\.json$/.test(String(c.manifest))) coveredIds.add(c.manifest + "|" + c.id);
    coveredIds.add(String(c.manifest).replace(/\.json$/, "") + "|" + c.id);
  }
  for (const u of (lane.unverifiable || [])) coveredIds.add(String(u.manifest).replace(/\.json$/, "") + "|" + u.id);
  if (touched) {
    if (APPLY) writeFileSync(lf, JSON.stringify(lane, null, 1) + "\n");
    console.log("REPAIR_LANE " + lf.replace(R7 + "/", "").split("\\").join("/") + " 重建成文=" + touched);
  }
}

/* 逐 id 覆盖守恒：普查点名的每一条，要么被某个 lane 采信，要么进 unverifiable，
   一条都不能凭空蒸发——"数字对上了"不等于"每条都有着落"。
   归属**按 missing[].manifest 而不是 page.manifest**：一页的用例可能摊在好几个 ops 文件里
   （实测 circles/index 的 CI08 在 次要18.json，而 page.manifest 写的是 SUBPACKAGES-CIRCLES-CIRCLES-INDEX.json），
   拿页级那个名字当键会把已归置的条目误报成缺口，反过来也会掩盖真缺口。 */
const census = JSON.parse(readFileSync(CENSUS, "utf8"));
const uncovered = [];
let want = 0;
for (const p of (census.pages || [])) {
  for (const m of (p.missing || [])) {
    const mf = String(m.manifest || p.manifest || "").replace(/\.json$/, "");
    want++;
    if (!coveredIds.has(mf + "|" + m.id)) uncovered.push(mf + "|" + m.id);
  }
}
console.log("REPAIR_MODE=" + (APPLY ? "APPLY" : "DRY") + " 待重建=" + fixed + " 原本合格=" + kept + " 无处可归=" + dropped +
  " lane 文件=" + lanes.length + " 改名=" + renamed);
console.log("REPAIR_COVERAGE 普查要点名=" + want + " 已归置=" + (want - uncovered.length) + " 仍缺口=" + uncovered.length);
if (uncovered.length) console.log("REPAIR_UNCOVERED " + uncovered.slice(0, 30).join(" "));
process.exit(uncovered.length ? 2 : 0);
