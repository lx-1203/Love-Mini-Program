/**
 * 按 id 精确改写台账表格里指定列的单元格（不手改长行 —— 这个文件一行有两三百字，
 * 手改的 Edit old_string 极易只截到半句而把整行拆坏：本轮真的发生过，85 行变 12 列）。
 *
 * 四条护栏：
 *  1. id 必须**唯一**命中一行（0 行或 >1 行都拒绝，不猜是哪一行）；
 *  2. 列号越界 / 该行不是表格数据行 ⇒ 拒绝；
 *  3. 改写后**列数必须与原来相同**（防止内容里混进 `|` 把列撑开——本仓的老坑）；
 *  4. 每个动作都打印 before（截断）以便核对，且 --dry 是默认，必须显式 --apply 才写盘（写前 .pre-cellpatch.bak）。
 *
 * 计划文件：{"patches":[{"id":"MP-…","col":8,"new":"…","why":"…"}]}  col 为 1-based 数据列序
 * （1=新号 2=历史别名 3=页面 4=类别 5=severity 6=status 7=置信 8=证据 9=statusEvidence 10=理想图依据 11=处置）
 * 用法：node scripts/qa/patch-ledger-cells.mjs --plan <f> [--ledger <f>] [--apply]
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { join, resolve, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const APPLY = process.argv.includes("--apply");
const LEDGER = resolve(REPO, arg("ledger", "reports/audit/round-6/issue-matrix.md"));
const PLAN = resolve(REPO, arg("plan", ""));
const rel = (p) => relative(REPO, p).split(sep).join("/");
const die = (m, code = 2) => { console.log("CELLPATCH_RESULT=FAIL reason=" + m); process.exit(code); }
if (!PLAN || !existsSync(PLAN)) die("缺 --plan 或文件不存在");
if (!existsSync(LEDGER)) die("台账不存在 " + rel(LEDGER));
const plan = JSON.parse(readFileSync(PLAN, "utf8"));
const patches = Array.isArray(plan.patches) ? plan.patches : [];
if (!patches.length) die("patches 为空（没东西可改却报绿是不允许的）");

const lines = readFileSync(LEDGER, "utf8").split(/\r?\n/);
const changes = [];
for (const p of patches) {
  if (!p || !p.id || !Number.isInteger(p.col) || typeof p.new !== "string") { die("计划项缺 id/col/new：" + JSON.stringify(p).slice(0, 80)); }
  if (p.new.includes("|")) { die(`${p.id} 的新内容里有竖线，会撑破表格列：先用／或顿号代替`); }
  const hits = [];
  lines.forEach((l, i) => {
    /* 台账里有 65 行是 `|MP-…`（竖号后没有空格）。markdown 不需要单元格留白，
       所以那是合法形状（verify-ledger 用 /^\|\s*MP-/ 数得到它们），但这里之前写死
       `^\| MP-` ⇒ 这 65 行的格子永远改不动：lane 实测命中 0 行直接 FAIL，
       只能把已经验过的结论挂在计划的 blocked 段里。改成同一个可选留白的匹配。
       重建时会统一补上 "| "，所以被改过的行会自愈成常规形状。 */
    if (!/^\|\s*MP-/.test(l)) return;
    const c = l.split("|").map((s) => s.trim());
    if (c[1] === p.id) hits.push({ i, c });
  });
  if (hits.length !== 1) die(`${p.id} 命中 ${hits.length} 行（要求恰好 1 行；不猜）`, 1);
  const { i, c } = hits[0];
  const idx = p.col;
  if (idx < 1 || idx >= c.length - 1) die(`${p.id} 列号 ${idx} 越界（该行只有 ${c.length - 2} 列）`, 1);
  const before = c[idx];
  c[idx] = p.new;
  const rebuilt = "| " + c.slice(1, c.length - 1).join(" | ") + " |";
  if (rebuilt.split("|").length !== lines[i].split("|").length) die(`${p.id} 改写后列数变了（${lines[i].split("|").length}→${rebuilt.split("|").length}），不写`, 1);
  changes.push({ line: i + 1, id: p.id, col: idx, before: before.slice(0, 90), after: p.new.slice(0, 90), why: p.why || "" });
  lines[i] = rebuilt;
}
for (const ch of changes) console.log(`CELL id=${ch.id} line=${ch.line} col=${ch.col}\n  before=${JSON.stringify(ch.before)}\n  after =${JSON.stringify(ch.after)}\n  why   =${ch.why}`);
console.log(`CELLPATCH_PLANNED=${changes.length} ledger=${rel(LEDGER)}`);
if (!APPLY) { console.log("CELLPATCH_RESULT=DRY 加 --apply 才写盘"); process.exit(0); }
copyFileSync(LEDGER, LEDGER + ".pre-cellpatch.bak");
writeFileSync(LEDGER, lines.join("\n"));
console.log(`CELLPATCH_WRITTEN=${rel(LEDGER)} backup=${rel(LEDGER)}.pre-cellpatch.bak`);
console.log("CELLPATCH_RESULT=OK");
