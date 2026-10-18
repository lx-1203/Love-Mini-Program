#!/usr/bin/env node
/**
 * render-defects.mjs —— 把泳道缺陷卡渲成交付件 defects-R<n>.md（MP-FIDELITY §10 的 §3 底稿）。
 *
 * 为什么不手工写这份 md：轮次至少三轮，每轮 100+ 条，手写必然出现"报告与泳道原件不是同一份事实"。
 * 这里只做一件事：**逐字搬运**卡上的字段，不改写、不合并、不判断。
 * 判"有没有漏条目"由 verify-finder-lane.mjs 负责，这份渲染只保证搬运不失真。
 *
 * 用法：node scripts/qa/render-defects.mjs --lanes tmp/qa/lanes/R1 --fixlist reports/.../fixlist-R1.json
 *        --round R1 --out reports/.../defects-R1.md
 * 退出码：0 写成就 0；1 卡片里有点名不到的缺陷（fixlist 与卡对不上）——那是账目错，不许静默出 md。
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] && !String(process.argv[i + 1]).startsWith("--") ? process.argv[i + 1] : d; };
const rel = (p) => p.split(sep).join("/");
const RK = "RENDERDEFECTS_RESULT";

const lanesDir = resolve(arg("lanes", ""));
const fixlistPath = arg("fixlist", "");
const ROUND = arg("round", "");
const outPath = resolve(arg("out", ""));
if (!lanesDir || !existsSync(lanesDir) || !ROUND || !outPath) {
  console.log(`${RK}=NOT-EVIDENCED reason=bad-args lanes=${arg("lanes", "")} round=${ROUND || "(没传)"} out=${arg("out", "")}`);
  process.exit(1);
}

/* 卡片字段是 `- key: value`；中文键名（现象/建议改法/理想图依据）照卡上原样。
   解析必须**一条一条切**，不能"字段往后挂"：R1 实测 103 个 `## FRAME` 标题装了 119 条缺陷
   （同一帧多条时标题只写一次），往后挂会让同块第 2 条起把 frame_hash 挂到前一条身上——
   帧哈希是"这条到底看过哪张图"的唯一凭据，挂错等于伪造见证件。 */
