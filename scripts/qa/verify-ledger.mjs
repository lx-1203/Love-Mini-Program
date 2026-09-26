/**
 * D7：台账跨源对账。同一缺陷在 R2 里存在 2–4 个 ID，"待修复"总量三处口径互斥，
 * 另有大批 ID 被门禁判成"从未入账"。只读，不改任何台账。
 *
 * 本版修掉门禁自身的两个盲区（对账结论见 .zcode/tmp/ledger-reconcile/reconcile.md）：
 *   1) 矩阵集只认 round-2 五份 → 现扩为 reports/audit/** 全轮次 *matrix*.md / regression-report.md /
 *      audit-report.md + baseline/{regression-index.json,historical-issues.md}；
 *   2) 锚点只认整串 token → 现展开「簇/区间锚（-001-002 / -007..018）」与「缩写异体锚（轮次+序号+页名核心词）」。
 * 输出分四层，逐条带出处可复核：
 *   LEDGER_CROSS_ROUND（别的轮次整串在册，其中"仅被提及"另计数）/ LEDGER_CLUSTER_HIT（簇区间展开）/
 *   LEDGER_ALIAS_HIT（缩写归一，必须打印 ≈ 锚点）/ MALFORMED_TOKEN（ID_RE 截断串，不判在册也不判孤儿）。
 * 硬失败只看 LEDGER_ORPHAN_TRUE（全仓无本尊行）；台账扫描集或矩阵集为空一律 exit 2，不许空过。
 *
 * 用法：node scripts/qa/verify-ledger.mjs [roundDir=reports/audit/round-2]
 *      LEDGER_VERBOSE=1 打印全部跨轮命中（默认只打印前 12 条）
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve, dirname, basename, relative } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const AUDIT_ROOT = join(REPO_ROOT, "reports", "audit");
const VERBOSE = process.env.LEDGER_VERBOSE === "1";

const roundDir = resolve(REPO_ROOT, process.argv[2] || join("reports", "audit", "round-2"));
if (!existsSync(roundDir)) { console.log(`LEDGER_RESULT=FAIL reason=目录不存在 ${roundDir}`); process.exit(1); }
const rel = (p) => relative(REPO_ROOT, p).split("\\").join("/");

const ID_RE = /MP-[A-Za-z0-9_一-鿿-]+/g;
// 区间锚用字面量 ".." 书写（...-007..018），ID_RE 会在点号处断句，必须单独扫原文
const RANGE_RE = /MP-[A-Za-z0-9_一-鿿-]*?\d{3}\.\.\d{3}/g;
const RANGE_SPLIT_RE = /^(MP-[A-Za-z0-9_一-鿿-]*?)-(\d{3})\.\.(\d{3})$/;
const MAX_CLUSTER_SPAN = 60;
// 缩写异体锚的停用词：只作路径分段用、不承载页名语义
const STOP_TOKENS = new Set(["PAGES", "PAGE", "INDEX", "SUBPACKAGES", "SUBPACKAGE", "EXTRA"]);
const MAX_ALIAS_DROP = 4;

const sources = new Map();
const add = (name, ids) => { const s = sources.get(name) || new Set(); for (const i of ids) s.add(i); sources.set(name, s); };
const txt = (p) => { try { return readFileSync(p, "utf8"); } catch { return ""; } };
const json = (p) => { try { return JSON.parse(txt(p)); } catch { return null; } };

/* ---------- 1. 当前轮次矩阵（沿用旧口径，用于 LEDGER_ORPHAN_ALL） ---------- */
const CURRENT_MATRIX_NAMES = ["issue-matrix.md", "interaction-matrix.md", "screenshot-matrix.md", "regression-report.md", "audit-report.md"];
const currentMatrixFiles = CURRENT_MATRIX_NAMES.map((f) => join(roundDir, f)).filter(existsSync);
for (const f of currentMatrixFiles) add("matrix:" + rel(f), txt(f).match(ID_RE) || []);
const currentMatrixSet = new Set([...[...sources.entries()].filter(([k]) => k.startsWith("matrix:")).flatMap(([, v]) => [...v])]);

