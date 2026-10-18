#!/usr/bin/env node
/**
 * aggregate-defects.mjs —— 将各泳道的缺陷卡汇成**互斥批次**的修复清单（MP-FIDELITY Phase F）。
 *
 * 这里唯一不能错的事是"批次互斥"：本轮是多条泳道并行改代码，
 * 若两个批次同时改 `src/theme/design-variables.scss` 或同一个 .vue，后落盘的会静默覆盖前一个，
 * 而两边的缺陷都会在账上被记成"已修"。所以聚合器不产出"按严重度分组"的清单
 * （严重度相同的缺陷大概率落在同一个共享文件里，那样切正好制造同写者），
 * 而是按**文件所有权**切批：
 *   · 每个共享样式/token 文件 ⇒ 单独一批，唯一属主；
 *   · 页面级缺陷 ⇒ 按 .vue 文件分给该文件的属主，一个文件绝不进两个批次；
 *   · 跨页轴（同一 token 引发多页同病）⇒ 归到共享文件那一批，页面批里只留引用。
 *
 * 三条硬规矩（都能红）：
 *   1. defect_id 重复 ⇒ 判红（两条泳道给同一缺陷各写了一份，修一次会销两条账）；
 *   2. 一个文件出现在两个批次 ⇒ 判红（上面那段事故）；
 *   3. 缺 axis/source_citation 的卡 ⇒ 进 `rejected[]` 并点名，不静默丢、也不进批次。
 *
 * 用法：node scripts/qa/aggregate-defects.mjs --lanes <dir|文件...> --round R1 --out <fixlist.json>
 *      node scripts/qa/aggregate-defects.mjs --self-test
 * 退出码：0 聚合成功；1 有三条硬规矩违规；2 输入读不到。
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync, rmSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const RK = "AGGREGATE_RESULT";

const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] && !String(process.argv[i + 1]).startsWith("--") ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes("--" + k);
const AXES = new Set(["位置", "尺寸比例", "颜色token", "圆角", "字号", "间距", "素材缺失", "空态文案", "层级遮挡", "可达性", "文案", "需新建"]);
const SHARED_HINTS = ["src/theme/", "src/styles/", "design-variables", "tokens.scss", "_mixins", "_components", "uni.scss", "global.scss"];

function parseLaneFile(path) {
  const txt = readFileSync(path, "utf-8");
  const out = [];
  for (const block of txt.split(/(?=^\s*[-*]\s*defect_id\s*:)/m)) {
    if (!/defect_id/.test(block)) continue;
    const f = {};
    for (const m of block.matchAll(/^\s*[-*]\s*([A-Za-z_][\w]*)\s*:\s*(.*)$/gm)) if (!(m[1] in f)) f[m[1]] = m[2].trim();
    if (!f.defect_id) continue;
    out.push({
      defect_id: f.defect_id,
      page: f.page || "",
      axis: f.axis || "",
      severity: f.severity || "P3",
      fix_category: f.fix_category || "",
      citation: f.source_citation || "",
      frame_hash: f.frame_hash || "",
      lane: path.replace(REPO + "/", "").split("\\").join("/"),
    });
  }
  return out;
}

/** 从 citation 推出这批要动哪个文件（所有权单位）。 */
function fileOfCitation(cit) {
  const m = String(cit || "").match(/([^\s:]+\.(vue|ts|js|scss|css|json)):/);
  return m ? m[1] : "";
}

function aggregate(lanePaths, round) {
  const problems = [];
  const all = [];
  const rejected = [];
  for (const p of lanePaths) {
    for (const d of parseLaneFile(p)) {
      if (!AXES.has(d.axis)) { rejected.push({ ...d, reject_reason: `axis="${d.axis}" 不在可测词表` }); continue; }
      if (!d.citation) { rejected.push({ ...d, reject_reason: "没有 source_citation（无法定位所有权文件 ⇒ 不能进批次）" }); continue; }
      all.push(d);
    }
  }
  const seen = new Map();
  for (const d of all) {
    if (seen.has(d.defect_id)) problems.push(`defect_id 重复：${d.defect_id} 同时出现在 ${seen.get(d.defect_id)} 与 ${d.lane} ⇒ 修一次会销两条账`);
    else seen.set(d.defect_id, d.lane);
  }

  /* 批次分配：所有权 = 文件。共享文件优先成独立批，页面文件按文件聚合。 */
  const batches = [];
  const byFile = new Map();
  for (const d of all) {
    const f = fileOfCitation(d.citation) || `unknown:${d.defect_id}`;
    if (!byFile.has(f)) byFile.set(f, []);
    byFile.get(f).push(d);
  }
  let seq = 0;
  for (const [file, list] of [...byFile.entries()].sort((a, b) => (isShared(a[0]) === isShared(b[0]) ? a[0].localeCompare(b[0]) : isShared(a[0]) ? -1 : 1))) {
    seq++;
    batches.push({
      batch_id: `${round}-B${String(seq).padStart(2, "0")}`,
      owner_lane: list[0].lane,
      files: [file],
      shared: isShared(file),
      defects: list.map((d) => d.defect_id),
      pages: [...new Set(list.map((d) => d.page).filter(Boolean))],
      axes: [...new Set(list.map((d) => d.axis))],
    });
  }
  /* 互斥复验（不是"我们相信上面的切法"）：同一文件出现在两个批次 ⇒ 判红 */
  const fileOwner = new Map();
  for (const b of batches) {
    for (const f of b.files) {
      if (fileOwner.has(f)) problems.push(`文件 ${f} 同时属于 ${fileOwner.get(f)} 与 ${b.batch_id} ⇒ 两条泳道会互相覆写`);
      else fileOwner.set(f, b.batch_id);
    }
  }
  return { problems, batches, rejected, all };
}
function isShared(f) { return SHARED_HINTS.some((h) => String(f).includes(h)); }