const FIELDS = ["frame_hash", "defect_id", "page", "axis", "severity", "fix_category", "source_citation", "理想图依据", "现象", "建议改法", "修复类别", "源码证据"];
const ALIAS = { 修复类别: "fix_category", 源码证据: "source_citation" };
const rows = [];
const files = readdirSync(lanesDir).filter((f) => f.endsWith(".md") && !/\.brief\.md$/i.test(f)).sort();
for (const f of files) {
  const txt = readFileSync(join(lanesDir, f), "utf8").replace(/\r\n/g, "\n");
  let rec = null, lastFrame = "";
  const flush = () => { if (rec) rows.push(rec); rec = null; };
  for (const line of txt.split("\n")) {
    const fm = line.match(/^##\s*FRAME\s+(\S+)/);
    if (fm) { lastFrame = fm[1]; continue; }
    const kv = line.match(/^-\s*([^:]+?)\s*:\s*(.*)$/);
    if (!kv) continue;
    const key = ALIAS[kv[1].trim()] || kv[1].trim();
    const val = kv[2].trim();
    if (!FIELDS.includes(key)) continue;
    /* 同一条缺陷的字段是连续跑的；frame_hash 与 defect_id 各只应出现一次，
       再见到第二个就是下一条开始了。 */
    if (rec && ((key === "frame_hash" && rec.frame_hash) || (key === "defect_id" && rec.defect_id))) flush();
    if (!rec) rec = { lane: f.replace(/\.md$/, ""), frame: lastFrame, defect_id: "", frame_hash: "" };
    if (!rec[key]) rec[key] = val;
  }
  flush();
}
if (!rows.length) { console.log(`${RK}=NOT-EVIDENCED reason=no-defect-cards dir=${rel(lanesDir)}（空卡目录不许渲出一份"零缺陷"的 md）`); process.exit(1); }
/* 自证：每条必须有 id 和帧哈希，否则这份 md 会把"看了哪张图"洗掉。
   R1 第一发实测 119 条全空 id（我把 defect_id 漏在字段白名单外，标题渲染成 `###  P0 / 层级遮挡`），
   没有这一问就是静默出一整份没有可追溯性的交付件。 */
const noId = rows.filter((r) => !r.defect_id).length;
const noHash = rows.filter((r) => !r.frame_hash).length;
const noFrame = rows.filter((r) => !r.frame).length;
if (noId || noHash || noFrame) {
  console.log(`${RK}=NOT-EVIDENCED reason=字段缺失 defect_id空=${noId} frame_hash空=${noHash} 帧路径空=${noFrame}（检 ${rows.length} 条）`);
  process.exit(1);
}

/* 批次归属：从 fixlist 反查 defect_id → batch_id。对不上就是账目错（卡被改过、或聚合器漏读）。 */
const batchOf = new Map();
let unbatched = 0;
if (fixlistPath && existsSync(resolve(fixlistPath))) {
  const fl = JSON.parse(readFileSync(resolve(fixlistPath), "utf-8"));
  for (const b of fl.batches || []) for (const id of b.defects || []) batchOf.set(id, b.batch_id);
  for (const r of rows) if (!batchOf.has(r.defect_id)) unbatched++;
}

const sevCount = {}, axisCount = {}, pageSet = new Set(), frameSet = new Set();
for (const r of rows) {
  sevCount[r.severity || "?"] = (sevCount[r.severity || "?"] || 0) + 1;
  axisCount[r.axis || "?"] = (axisCount[r.axis || "?"] || 0) + 1;
  if (r.page) pageSet.add(r.page);
  if (r.frame) frameSet.add(r.frame);
}
const byPage = new Map();
for (const r of rows) { const k = r.page || "(未点名页面)"; if (!byPage.has(k)) byPage.set(k, []); byPage.get(k).push(r); }

const L = [];
L.push(`# ${ROUND} 逐帧缺陷清单（由泳道缺陷卡逐字渲染，生成器 scripts/qa/render-defects.mjs）`);
L.push(``);
L.push(`- 缺陷条数=${rows.length}　涉及页面=${byPage.size}　涉及帧=${frameSet.size}　泳道卡=${files.length}`);
L.push(`- 严重度分布：${Object.entries(sevCount).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join("　")}`);
L.push(`- 轴分布：${Object.entries(axisCount).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join("　")}`);
if (fixlistPath) L.push(`- 批次归属：${batchOf.size} 个批次收录，**卡上有而 fixlist 没有的=${unbatched}**${unbatched ? "（这是账目错，见退出码）" : ""}`);
L.push(``);
for (const [page, list] of [...byPage.entries()].sort()) {
  L.push(`## ${page}（${list.length} 条）`);
  for (const r of list) {
    L.push(``);
    L.push(`### ${r.defect_id}　${r.severity || "?"} / ${r.axis || "?"}　批次 ${batchOf.get(r.defect_id) || "-"}`);
    L.push(`- 帧：\`${r.frame}\`（sha16=\`${r.frame_hash || "-"}\`）`);
    if (r.source_citation) L.push(`- 源码证据：\`${r.source_citation}\``);
    if (r.理想图依据) L.push(`- 理想图依据：${r.理想图依据}`);
    if (r.现象) L.push(`- 现象：${r.现象}`);
    if (r.建议改法) L.push(`- 建议改法：${r.建议改法}`);
    if (r.fix_category) L.push(`- 修复类别：${r.fix_category}`);
  }
  L.push(``);
}
writeFileSync(outPath, L.join("\n") + "\n", "utf8");
console.log(`${RK}=WROTE file=${rel(REPO === outPath.slice(0, REPO.length) ? outPath.slice(REPO.length + 1) : outPath)} 条数=${rows.length} 页面=${byPage.size} 帧=${frameSet.size} 无批次=${unbatched}`);
if (unbatched) { console.log(`${RK}=PARTIAL reason=${unbatched} 条缺陷卡在泳道里写了但 fixlist 没收录 ⇒ 聚合与卡片不是同一份事实`); process.exit(1); }
