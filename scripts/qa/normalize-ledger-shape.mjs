#!/usr/bin/env node
/* 台账形状归一化（无损、可核）。

   动因：reports/audit/round-6/issue-matrix.md 表头声明 11 列，实测 226 条数据行里
   只有 161 条真是 11 列，其余 55 条 4 列、10 条 6 列。后果不是"不好看"，而是
   **任何按列取值的读者都看不见这 65 条**：status / severity 取不到，排产、门禁、
   改判核对全部只按可解析子集算 —— "有行却等于没行"。
   而 verify-ledger.mjs 此前根本不解析表结构（grep `split('|')` 0 命中），所以这个洞不会被任何门禁报出来。

   刻意保守的三条：
   1. 不改写任何原文。识别得出枚举含义才搬，认不出就不搬。
   2. 原每一格的文本**全部**另附在「处置」列里（用 ` / ` 连接，不引入竖线 —— 本表纪律是单元格内不得有 |）。
      也就是说：既把 severity/status/证据 抬到正确列，又不丢掉任何一个字。
   3. 落盘前自判守恒：ID 多重集不变、行数不变、且每一格原文都必须出现在新行文本里；
      不满足就拒绝写，并打印是哪一格。

   用法：node scripts/qa/normalize-ledger-shape.mjs [--apply] [文件路径]
*/
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const APPLY = process.argv.includes("--apply");
const posArg = process.argv.slice(2).find((a) => !a.startsWith("--"));
const FILE = posArg ? resolve(posArg) : join(REPO, "reports", "audit", "round-6", "issue-matrix.md");

// 归一化内部用 0..10 的 11 槽位；输出时再套上首尾竖线
const C = { id: 0, alias: 1, page: 2, category: 3, severity: 4, status: 5, conf: 6, evidence: 7, statusEvidence: 8, idealRef: 9, action: 10 };

const STATUS_RE = /(待修复|已修复待复验|待复验|已修复|保留-判据不成立|判据不成立|未取证|需裁决|STILL_OPEN|并入|不另立案|噪声|非新缺陷|回归核对|不立账)/;
const SEVERITY_RE = /^P[0-4](\s*→\s*P[0-4])?$/;
const CONF_RE = /^(0?\.\d+|1(?:\.0+)?)$/;
const FILELINE_RE = /\.(vue|ts|js|json|scss|md|html)\s*[:：]\s*\d+/;
const PAGE_RE = /^[a-z][\w./-]*\/[\w./-]+$/i;
const SEP = " / ";

const isData = (l) => /^\|\s*MP-/.test(l);
const NCOL = 11;

/** 把一行原始文本变成 11 列；返回 { line, cells } 或 null（已合规，无需改动）。 */
function normalize(raw) {
  const cells = raw.split("|");
  const inner = cells.length - 2;
  if (inner === NCOL) return null;
  const body = cells.slice(1, cells.length - 1).map((s) => s.trim());
  const out = new Array(NCOL).fill("");
  for (let i = 0; i < body.length && i < NCOL; i++) out[i] = body[i];
  // 只搬有把握的枚举位；搬不动的一律留在处置里（上面已原样保留过一遍）
  const sev = body.find((c) => SEVERITY_RE.test(c));
  const st = body.find((c) => STATUS_RE.test(c) && !SEVERITY_RE.test(c));
  const conf = body.find((c) => CONF_RE.test(c));
  const ev = body.find((c) => FILELINE_RE.test(c));
  const pg = body.find((c) => PAGE_RE.test(c) && !FILELINE_RE.test(c));
  const take = (dst, v) => { if (v && !out[dst]) out[dst] = v; };
  take(C.severity, sev); take(C.status, st); take(C.conf, conf); take(C.evidence, ev); take(C.page, pg);
  if (!out[C.alias] && body[1] && /〔|MP-R|R[0-9]-/.test(body[1]) && !STATUS_RE.test(body[1])) out[C.alias] = body[1];
  if (!out[C.action] && body[1] && body[1].length > 40) out[C.action] = body[1];
  // 守恒兜底：整行原文（去竖线）附在处置列尾，保证"一个字都不丢"
  const flat = body.map((c) => c.replace(/\|/g, "∣")).join(SEP);
  out[C.action] = [out[C.action], `〔形状归一 §61：本行原为 ${inner} 列，补齐到 ${NCOL} 列；下列为本行全部原文（竖线已替换为 ∣）〕${SEP}${flat}`]
    .filter(Boolean).join(SEP);
  return { line: "|" + out.join("|") + "|", cells: body };
}