function selfTest() {
  const SRK = "AGGREGATE_SELFTEST";
  const scratch = join(REPO, ".zcode", "tmp", "aggregate-selftest");
  rmSync(scratch, { recursive: true, force: true });
  mkdirSync(scratch, { recursive: true });
  const mk = (name, body) => { const p = join(scratch, name); writeFileSync(p, body, "utf-8"); return p; };
  const lane = (id, file, axis = "间距") => `## FRAME f.png
- frame_hash: abc
- defect_id: ${id}
- page: pages/a/index
- axis: ${axis}
- severity: P1
- source_citation: ${file}:10
`;
  const cases = [
    ["两页两文件 ⇒ 两批互不重叠", [mk("l1.md", lane("D1", "src/pages/a.vue") + lane("D2", "src/pages/b.vue"))], 0, 2],
    ["同文件两缺陷 ⇒ 合成一批（不拆成两条泳道）", [mk("l2.md", lane("D3", "src/pages/a.vue") + lane("D4", "src/pages/a.vue"))], 0, 1],
    ["重复 defect_id ⇒ 判红", [mk("l3.md", lane("SAME", "src/pages/a.vue") + lane("SAME", "src/pages/b.vue"))], 1, 2],
    ["散文轴 ⇒ 整条进 rejected，不进批次", [mk("l4.md", lane("D5", "src/pages/a.vue", "观感不佳"))], 0, 0],
    ["共享 token 文件单独成批", [mk("l5.md", lane("D6", "src/theme/design-variables.scss") + lane("D7", "src/pages/c.vue"))], 0, 2],
  ];
  let problems = 0;
  for (const [label, files, wantProblems, wantBatches] of cases) {
    const r = aggregate(files, "SELF");
    const gotP = r.problems.length;
    const gotB = r.batches.length;
    const ok = gotP === wantProblems && gotB === wantBatches;
    console.log(`AGGREGATE_SELF ${label.padEnd(30)} 期望 problems=${wantProblems} batches=${wantBatches} 实测 problems=${gotP} batches=${gotB} rejected=${r.rejected.length} ⇒ ${ok ? "对" : "错"}`);
    if (!ok) problems++;
  }
  rmSync(scratch, { recursive: true, force: true });
  console.log(problems ? `${SRK}=FAIL cases=5 problems=${problems}` : `${SRK}=PASS cases=5 互斥与去重判点可红=是`);
  return problems ? 1 : 0;
}

if (flag("self-test")) process.exit(selfTest());

const round = arg("round", "");
const lanesArg = arg("lanes", "");
const out = resolve(arg("out", join(REPO, `reports/audit/mp-fidelity-2026-10-18/fixlist-${round || "X"}.json`)));
if (!round || !lanesArg) { console.log(`${RK}=NOT-EVIDENCED reason=需 --round 与 --lanes`); process.exit(2); }
const lanePaths = [];
const p0 = resolve(lanesArg);
if (existsSync(p0) && statSync(p0).isDirectory()) {
  for (const f of readdirSync(p0).filter((x) => x.endsWith(".md"))) lanePaths.push(join(p0, f));
} else if (existsSync(p0)) lanePaths.push(p0);
else { console.log(`${RK}=NOT-EVIDENCED reason=lanes 路径不存在 ${lanesArg}`); process.exit(2); }
if (!lanePaths.length) { console.log(`${RK}=NOT-EVIDENCED reason=没有泳道件可聚合（空扫描集）`); process.exit(2); }

/* 任务书(*.brief.md)不是缺陷卡，必须排除。R1 实测：我传的是目录，里面 12 个 .md = 6 张卡 + 6 份任务书，
   聚合器把任务书也吞进来了。这次没变成脏批次**纯属侥幸** —— 任务书里的示例字段是占位符
   （axis="<词表内的一项>"），被 rejected 判点挡成 6 条。一旦任务书把示例写成合法轴（或以后模板改样），
   那些示例就会成为一条真实批次去改代码。⇒ 排除按文件名谓词做，不依赖字段是否合法。 */
const briefPaths = lanePaths.filter((p) => /\.brief\.md$/i.test(p));
for (const b of briefPaths) lanePaths.splice(lanePaths.indexOf(b), 1);
console.log(`AGGREGATE_SCOPE 读卡=${lanePaths.length} 排除任务书=${briefPaths.length}`);
if (!lanePaths.length) { console.log(`${RK}=NOT-EVIDENCED reason=目录里只有任务书、没有缺陷卡`); process.exit(2); }

const { problems, batches, rejected, all } = aggregate(lanePaths, round);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({
  schema: "mp-fidelity-fixlist/v1", round, generatedAt: new Date().toISOString(),
  lanes: lanePaths.length, defects: all.length, rejected,
  batches,
  ownership: "批次互斥由 files[] 保证；同一文件绝不进两个批次（本文件自证第 2/3 例）",
}, null, 2) + "\n", "utf-8");
for (const pr of problems) console.error(`AGGREGATE_PROBLEM ${pr}`);
console.log(`AGGREGATE_STATS lanes=${lanePaths.length} defects=${all.length} batches=${batches.length} sharedBatches=${batches.filter((b) => b.shared).length} rejected=${rejected.length} out=${out.replace(REPO + "/", "").split("\\").join("/")}`);
console.log(problems.length ? `${RK}=FAIL problems=${problems.length}` : `${RK}=PASS defects=${all.length} batches=${batches.length} rejected=${rejected.length} 互斥=成立`);
process.exit(problems.length ? 1 : 0);
