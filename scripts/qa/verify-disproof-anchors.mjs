#!/usr/bin/env node
/**
 * 否证锚点新鲜度门：台账里「这条判据不成立，因为 <某文件某行的某个布尔常量是 false>」这类免罪理由，
 * 会不会被**同一轮的修复**悄悄作废？
 *
 * 为什么立这道门（本轮实测，不是设想）：
 *   MP-R2-CAMPUSPOST-010 判「保留-判据不成立」，理由写作
 *   「post-topic.vue:64 CAMPUS_TOPIC_IMAGES_SUPPORTED=false ⇒ 真模式配图链路整体关闭 ⇒ 上传阶段抛不出错 ⇒ 判据前提不可达」。
 *   ③ 的第①项（后端 CreateCampusTopicRequest 收 images）落地后，那个开关翻成 true、链路真的会跑真的会抛，
 *   于是"不成立"的整条理由反了 —— 而缺陷本身一直躺在代码里。
 *   没有任何一门会告诉我这件事：判据台只看"修复在不在产物里"，不看"免罪理由还成不成立"。
 *
 * 判据形状：扫台账数据行里的 `路径:行 名字=true|false` 锚点，逐个回到盘上核对
 *   值反了        ⇒ FAIL（这条免罪理由已作废，行必须复判）
 *   行号漂了但值在别处仍然一致 ⇒ WARN 并打印真实行号（本仓改一行就会整体下移，行号不可信是已知事实）
 *   文件/名字没了 ⇒ FAIL（锚点指向的东西不存在了，等于没有依据）
 * 本门只回答「依据还成立吗」，不回答「这条该不该修」——复判是人的事，它只负责让"没人发现"这件事不可能。
 *
 * 用法：node scripts/qa/verify-disproof-anchors.mjs [--ledger reports/audit/round-6/issue-matrix.md]
 *       [--out .zcode/tmp/disproof-anchors.json]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv2 = process.argv.slice(2);
const arg = (k, d) => { const i = argv2.indexOf("--" + k); return i >= 0 && argv2[i + 1] ? argv2[i + 1] : d; };
const LEDGER = resolve(REPO, arg("ledger", join("reports", "audit", "round-6", "issue-matrix.md")));
const OUT = arg("out", null);
const rel = (p) => relative(REPO, p).split(sep).join("/");

const problems = [];
if (!existsSync(LEDGER)) { console.log(`ANCHORS_RESULT=FAIL reason=台账不存在 ${rel(LEDGER)}`); process.exit(2); }

const lines = readFileSync(LEDGER, "utf8").split(/\r?\n/);
/* 只认「路径:行 + 标识符 = 布尔」这一种形状：它是本轮唯一实测出现过的免罪锚点形状。
   不猜别的写法（散文里"某常量关着"这类无法机械核对，宁可不检也不要做个会漏检的门冒充在检）。 */
const RE_ANCHOR = /([A-Za-z0-9_@./-]+\.(?:vue|ts|js|json|java)):(\d+)\s+([A-Za-z_$][\w$]*)\s*=\s*(true|false)/g;

const anchors = [];
for (const [idx, line] of lines.entries()) {
  if (!/^\|\s*MP-/.test(line)) continue;
  const cells = line.split("|").slice(1, -1);
  const id = (cells[0] || "").trim();
  let m;
  RE_ANCHOR.lastIndex = 0;
  while ((m = RE_ANCHOR.exec(line))) {
    anchors.push({ row: idx + 1, id, file: m[1], line: Number(m[2]), name: m[3], want: m[4] });
  }
}

