#!/usr/bin/env node
/* 冻结件 vs 活件的逐条差异 + 通过率双口径。
   为什么需要：本轮"通过率"有两个都成立但不同义的数（名义 EXECUTED / 有帧 EXECUTED），
   而且 T4 重采会**改判**（不只是补帧）—— 21:33 起观察到的分布就从 593/374 漂到 590/377。
   所以任何"通过率"数字都必须同时说明：比的是哪一份、按什么键比、几行变了。
   本工具一次算清四件事并自带守恒：
   1) 冻结件与活件按 `suite|manifest|id` 复合键对齐，列出状态迁移矩阵（含"只在其中一边"的行）；
   2) 有帧口径：EXECUTED 里证据数组真有 .png 且**文件确在盘上**的有几条（不含只带 (ERROR:…) 尾注的）；
   3) 双口径通过率并列打印；
   4) 复合键唯一性（本仓踩过"按裸 id 去重会低估"的坑，跨套编号复用是设计使然，见 §57）。
   用法：node scripts/qa/verify-exec-delta.mjs [活件] [冻结件]
         默认活件 = reports/audit/round-6/interact/exec-results.json
              冻结件 = .zcode/tmp/round6-exec/exec-results.tail-*.json（取 mtime 最新一份）
*/
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const LIVE = process.argv[2] ? resolve(process.argv[2]) : join(REPO, "reports/audit/round-6/interact/exec-results.json");
let FRZ = process.argv[3] ? resolve(process.argv[3]) : null;
if (!FRZ) {
  const dir = join(REPO, ".zcode/tmp/round6-exec");
  const cands = readdirSync(dir).filter((f) => /^exec-results\.tail-[0-9a-f]{16}\.json$/.test(f))
    .map((f) => ({ f, m: statSync(join(dir, f)).mtimeMs })).sort((a, b) => b.m - a.m);
  if (!cands.length) { console.log("DELTA=FAIL reason=找不到任何 exec-results.tail-<sha16>.json 冻结件（T2 没跑过？）"); process.exit(2); }
  FRZ = join(dir, cands[0].f);
}
if (!existsSync(LIVE) || !existsSync(FRZ)) { console.log(`DELTA=FAIL reason=文件不存在 live=${existsSync(LIVE)} frozen=${existsSync(FRZ)}`); process.exit(2); }

const load = (p) => JSON.parse(readFileSync(p, "utf8"));
const liveDoc = load(LIVE), frzDoc = load(FRZ);
const rows = (d) => d.results || [];
const key = (r) => `${r.suite}|${r.manifest}|${r.id}`;

/** 证据串里"真有一张在盘上的帧"才算有帧；(ERROR:…) / (12345B) 尾注一律先剥。 */
function framePaths(r) {
  const out = [];
  for (const e of r.evidence || []) {
    const s = typeof e === "string" ? e : (e && (e.path || e.file)) || "";
    if (!s.includes(".png")) continue;
    const cleaned = s.replace(/\((\d+)B\)\s*$/, "").replace(/\s*\(ERROR:[^)]*\)\s*$/, "").trim();
    if (cleaned) out.push(cleaned);
  }
  return out;
}
const onDisk = (p) => {
  const abs = p.startsWith("/") || /^[A-Za-z]:/.test(p) ? p : join(REPO, p);
  try { return existsSync(abs); } catch { return false; }
};

function histo(arr) { const h = {}; for (const r of arr) h[r.status] = (h[r.status] || 0) + 1; return h; }
function withFrames(arr) {
  let any = 0, onDiskN = 0;
  for (const r of arr.filter((x) => x.status === "EXECUTED")) {
    const ps = framePaths(r);
    if (ps.length) any++;
    if (ps.some(onDisk)) onDiskN++;
  }
  return { any, onDisk: onDiskN };
}

const L = rows(liveDoc), F = rows(frzDoc);
const lKey = new Map(L.map((r) => [key(r), r])), fKey = new Map(F.map((r) => [key(r), r]));
const dupL = L.length - lKey.size, dupF = F.length - fKey.size;
const migrated = new Map();
for (const [k, r] of lKey) {
  const o = fKey.get(k);
  if (!o) continue;
  if (o.status !== r.status) {
    const t = `${o.status}→${r.status}`;
    migrated.set(t, (migrated.get(t) || 0) + 1);
  }
}
const onlyLive = [...lKey.keys()].filter((k) => !fKey.has(k));
const onlyFrz = [...fKey.keys()].filter((k) => !lKey.has(k));

console.log(`LIVE=${LIVE.replace(REPO + "/", "")} rows=${L.length} gitSha=${liveDoc.gitSha ?? "?"} updatedAt=${liveDoc.updatedAt ?? "?"}`);
console.log(`FROZEN=${FRZ.replace(REPO + "/", "")} rows=${F.length} gitSha=${frzDoc.gitSha ?? "?"}`);
console.log(`DUP_COMPOSITE_KEY live=${dupL} frozen=${dupF}${dupL || dupF ? "  ← 主键不唯一，按 id 去重会串条目" : "（复合主键唯一 ✔）"}`);
console.log(`HISTO_LIVE=${JSON.stringify(histo(L))}`);
console.log(`HISTO_FROZEN=${JSON.stringify(histo(F))}`);
console.log(`ONLY_IN_LIVE=${onlyLive.length} ONLY_IN_FROZEN=${onlyFrz.length}`);
onlyLive.slice(0, 5).forEach((k) => console.log(`  +LIVE ${k} status=${lKey.get(k).status}`));
onlyFrz.slice(0, 5).forEach((k) => console.log(`  +FRZ  ${k} status=${fKey.get(k).status}`));
const migText = [...migrated.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0] + "=" + e[1]).join("  ");
console.log("MIGRATIONS=" + (migrated.size ? migText : "(无)（同一键在两份文件之间的状态迁移）"));

const wL = withFrames(L), wF = withFrames(F);
const exL = L.filter((r) => r.status === "EXECUTED").length, exF = F.filter((r) => r.status === "EXECUTED").length;
const pct = (a, b) => (b ? `${((100 * a) / b).toFixed(1)}%` : "n/a");
console.log(`PASSRATE_FROZEN nominal=${exF}/${F.length}=${pct(exF, F.length)}  引用了png=${wF.any}=${pct(wF.any, F.length)}  png确在盘上=${wF.onDisk}=${pct(wF.onDisk, F.length)}`);
console.log(`PASSRATE_LIVE   nominal=${exL}/${L.length}=${pct(exL, L.length)}  引用了png=${wL.any}=${pct(wL.any, L.length)}  png确在盘上=${wL.onDisk}=${pct(wL.onDisk, L.length)}`);
console.log("NOTE 三个口径的差：\"引用了png\" 只看字符串（会把死引用算进来），\"确在盘上\" 才核文件；报通过率必须点名用的是哪一个。");

const sumHist = Object.values(histo(L)).reduce((a, b) => a + b, 0);
if (sumHist !== L.length) { console.log(`DELTA=FAIL reason=直方图合计 ${sumHist} ≠ rows ${L.length}`); process.exit(1); }
if (dupL || dupF) { console.log("DELTA=FAIL 复合主键有重复"); process.exit(1); }
console.log(`DELTA=OK 守恒 ${sumHist}=${L.length}；报告口径要求：并列给出 frozen 与 live 两组数，并点名 ONLY_IN_* 与迁移矩阵`);
process.exit(0);