/* ---------- 2. 全轮次矩阵语料（跨轮次在册的判据来源） ---------- */
function walkMd(dir, out = []) {
  let entries = [];
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkMd(p, out); else out.push(p);
  }
  return out;
}
const isMatrixDoc = (p) => {
  const b = basename(p);
  return b.endsWith(".md") && (/matrix/i.test(b) || b === "regression-report.md" || b === "audit-report.md");
};
const matrixDocs = [...new Set([
  ...walkMd(AUDIT_ROOT).filter(isMatrixDoc),
  join(AUDIT_ROOT, "baseline", "regression-index.json"),
  join(AUDIT_ROOT, "baseline", "historical-issues.md"),
].concat(currentMatrixFiles))].filter(existsSync);

// 有效在册锚点集：整串 token + 簇/区间展开成员，各自带出处
const matrixExact = new Map();     // id -> "出处文件"
const matrixCluster = new Map();   // 簇/区间展开成员 -> "簇锚 <anchor> @ <file>"
const clusterAnchors = new Map();  // 语料里出现的簇/区间锚原文 -> file
const leadAnchors = new Set();     // 作为「本尊行锚点」出现（md 行首/单元格首 token、json 字符串值），区别于散文里被提及
// 簇锚：尾部是 2 个及以上三位数字组。两组按区间展开，三组及以上按枚举成员展开
const CLUSTER_LIST_RE = /^(MP-[A-Za-z0-9_一-鿿-]*?)((?:-\d{3}){2,})$/;
function clusterMembers(id) {
  const m = CLUSTER_LIST_RE.exec(id);
  if (!m) return null;
  const groups = id.slice(m[1].length).split("-").filter(Boolean).map(Number);
  if (groups.some((n) => !Number.isFinite(n))) return null;
  if (groups.length === 2) {
    const [lo, hi] = groups;
    if (hi < lo || hi - lo > MAX_CLUSTER_SPAN) return null;
    const out = [];
    for (let n = lo; n <= hi; n++) out.push(`${m[1]}-${String(n).padStart(3, "0")}`);
    return out;
  }
  return groups.map((n) => `${m[1]}-${String(n).padStart(3, "0")}`);
}
function rangeMembers(id) {
  const m = RANGE_SPLIT_RE.exec(id);
  if (!m) return null;
  const lo = Number(m[2]), hi = Number(m[3]);
  if (hi < lo || hi - lo > MAX_CLUSTER_SPAN) return null;
  const out = [];
  for (let n = lo; n <= hi; n++) out.push(`${m[1]}-${String(n).padStart(3, "0")}`);
  return out;
}
for (const f of matrixDocs) {
  const raw = txt(f);
  const fromCurrent = currentMatrixFiles.includes(f);
  for (const id of raw.match(ID_RE) || []) {
    if (!matrixExact.has(id) || fromCurrent) matrixExact.set(id, rel(f));
    const members = clusterMembers(id);
    if (!members) continue;
    clusterAnchors.set(id, rel(f));
    for (const member of members) if (!matrixCluster.has(member)) matrixCluster.set(member, `簇锚 ${id} @ ${rel(f)}`);
  }
  for (const token of raw.match(RANGE_RE) || []) {
    const members = rangeMembers(token);
    if (!members) continue;
    clusterAnchors.set(token, rel(f));
    for (const member of members) if (!matrixCluster.has(member)) matrixCluster.set(member, `区间锚 ${token} @ ${rel(f)}`);
  }
  if (f.endsWith(".json")) { for (const m of raw.matchAll(/"(MP-[^"]*)"/g)) leadAnchors.add(m[1]); continue; }
  const leadRe = (s) => { const m = /^\s*[|>\-*#()\[\]【】“”"'` ]{0,8}(MP-[^\s|,，、)）\]】"'`]+)/.exec(s); return m ? m[1] : null; };
  for (const line of raw.split(/\r?\n/)) {
    const t0 = leadRe(line); if (t0) leadAnchors.add(t0);
    if (line.includes("|")) for (const cell of line.split("|")) { const t = leadRe(cell); if (t) leadAnchors.add(t); }
  }
}
// 簇锚本身在册 → 其展开成员同样算「本尊行覆盖」
for (const anchor of [...leadAnchors]) for (const m of (clusterMembers(anchor) || rangeMembers(anchor) || [])) leadAnchors.add(m);
const isLeadRow = (id) => leadAnchors.has(id);
const matrixIds = new Set([...matrixExact.keys(), ...matrixCluster.keys()]);

// 缩写锚索引：按 轮次 + 序号 分桶，桶内比较页名核心词（只收"原子"完整 ID，簇锚用其展开成员）
const parseAtomic = (id) => {
  if (clusterMembers(id) || rangeMembers(id)) return null;
  const m = /^MP-(R\d+[A-Z]?)-(.*)$/.exec(id);
  if (!m) return null;
  const round = m[1];
  const rest = m[2];
  let tail = "", seq = "";
  const sm = /^(.*?)-(\d{2,4})$/.exec(rest);
  if (sm) { tail = sm[1]; seq = sm[2]; }
  else if (/^\d{2,4}$/.test(rest)) seq = rest;
  else return null;
  const core = tail.split("-").filter(Boolean).map((t) => t.toUpperCase()).filter((t) => !STOP_TOKENS.has(t) && !/^\d+$/.test(t));
  return { round, seq: String(Number(seq)).padStart(3, "0"), core: new Set(core), raw: id };
};
const aliasIndex = new Map(); // `${round}::${seq}` -> [{core, raw, file}]
for (const id of matrixIds) {
  const p = parseAtomic(id);
  if (!p) continue;
  const key = `${p.round}::${p.seq}`;
  if (!aliasIndex.has(key)) aliasIndex.set(key, []);
  aliasIndex.get(key).push({ core: p.core, raw: id, file: matrixExact.get(id) || matrixCluster.get(id) || "" });
}
const aliasLookup = (id, ctxCores) => {
  const p = parseAtomic(id);
  if (!p) return null;
  const key = `${p.round}::${p.seq}`;
  const pool = [...new Map((aliasIndex.get(key) || []).filter((c) => c.raw !== id).map((c) => [c.raw, c])).values()];
  const tries = [p.core, ...(ctxCores || [])].filter((c) => c && c.size);
  if (!tries.length || !pool.length) return null;
  const solved = new Map();  // anchor@file -> 核心词来源
  const unsolved = [];
  for (const core of tries) {
    const cands = pool.filter((c) => c.core.size >= core.size && c.core.size - core.size <= MAX_ALIAS_DROP
      && [...core].every((t) => c.core.has(t)));
    if (!cands.length) continue;
    const min = Math.min(...cands.map((c) => c.core.size - core.size));
    const nearest = cands.filter((c) => c.core.size - core.size === min);
    const from = [...core].join(",");
    if (nearest.length === 1) solved.set(`${nearest[0].raw} @ ${nearest[0].file}`, from);
    else unsolved.push(`${from}=>[${nearest.slice(0, 3).map((c) => c.raw).join(", ")}]`);
  }
  if (solved.size === 1 && !unsolved.length) {
    const [only, from] = [...solved][0];
    return { hit: { raw: only.split(" @ ")[0], file: only.split(" @ ")[1] || "", from } };
  }
  if (!solved.size && !unsolved.length) return null;
  return { ambiguous: [...[...solved.keys()], ...unsolved] };
};

/* ---------- 3. 台账侧（非矩阵）来源，沿用旧口径 ---------- */
for (const d of ["findings", "code-findings", "interact", "regression"]) {
  const dir = join(roundDir, d);
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    const blob = txt(join(dir, f));
    add(`${d}/${f}`, blob.match(ID_RE) || []);
  }
}
const hv = json(join(roundDir, "harvest.json"));
if (hv) add("harvest.json", (hv.all || hv.issues || []).map((x) => x?.id).filter(Boolean));
const mdi = json(join(REPO_ROOT, ".zcode", "tmp", "mode-dependent-issues.json"));
if (mdi) add("mode-dependent-issues.json", Object.keys(mdi.issues || mdi || {}).map((k) => (typeof k === "string" && /^MP-/.test(k) ? k : null)).filter(Boolean));

const allIds = new Set([...sources.values()].flatMap((s) => [...s]));

// 出处文件页名上下文：切片文件名即页 slug（code-findings/PAGES-MESSAGES-INDEX.json → {MESSAGES}）
const coreWords = (s) => new Set(String(s).toUpperCase().split("-").filter(Boolean).filter((t) => !STOP_TOKENS.has(t)));
const idContext = new Map(); // id -> Set<coreKey>
for (const [name, ids] of sources) {
  if (name.startsWith("matrix:")) continue;
  const ctx = coreWords(basename(name).replace(/\.json$/, ""));
  if (!ctx.size) continue;
  const key = [...ctx].sort().join(",");
  for (const i of ids) { if (!idContext.has(i)) idContext.set(i, new Set()); idContext.get(i).add(key); }
}
const ctxCoresOf = (id) => [...(idContext.get(id) || [])].map((k) => coreWords(k)).filter((c) => c.size);

/* ---------- 4. 四类锚点形态判定（互斥，优先级 整串 > 簇/区间 > 缩写） ---------- */
// 只有两类串能确定不是缺陷 ID：① 不带轮次前缀的（`MP-WEIXIN` 这种 #ifdef 平台名、harvest 里的 `R12-IND-HOME-001` 工作代号）；
// ② 以 `-` 收尾的 ID_RE 断句残串（`MP-R1-`、`MP-R2-CIRCLES-INDEX-`）。其余一律当 ID 参与判定——
// 形似截断但没有尾破折号的（`MP-R2-CAMPUS-HU`）宁可多报一条孤儿让人去改出处写法，也不能静默放过真号（如 `MP-R2-PUB-002-R` 这类复审回归核对号）。
const isRealId = (i) => /^MP-R\d/.test(i) && !i.endsWith("-");
const malformed = [...allIds].filter((i) => !isRealId(i));
const realIds = new Set([...allIds].filter(isRealId));
const candidates = [...realIds].filter((i) => !currentMatrixSet.has(i));
const crossRound = [];   // 别的轮次矩阵里有本尊行（整串精确）
const clusterHits = [];  // 靠簇/区间锚展开才对上
const aliasHits = [];    // 靠缩写规范化对上
const ambiguous = [];    // 缩写候选不唯一，只报不判
const mentionOnly = [];  // 跨轮命中但只是"被提及"，不是行首本尊锚点
const trueOrphans = [];
for (const id of candidates) {
  if (matrixIds.has(id)) {
    const lead = isLeadRow(id);
    if (!lead) mentionOnly.push([id, matrixExact.get(id) || matrixCluster.get(id)]);
    if (matrixExact.has(id)) crossRound.push([id, matrixExact.get(id), lead]);
    else clusterHits.push([id, matrixCluster.get(id), lead]);
    continue;
  }
  // 孤儿自己写成簇/区间形式：成员全部在册才算在册
  const members = clusterMembers(id) || rangeMembers(id);
  if (members) {
    const missing = members.filter((m) => !matrixIds.has(m));
    if (missing.length === 0) { clusterHits.push([id, `自身即簇锚，${members.length} 个成员全部在册`, true]); continue; }
    trueOrphans.push([id, `自身为簇锚，缺成员 ${missing.slice(0, 4).join(",")}${missing.length > 4 ? "…" : ""}`]);
    continue;
  }
  const a = aliasLookup(id, ctxCoresOf(id));
  if (a && a.hit) { aliasHits.push([id, `${a.hit.raw} @ ${a.hit.file} [核心词 ${a.hit.from}]`]); continue; }
  if (a && a.ambiguous) ambiguous.push([id, a.ambiguous]);
  trueOrphans.push([id, !a ? "全轮次矩阵无本尊行" : a.ambiguous.length ? "缩写候选不唯一" : "缩写无可归一锚点"]);
}

/* ---------- 5. 输出（既有机器可读字段名一律保留，新增字段另起行） ---------- */
const orphanAll = [...allIds].filter((i) => !currentMatrixSet.has(i));
const malformedInOrphanAll = orphanAll.filter((i) => !isRealId(i));
const rescued = crossRound.length + clusterHits.length + aliasHits.length;
console.log(`LEDGER_SOURCES=${sources.size} DISTINCT_IDS=${allIds.size} MATRIX_IDS=${matrixIds.size} NOT_IN_ANY_MATRIX=${trueOrphans.length}`);
console.log(`MATRIX_IDS_CURRENT_ROUND=${currentMatrixSet.size} MATRIX_FILES=${matrixDocs.length} CURRENT_MATRIX_FILES=${currentMatrixFiles.length}`);
console.log(`NOT_IN_CURRENT_ROUND_MATRIX=${rescued}（旧报"从未入账"、实际只在别的轮次/别的锚点形态在册）`);
console.log(`LEDGER_ORPHAN_ALL=${orphanAll.length}（旧口径：只比对当前轮次五份矩阵）`);
console.log(`LEDGER_ORPHAN_TRUE=${trueOrphans.length}（扩矩阵集 + 锚点展开后仍无任何本尊行 → 硬失败依据）`);
console.log(`LEDGER_CROSS_ROUND=${crossRound.length} LEDGER_ALIAS_HITS=${aliasHits.length} LEDGER_CLUSTER_EXPANDED=${clusterHits.length}`);
console.log(`LEDGER_MATRIX_CLUSTER_ANCHORS=${clusterAnchors.size} LEDGER_CROSS_ROUND_MENTION_ONLY=${mentionOnly.length} LEDGER_ALIAS_AMBIGUOUS=${ambiguous.length}`);
console.log(`LEDGER_MALFORMED_TOKENS=${malformed.length}（ID_RE 截断串/非 MP 工作代号，不算缺陷 ID，单列复核；其中 ${malformedInOrphanAll.length} 条旧口径被记成孤儿）`);
for (const [k, v] of sources) console.log(`  ${String(v.size).padStart(4)}  ${k}`);
for (const f of matrixDocs.filter((f) => !currentMatrixFiles.includes(f)).sort()) {
  const n = new Set((txt(f).match(ID_RE) || [])).size;
  if (n) console.log(`  ${String(n).padStart(4)}  matrix(其他轮次):${rel(f)}`);
}
clusterHits.forEach(([i, w, lead]) => console.log(`  LEDGER_CLUSTER_HIT ${i} <= ${w}${lead ? "" : "（仅被提及）"}`));
aliasHits.forEach(([i, w]) => console.log(`  LEDGER_ALIAS_HIT ${i} ≈ ${w}`));
const ambgPrint = VERBOSE ? ambiguous : ambiguous.slice(0, 15);
ambgPrint.forEach(([i, c]) => console.log(`  LEDGER_ALIAS_AMBIG ${i} ?= ${c.slice(0, 4).join(", ")}（候选不唯一，未判在册）`));
if (!VERBOSE && ambiguous.length > ambgPrint.length) console.log(`  …LEDGER_ALIAS_AMBIG 另有 ${ambiguous.length - ambgPrint.length} 条（LEDGER_VERBOSE=1 全量打印）`);
const crPrint = VERBOSE ? crossRound : crossRound.slice(0, 12);
crPrint.forEach(([i, w, lead]) => console.log(`  LEDGER_CROSS_ROUND ${i} @ ${w}${lead ? "" : "（仅被提及，非行首本尊锚点）"}`));
if (!VERBOSE && crossRound.length > crPrint.length) console.log(`  …LEDGER_CROSS_ROUND 另有 ${crossRound.length - crPrint.length} 条（LEDGER_VERBOSE=1 全量打印）`);
malformed.forEach((i) => console.log(`  MALFORMED_TOKEN ${i}  [非缺陷 ID：ID_RE 截断串/非 MP 代号，不判在册也不判孤儿]`));
for (const [i, why] of trueOrphans) console.log(`  ORPHAN_ID ${i}${why && why !== "全轮次矩阵无本尊行" ? "  [" + why + "]" : ""}`);
const suffixCollide = new Map();
for (const i of allIds) { const t = i.replace(/-R\d+-/g, "-R*-").replace(/^(MP-R\d+|MP-R\d+[A-Z]?)-/, "$1-"); suffixCollide.set(t, (suffixCollide.get(t) || 0) + 1); }
const dupFamilies = [...suffixCollide.entries()].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]);
console.log(`LEDGER_MULTI_ID_FAMILIES=${dupFamilies.length}（同一缺陷多 ID 的族数，>0 就说明台账没收敛）`);
dupFamilies.slice(0, 6).forEach(([t, n]) => console.log(`  DUP_FAMILY ${t} ×${n}`));

