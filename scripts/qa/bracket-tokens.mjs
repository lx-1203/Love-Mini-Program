#!/usr/bin/env node
/* 把台账某一行 col 11 里指定的 token 逐个包进 ⟨⟩（说明壳），使判据台不再把它们抽成硬判点。
   为什么需要这个脚本而不是一次次手写整格：手写整格会把说明写成新的判点来源
   （本轮实测：改写证据格完全无效，因为判点是 col 11 抽的；而在 col 11 里写"原判点 FooBar 已作废"
   又让 FooBar 变成第二条假指控）。逐 token 包壳是唯一能被机器验收的形状。
   用法：node scripts/qa/bracket-tokens.mjs --plan <json> [--apply]
   plan: { "patches": [ { "id": "MP-...", "tokens": ["FooBar", "console.warn"], "why": "..." } ] } */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? resolve(ROOT, process.argv[i + 1]) : d; };
/* 注意：arg() 自己补 "--"，所以调用方只能传裸名。传 "--plan" 会变成找 "----plan"，
   参数被静默忽略、回落到默认值（本轮实测踩过一次，靠 --plan 缺失的 FAIL 才现形）。 */
const LEDGER = arg("ledger", resolve(ROOT, "reports/audit/round-6/issue-matrix.md"));
const PLAN = arg("plan", "");
const APPLY = process.argv.includes("--apply");
if (!PLAN || !existsSync(PLAN)) { console.log("BRACKETT_RESULT=FAIL reason=缺 --plan"); process.exit(2); }

const plan = JSON.parse(readFileSync(PLAN, "utf8"));
const lines = readFileSync(LEDGER, "utf8").split(/\r?\n/);
const idx = new Map();
lines.forEach((l, i) => {
  if (!/^\| MP-/.test(l)) return;
  const id = (l.split("|").slice(1, -1)[0] || "").trim();
  if (!idx.has(id)) idx.set(id, i);
});

let planned = 0, wrapped = 0, missing = 0, already = 0, colBad = 0;
for (const p of plan.patches || []) {
  const li = idx.get(p.id);
  if (li === undefined) { console.log(`MISSING_ID ${p.id}（台账里找不到本尊行）`); missing++; continue; }
  const cells = lines[li].split("|").slice(1, -1);
  if (cells.length !== 11) { console.log(`COLCOUNT_BAD ${p.id} 列数=${cells.length}（应为 11，不动这一行）`); colBad++; continue; }
  const target = p.col ? Number(p.col) - 1 : 10;
  if (!(target >= 0 && target < cells.length)) { console.log(`COL_BAD ${p.id} col=${p.col}（这一行只有 ${cells.length} 列）`); colBad++; continue; }
  let c = cells[target];
  let touched = 0;
  /* 只在"壳外"替换：一个已经在 ⟨…⟩ 里的 token 再包一层会产生嵌套壳，
     而抽取器按"第一个 ⟩ 收尾"来剥壳，嵌套会让壳后半段重新变成裸文本 ⇒ 造出新判点。 */
  const wrapOutside = (text, tok) => {
    let out = "", last = 0, n = 0;
    const re = /⟨[^⟩]*⟩?/g;
    let m;
    const spans = [];
    while ((m = re.exec(text))) spans.push([m.index, m.index + m[0].length]);
    const inSpan = (i) => spans.some(([a, b]) => i >= a && i < b);
    let i = 0;
    while (i < text.length) {
      const at = text.indexOf(tok, i);
      if (at < 0) { out += text.slice(i); break; }
      out += text.slice(i, at);
      if (inSpan(at)) { out += tok; }
      else { out += "⟨" + tok + "⟩"; n++; }
      i = at + tok.length;
    }
    return [out, n];
  };
  for (const t of p.tokens || []) {
    const [nc, n] = wrapOutside(c, t);
    if (!n) {
      if (c.includes(t)) { already++; continue; }
      console.log(`TOKEN_ABSENT ${p.id} :: ${t}（这一格里没有这个词，说明格已被改过或 token 写错）`);
      missing++; continue;
    }
    c = nc; touched += n;
  }
  if (!touched) continue;
  if (p.append) {
    /* 追加句只允许中文 + ⟨⟩：任何裸 Latin token 都会被抽取器当成新判点（这是本工具存在的理由） */
    if (/[A-Za-z_$][A-Za-z0-9_$]{3,}/.test(String(p.append).replace(/⟨[^⟩]*⟩/g, " "))) {
      console.log(`APPEND_REJECT ${p.id}：追加句里有裸标识，会自己造判点`);
      missing++; continue;
    }
    c = c.replace(/\s+$/, "") + " " + p.append;
  }
  cells[target] = " " + c + " ";
  lines[li] = "|" + cells.join("|") + "|";
  planned++; wrapped += touched;
  console.log(`WRAP id=${p.id} line=${li + 1} tokens-wrapped=${touched}${p.why ? " why=" + p.why : ""}`);
}
/* 守恒：包完必须仍然成对，且列数不变 */
const open = lines.reduce((a, l) => a + (l.match(/⟨/g) || []).length, 0);
const close = lines.reduce((a, l) => a + (l.match(/⟩/g) || []).length, 0);
console.log(`BRACKETT planned=${planned} wrapped-occurrences=${wrapped} token-not-found-or-missing-id=${missing} already-wrapped=${already} colcount-rejected=${colBad} pairs ${open}/${close}`);
if (open !== close) { console.log("BRACKETT_RESULT=FAIL reason=开闭壳不等，会误伤真判点"); process.exit(2); }
if (!wrapped) { console.log("BRACKETT_RESULT=FAIL reason=一个 token 都没包上 ⇒ 计划与台账对不上，不得当已处理"); process.exit(2); }
if (!APPLY) { console.log("BRACKETT_RESULT=DRY 加 --apply 才写盘"); process.exit(0); }
writeFileSync(LEDGER + ".pre-brackett.bak", readFileSync(LEDGER, "utf8"));
writeFileSync(LEDGER, lines.join("\n"));
console.log("BRACKETT_RESULT=OK 写盘（备份 .pre-brackett.bak）");
