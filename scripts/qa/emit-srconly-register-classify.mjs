#!/usr/bin/env node
/** 把 `verify-frame-debt-coverage --strict-src-only` 报出的 FRAMECOV_SRC_OWED 行，
 *  自动转成 `emit-openrow-register.mjs` 能吃的复判文件（#77 的载体）。
 *
 *  为什么要有这个脚本而不是手抄 13 个 id：
 *   1) 名单由门给 —— 门改口径（比如把"源码级判点"这个词换掉）时，手抄的名单会开始登记
 *      一批已经不属于那一桶的行；这里每次都现跑门、现取 ids。
 *   2) reason 与 nextCarrier 全部取自台账那一行**自己写过的话**（状态列的括号说明 + 证据列 + 处置列），
 *      不是我另写一句"帧判不了"。缺话的行会被登记器拒绝，而不是被我编一句话糊过去。
 *
 *  用法：node scripts/qa/emit-srconly-register-classify.mjs [--out tmp/qa/srconly-owed-plan.json]
 *                                                      [--matrix reports/audit/round-6/issue-matrix.md]
 *  下一步：node scripts/qa/emit-openrow-register.mjs --classify <这份> [--apply]
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf("--" + k); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
{
  const KNOWN = ["out", "matrix", "gate"];
  const bad = argv.filter((a) => a.startsWith("--") && !KNOWN.includes(a.slice(2)));
  if (bad.length) { console.log("SRCONLYPLAN_RESULT=FAIL reason=不认识的旗标 " + bad.join(",")); process.exit(2); }
}
const OUT = resolve(REPO, arg("out", "tmp/qa/srconly-owed-plan.json"));
const MATRIX = arg("matrix", "reports/audit/round-6/issue-matrix.md");
const GATE = arg("gate", "scripts/qa/verify-frame-debt-coverage.mjs");

let out = "";
try {
  out = execFileSync(process.execPath, [resolve(REPO, GATE), "--strict-src-only"], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
} catch (e) {
  /* 这条判据按设计就是红的（有行没登记）；红不等于读不到名单。 */
  if (!e || typeof e.stdout !== "string" || !/FRAMECOV_SRC_OWED/.test(e.stdout)) throw e;
  out = e.stdout;
}
const ids = [...out.matchAll(/FRAMECOV_SRC_OWED\s+(\S+)/g)].map((m) => m[1]);
if (!ids.length) { console.log("SRCONLYPLAN_RESULT=FAIL reason=门没报出任何 SRC_OWED 行 ⇒ 没有要登记的东西（空集不许当成「都登记过了」）"); process.exit(2); }

/* 台账列序（11 个数据列）：1 新号 2 历史别名 3 页面 4 类别 5 severity 6 status 7 置信
   8 证据 9 statusEvidence 10 理想图依据 11 处置 */
const COL = { id: 1, page: 3, status: 6, ev: 8, statusEv: 9, disp: 11 };
const txt = (c, i) => String(c[i] ?? "").trim();
const led = new Map();
for (const line of readFileSync(resolve(REPO, MATRIX), "utf8").split(/\r?\n/)) {
  if (!/^\|\s*MP-/.test(line)) continue;
  const c = line.split("|");
  led.set(txt(c, COL.id), { page: txt(c, COL.page), status: txt(c, COL.status), ev: txt(c, COL.ev), statusEv: txt(c, COL.statusEv), disp: txt(c, COL.disp) });
}

const rows = [], refused = [];
for (const id of ids) {
  const r = led.get(id);
  if (!r) { refused.push(`${id} 在台账里找不到那一行（门的名单与台账不同源？先查门）`); continue; }
  /* 状态列括号里那句就是这行自己的声明："为什么不是帧判" —— 登记用它，不改写。 */
  const declared = /\(([^)]{12,})\)/.exec(r.status) || /（([^）]{12,})）/.exec(r.status);
  const reason = [
    declared ? `状态列自己的声明：「${declared[1].trim()}」` : `状态列没写括号声明（原样：${r.status.slice(0, 60)}）`,
    r.ev ? `证据列（判点所在）：${r.ev.slice(0, 200)}` : "证据列为空",
    r.statusEv ? `statusEvidence：${r.statusEv.slice(0, 220)}` : "",
  ].filter(Boolean).join(" ｜ ");
  const carrier = (r.disp || r.statusEv || "").slice(0, 300) ||
    "把这条的静态判点写成一个会红的核对（谓词 + 载体脚本名），或把它改判成能被帧判的物件断语并进取景配方";
  rows.push({
    id,
    verdict: "NOT_FRAME_JUDGEABLE",
    reason: reason.slice(0, 700),
    carrierOrPlanRow: { nextCarrier: carrier, carrier: carrier.slice(0, 160) },
    quote: (declared ? declared[1] : r.status).slice(0, 160),
  });
}
if (!rows.length) { console.log("SRCONLYPLAN_RESULT=FAIL reason=一条都没派生出来；拒绝=" + refused.length); for (const x of refused) console.log("  REFUSE " + x); process.exit(2); }
writeFileSync(OUT, JSON.stringify({
  $comment: "由 scripts/qa/emit-srconly-register-classify.mjs 现场派生：ids 取自 verify-frame-debt-coverage --strict-src-only 的 FRAMECOV_SRC_OWED 行，reason/nextCarrier 取自台账那一行自己的状态列括号声明 + 证据列 + 处置列（不是另写一句）。",
  $gate: `node ${GATE} --strict-src-only`,
  $matrix: MATRIX,
  generatedAt: new Date().toISOString(),
  rows,
}, null, 1) + "\n");
console.log(`SRCONLYPLAN ids=${ids.length} 派生=${rows.length} 拒绝=${refused.length} → ${OUT.replace(REPO + "/", "")}`);
for (const x of refused) console.log("  REFUSE " + x);
for (const r of rows.slice(0, 4)) console.log("  样例 " + r.id + " :: " + r.reason.slice(0, 110));
console.log("SRCONLYPLAN_RESULT=OK 下一步：emit-openrow-register.mjs --classify 这份（先 dry 再 --apply）");