if (!allIds.size || !sources.size) { console.log("LEDGER_RESULT=FAIL reason=台账扫描集为空（不许空过）"); process.exit(2); }
if (!matrixDocs.length || !matrixIds.size) { console.log("LEDGER_RESULT=FAIL reason=矩阵集为空（不许空过）"); process.exit(2); }
const tail = malformed.length ? `；另有 ${malformed.length} 条非 ID 截断串待改源头写法` : "";
/* —— 表结构不变量 ——
   台账是**按列取值**的权威件（status / severity 各占一列），所以"列数不对的行"
   不是排版问题，而是**那几行对任何机器读者都不存在**。2026-09-25 实测：
   表头声明 11 列，226 条数据行里 65 条是 4/6 列，于是按列统计的排产、改判核对
   全部只覆盖了 161 条可解析行 —— 而这在本门禁里从来没有人查过（本文件此前
   连 `split('|')` 都没有）。归一化脚本见 scripts/qa/normalize-ledger-shape.mjs（台账 §61）。 */
let shapeRows = 0, shapeOff = [], shapeDecl = 0, shapeNoHeader = [];
for (const f of currentMatrixFiles.filter((x) => /issue-matrix\.md$/.test(x))) {
  const ls = txt(f).split("\n");
  const hdr = ls.find((l) => /^\|/.test(l) && /\|\s*status\s*\|/i.test(l));
  const want = hdr ? hdr.split("|").length - 2 : 0;
  if (!want) { shapeNoHeader.push(rel(f)); continue; }
  shapeDecl = want;
  for (const l of ls) {
    if (!/^\|\s*MP-/.test(l)) continue;
    shapeRows++;
    const n = l.split("|").length - 2;
    if (n !== want) shapeOff.push([rel(f), (l.split("|")[1] || "").trim(), n]);
  }
}
/* 值域核对（§79）：列数对≠读得懂。实测有行的 status 列里坐着一整段散文
   （`【源码复核推翻 finding 的 status】…`），列数仍是 11，于是
   "按 status 列取状态"的所有读者（排产、报告分桶、我这次的状态核对）拿到的是垃圾，
   而且比 12 列的行更难发现 —— 它形状合规、语义错位。所以受控词表必须机器守。
   注意允许"词 + 括注"（`已修复待复验（本轮收口落工作树…）` 是合法写法），只要求以受控词开头。 */