function locate(cand) {
  const cands = [
    join(REPO, cand),
    join(REPO, "apps", "client", "src", cand.replace(/^.*?src\//, "")),
    join(REPO, "apps", "api", "src", "main", "java", cand.replace(/^.*?java\//, "")),
  ];
  for (const c of cands) if (existsSync(c)) return c;
  return null;
}

const lineCache = new Map();
for (const a of anchors) {
  const abs = locate(a.file);
  if (!abs) { a.verdict = "MISSING_FILE"; continue; }
  if (!lineCache.has(abs)) lineCache.set(abs, readFileSync(abs, "utf8").split(/\r?\n/));
  const src = lineCache.get(abs);
  const at = src[a.line - 1] || "";
  const RE = new RegExp(`\\b${a.name}\\s*(?::\\s*|=)\\s*(true|false)\\b`);
  const lineHit = at.match(RE);
  const globalIdx = src.findIndex((l) => RE.test(l));
  const globalHit = globalIdx >= 0 ? src[globalIdx].match(RE) : null;
  a.resolved = rel(abs);
  if (lineHit) {
    a.verdict = lineHit[1] === a.want ? "HOLDS" : "INVERTED";
    a.actual = lineHit[1];
    if (lineHit[1] !== a.want) a.problem = `${a.id}（台账第 ${a.row} 行）的免罪锚点已作废：${rel(abs)}:${a.line} 的 ${a.name} 现在是 ${lineHit[1]}，锚点写的是 ${a.want} ⇒ 「判据不成立」的前提不再成立，这一行必须复判`;
  } else if (globalHit) {
    a.verdict = "LINE_DRIFT";
    a.actual = globalHit[1];
    a.actualLine = globalIdx + 1;
    if (globalHit[1] !== a.want) a.problem = `${a.id}（台账第 ${a.row} 行）的免罪锚点已作废：${a.name} 实际在 ${rel(abs)}:${globalIdx + 1} 且值是 ${globalHit[1]}（锚点写 ${a.want}，行号也漂了）⇒ 必须复判`;
    else a.problem = `${a.id}（台账第 ${a.row} 行）锚点行号漂移：${a.name} 现在在 ${rel(abs)}:${globalIdx + 1}（锚点写 ${a.line}），值仍为 ${a.want} ⇒ 结论不变，但请把行号改准，否则下次改动没人知道它漂过`;
  } else {
    a.verdict = "NAME_GONE";
    a.problem = `${a.id}（台账第 ${a.row} 行）的免罪锚点里没有那个量了：${rel(abs)} 全文找不到 ${a.name}=true|false ⇒ 这条"不成立"现在没有任何可核对的依据`;
  }
}
/* 找不到文件的锚点也带 problem，统一在下面派生 */
for (const a of anchors) if (a.verdict === "MISSING_FILE" && !a.problem) a.problem = `${a.id}（台账第 ${a.row} 行）引的锚点文件找不到：${a.file}`;

/* 同一行常常同时出现两种锚点：**现行依据**（复判后重写的那条）与**历史引文**（"原引 X=false，已作废"）。
   两者字面形状一样，散文里加"原引"这类词不可靠，也不该让人再维护一张白名单。
   规则改成可自证的：同一 (行, 文件, 常量名) 里只要有一条在当前盘上真的成立，其余同名的就只是引文 ⇒ 降级为 CITATION；
   一条都不成立，才说明这行的依据整个废了 ⇒ FAIL。想靠"多写一条真锚点"糊过去也不行 ——
   那条真锚点必须自己在盘上成立，等于把依据重新落地一次。 */
const groups = new Map();
for (const a of anchors) {
  const k = `${a.row}::${a.resolved || a.file}::${a.name}`;
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(a);
}
for (const [, g] of groups) {
  if (g.length < 2) continue;
  if (!g.some((a) => a.verdict === "HOLDS")) continue;
  for (const a of g) {
    if (a.verdict === "HOLDS") continue;
    a.problem = null;
    a.note = `同行另有 ${a.name} 的现行锚点成立 ⇒ 这条按历史引文处理`;
    a.verdict = "CITATION";
  }
}
for (const a of anchors) if (a.problem) problems.push(a.problem);

const tally = {};
for (const a of anchors) tally[a.verdict] = (tally[a.verdict] || 0) + 1;
console.log(`ANCHORS_SUMMARY 锚点=${anchors.length} ${Object.entries(tally).map(([k, v]) => k + "=" + v).join(" ")}`);
for (const a of anchors) console.log(`  ${(a.verdict + (a.actual ? "" : " ")).padEnd(12)} ${a.id} ${a.file}:${a.line} ${a.name}=${a.want}${a.actual ? " 实际=" + a.actual + (a.actualLine ? "@" + a.actualLine : "") : ""}${a.note ? "  ※ " + a.note : ""}`);
if (OUT) writeFileSync(resolve(REPO, OUT), JSON.stringify({ generatedAt: new Date().toISOString(), ledger: rel(LEDGER), anchors, problems }, null, 1));

if (problems.length) {
  console.log(`ANCHORS_RESULT=FAIL problems=${problems.length}`);
  for (const p of problems) console.log("  ✗ " + p);
  process.exit(2);
}
console.log(`ANCHORS_RESULT=PASS anchors=${anchors.length} —— 每条免罪锚点都还在盘上成立（这不代表那些行判得对，只代表依据没被作废）`);