const src = readFileSync(FILE, "utf8");
const lines = src.split("\n");
const dataIdx = lines.map((l, i) => (isData(l) ? i : -1)).filter((i) => i >= 0);
const before = dataIdx.map((i) => lines[i]);
const after = [];
const touched = [];
for (let k = 0; k < before.length; k++) {
  const n = normalize(before[k]);
  if (n) { touched.push({ id: n.cells[0], from: n.cells.length }); after.push(n.line); }
  else after.push(before[k]);
}
/* 关键：台账不"只有表"。首版在这里把 after 当成整个文件写回去，
   于是标题、口径说明、表头与分隔行一起没了（277 行→225 行），被下面的守恒自判拦下之前
   已经落盘一次、靠 .pre-shape.bak 复原。**非数据行必须逐字节原样保留**，
   所以重建走 full[]，自判也比到行级。 */
const full = lines.slice();
for (let k = 0; k < dataIdx.length; k++) full[dataIdx[k]] = after[k];
const nonDataDrift = [];
for (let i = 0; i < lines.length; i++) {
  if (dataIdx.includes(i)) continue;
  if (full[i] !== lines[i]) nonDataDrift.push(i + 1);
}

// —— 守恒自判 ——
const idsOf = (arr) => arr.map((l) => (l.split("|")[1] || "").trim()).sort();
const idsBefore = idsOf(before), idsAfter = idsOf(after);
const idOk = idsBefore.length === idsAfter.length && idsBefore.every((v, i) => v === idsAfter[i]);
let lost = [];
for (let k = 0; k < before.length; k++) {
  for (const cell of before[k].split("|").slice(1, -1).map((s) => s.trim())) {
    if (!cell) continue;
    if (!after[k].includes(cell.replace(/\|/g, "∣")) && !after[k].includes(cell)) lost.push([idsBefore[k], cell.slice(0, 70)]);
  }
}
const shapeAfter = after.map((l) => l.split("|").length - 2);
const badAfter = shapeAfter.filter((n) => n !== NCOL).length;
const lineCountOk = full.length === lines.length;

console.log(`文件=${FILE.replace(REPO + "/", "")}`);
console.log(`数据行 before=${before.length} after=${after.length} ID多重集一致=${idOk}`);
console.log(`需归一化行数=${touched.length}（4列 ${touched.filter((t) => t.from === 4).length} / 6列 ${touched.filter((t) => t.from === 6).length} / 其他 ${touched.filter((t) => t.from !== 4 && t.from !== 6).length}）`);
console.log(`归一化后列数≠${NCOL} 的行=${badAfter}`);
console.log(`文本丢失检查：丢失格数=${lost.length}`);
console.log(`非表格内容检查：总行数 ${lines.length}→${full.length} 一致=${lineCountOk}，被改动的非数据行=${nonDataDrift.length}${nonDataDrift.length ? "（第 " + nonDataDrift.slice(0, 10).join(",") + " 行）" : ""}`);
lost.slice(0, 8).forEach(([id, c]) => console.log(`  LOST ${id} :: ${c}`));

if (!idOk || lost.length || badAfter || !lineCountOk || nonDataDrift.length) {
  console.log("SHAPE=NORMALIZE_REFUSED（守恒/形状/非表格内容自判未过，未落盘）");
  process.exit(1);
}
if (!APPLY) { console.log(`SHAPE=DRY_RUN（加 --apply 才写；标题+口径段+表头共 ${lines.length - dataIdx.length} 行非数据内容将逐字节保留）`); process.exit(0); }

const bak = FILE + ".pre-shape.bak";
writeFileSync(bak, src);
writeFileSync(FILE, full.join("\n"));
console.log(`SHAPE=APPLIED rows=${after.length} changed=${touched.length} 非数据行保留=${lines.length - dataIdx.length} backup=${bak.replace(REPO + "/", "")}`);