let badStatus = [];
{
  const VOCAB = /^(待修复|已修复待复验|待复验|已修复|保留-判据不成立|判据不成立|未取证|需裁决|撤销|并入|不另立案|噪声|非新缺陷|回归核对|不立账)/;
  for (const f of currentMatrixFiles.filter((x) => /issue-matrix\.md$/.test(x))) {
    const ls = txt(f).split("\n");
    const hdr = ls.find((l) => /^\|/.test(l) && /\|\s*status\s*\|/i.test(l));
    if (!hdr) continue;
    const cols = hdr.split("|").map((s) => s.trim());
    const si = cols.findIndex((c) => /^status$/i.test(c));
    if (si < 0) continue;
    /* 「不立账」只在「NOISE 不予立账」那一节里合法：那一节登记的是"没有缺陷实体的串"（正则截断产物、
       幽灵锚点），不是被追踪的缺陷。若允许它出现在第一节，就成了把真缺陷改成"不立账"即可脱离追踪的后门，
       所以按所在小节卡死，而不是只把词加进表就放行。 */
    let nFrom = -1, nTo = -1;
    for (let i = 0; i < ls.length; i++) {
      if (nFrom < 0 && /^#{2,}\s.*(不予立账|NOISE)/.test(ls[i])) { nFrom = i; continue; }
      if (nFrom >= 0 && /^#{2,}\s/.test(ls[i])) { nTo = i; break; }
    }
    if (nFrom >= 0 && nTo < 0) nTo = ls.length;
    for (let li = 0; li < ls.length; li++) {
      const l = ls[li];
      if (!/^\|\s*MP-/.test(l)) continue;
      const c = l.split("|");
      if (c.length - 2 !== cols.length - 2) continue; // 错位行由 SHAPE 报，这里不重复报
      const v = String(c[si] || "").trim();
      const id = (c[1] || "").trim();
      if (!VOCAB.test(v)) badStatus.push([id, v]);
      else if (/^不立账/.test(v) && !(li > nFrom && li < nTo)) badStatus.push([id, v + "〔不立账只允许出现在「不予立账」小节，L" + (nFrom + 1) + ".." + nTo + "〕"]);
    }
  }
}
console.log(`LEDGER_SHAPE_DECLARED_COLS=${shapeDecl || "(表头缺失)"} DATA_ROWS=${shapeRows} OFF_SCHEMA_ROWS=${shapeOff.length} STATUS_VOCAB_BAD=${badStatus.length}`);
for (const [id, v] of badStatus.slice(0, 12)) console.log(`  STATUS_VOCAB ${id} status 列开头不是受控词：${JSON.stringify(v.slice(0, 46))}`);
if (badStatus.length > 12) console.log(`  …STATUS_VOCAB 另有 ${badStatus.length - 12} 行`);
if (shapeNoHeader.length) console.log(`LEDGER_SHAPE_FAIL 表头无法定位（找不到含 status 的表头行）：${shapeNoHeader.join(", ")} —— 列数判据失效，不得当作合规`);
shapeOff.slice(0, 12).forEach(([f, id, n]) => console.log(`  OFF_SCHEMA ${id} 列数=${n}（应为 ${shapeDecl}）@ ${f}`));
if (shapeOff.length > 12) console.log(`  …OFF_SCHEMA 另有 ${shapeOff.length - 12} 条（跑 normalize-ledger-shape.mjs 归一化，不要手改）`);

const ledgerHardFail = trueOrphans.length > 0 || shapeOff.length > 0 || shapeNoHeader.length > 0 || badStatus.length > 0;
console.log(trueOrphans.length ? `LEDGER_RESULT=FAIL（${trueOrphans.length} 个 ID 全轮次矩阵均无本尊行，账实不符${tail}）` : (shapeOff.length || shapeNoHeader.length || badStatus.length ? `LEDGER_RESULT=FAIL（ID 账实相符，但表结构/值域不合规：错位行 ${shapeOff.length}、status 值域外 ${badStatus.length}${shapeNoHeader.length ? " + 表头缺失 " + shapeNoHeader.length : ""}）` : `LEDGER_RESULT=PASS${tail}`));
process.exit(ledgerHardFail ? 1 : 0);
