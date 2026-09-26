#!/usr/bin/env node
/* 修台账里「被转置的行」——第 16 轮账目归一化时把 6 列的 lane brief 直接补成 11 列，
   结果这几行的列语义整体错位：页面列装的是判据台判决（STILL_OPEN / FIXED_IN_HEAD），
   类别列装的是状态文本，severity 列装的是 file:line。列数对得上，所以按列数判的形状门禁看不见它，
   但判据台按列名取值 ⇒ 这些行的判决是从错误的格子里抠出来的（实测 4 条被判 NEEDS_UI_FRAME / UNDECIDABLE）。
 *
 * 只修「页面列是一个全大写判决词」的行——这个特征不会误伤：
 *   · 页面列本来就写源文件的行（config/images.ts、theme/design-variables.scss 等）不动，那是可辩护的取值；
 *   · 正常行的页面列是路由（pages/... 或 subpackages/...）。
 *
 * 无损约束（不满足就不写盘）：原行每个非空格子的文本，必须在修后的整行里仍然出现。
 * 也就是说本脚本只做「把内容搬回正确的格子」，不删字、不改判、不编造 severity。
 *
 * 用法：node scripts/qa/repair-rotated-ledger-rows.mjs [--apply] [--ledger <相对路径>]
 *       默认 dry-run，只打计划。备份写到 tmp/。 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const REPO = resolve(import.meta.dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const REL = arg("ledger", "reports/audit/round-6/issue-matrix.md");
const APPLY = process.argv.includes("--apply");
const PATH = join(REPO, REL);
if (!existsSync(PATH)) { console.log("REPAIR_RESULT=FAIL reason=台账不存在 " + REL); process.exit(2); }

const VERDICT_CELL = /^[A-Z][A-Z_0-9]{3,}$/;
const src = readFileSync(PATH, "utf8");
const nl = src.includes("\r\n") ? "\r\n" : "\n";
const lines = src.split(/\r?\n/);

const plan = [];
const out = lines.map((l, i) => {
  if (!/^\|\s*MP-/.test(l)) return l;
  const parts = l.split("|");
  const cell = (n) => (parts[n + 1] || "").trim();
  const page = cell(2);
  if (!VERDICT_CELL.test(page)) return l;
  const alias = cell(1), verdictText = cell(2), statusText = cell(3), srcLine = cell(4);
  const status = cell(5), conf = cell(6), evid = cell(7), statEvid = cell(8), ideal = cell(9), action = cell(10);
  /* 页面：从 severity 格子里那条 file:line 反推。台账口径是**完整路由**（pages/home/index 这种，
       实测 23 行都这么写），所以 pages|x/ 与 subpackages|a|b|c/ 下的 .vue 直接把扩展名去掉当路由；
       非路由文件（utils/…、stores/…、components/…）保留相对路径带扩展名，与其它「文件级」行一致。 */
  const m = /apps\/client\/src\/([^\s:]+\.(?:vue|ts|js|scss))/.exec(srcLine);
  const rel = m ? m[1] : "";
  let pageFixed = "";
  if (/^pages\//.test(rel) || /^subpackages\//.test(rel)) pageFixed = rel.replace(/\.vue$/, "");
  else pageFixed = rel || (srcLine.split(" ")[0] || "").replace(/^apps\/client\/src\//, "").replace(/:.*$/, "");
  /* 搬回去，不丢字：原判词与原状态文本进处置，severity 明确标「未评」而不是编一个。 */
  const actionFixed = action + " 〔转置修复 §23：原「页面」格装的是判据台判决 " + verdictText +
    "，原「类别」格装的是状态文本 " + statusText + "，原「severity」格装的是 " + srcLine +
    "；三者已搬回本行处置，页面按源文件反推，severity 记未评而不是编造等级〕";
  const np = [parts[0], (parts[1] || "").trim(), alias, pageFixed, "并案/回归行", "(未评，并案行)", status, conf, evid, statEvid, ideal, actionFixed];
  const fixed = "| " + np.slice(1).join(" | ") + " |";
  plan.push({ line: i + 1, id: (parts[1] || "").trim(), before: { page, verdictText, statusText, srcLine }, after: { page: pageFixed } });
  const lost = [alias, page, statusText, srcLine, status, evid, statEvid, ideal, action].filter((s) => s && !fixed.includes(s));
  if (lost.length) { plan[plan.length - 1].lost = lost.map((s) => s.slice(0, 40)); }
  return fixed;
});

const lostAny = plan.filter((p) => p.lost && p.lost.length);
console.log("REPAIR_SCANNED rows=" + plan.length + " 无损校验失败=" + lostAny.length);
plan.forEach((p) => console.log("  :" + p.line + " " + p.id + " 页面 " + JSON.stringify(p.before.page) + " ⇒ " + JSON.stringify(p.after.page) +
  (p.lost ? " LOST=" + JSON.stringify(p.lost) : "")));
if (!plan.length) { console.log("REPAIR_RESULT=OK reason=没有转置行（这条判据现在成立，下次跑还能看见它）"); process.exit(0); }
if (lostAny.length) { console.log("REPAIR_RESULT=FAIL reason=" + lostAny.length + " 行搬运会丢字 ⇒ 不写盘"); process.exit(2); }
if (!APPLY) { console.log("REPAIR_RESULT=DRYRUN 加 --apply 才写盘"); process.exit(0); }
const bak = join(REPO, "tmp", "issue-matrix.pre-rotate-fix.md");
if (!existsSync(bak)) writeFileSync(bak, src);
writeFileSync(PATH, out.join(nl));
console.log("REPAIR_RESULT=APPLIED rows=" + plan.length + " 备份=" + bak.split("\\").join("/"));
