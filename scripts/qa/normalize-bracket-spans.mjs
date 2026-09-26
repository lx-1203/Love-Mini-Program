#!/usr/bin/env node
/* 把台账里 ⟨…⟩ 说明壳内的子句分隔符换成空格。
   为什么要这一步：判据台先按子句切分再抽判点，一个跨了「。」「、」的长壳会被劈成
   "只有开壳的前半 + 只有闭壳的后半"，前半的未闭合壳会把它后面所有真判点一起吃掉
   （实测 unbalanced=1、生产数据上被抑制 42 个候选 token）。壳内不留分隔符 ⇒ 壳永远落在单个子句内。
   用法：node scripts/qa/normalize-bracket-spans.mjs [--ledger <path>] [--apply] */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? resolve(ROOT, process.argv[i + 1]) : d; };
/* arg() 自己补 "--"，调用方只传裸名；传 "--ledger" 会静默回落到默认值（同批脚本里实测踩过） */
const LEDGER = arg("ledger", resolve(ROOT, "reports/audit/round-6/issue-matrix.md"));
const APPLY = process.argv.includes("--apply");
const DELIM = /[。；，、：]/g;

if (!existsSync(LEDGER)) { console.log("BRACKETNORM_RESULT=FAIL reason=台账不存在 " + LEDGER); process.exit(2); }
const src = readFileSync(LEDGER, "utf8");
const lines = src.split(/\r?\n/);
let spans = 0, dirty = 0, changed = 0, straddle = 0;
const out = lines.map((L) => {
  if (!L.includes("⟨")) return L;
  let n = 0;
  const fixed = L.replace(/⟨([^⟩]*)⟩?/g, (m, inner) => {
    n++;
    if (!inner) { straddle++; return m; }
    const hits = (inner.match(DELIM) || []).length;
    dirty += hits ? 1 : 0;
    if (!hits) return m;
    changed++;
    return "⟨" + inner.replace(DELIM, " ") + "⟩";
  });
  spans += n;
  return fixed;
});
/* 守恒：改完之后仍然成对，且没有任何壳内含分隔符 */
const afterOpen = out.reduce((a, l) => a + (l.match(/⟨/g) || []).length, 0);
const afterClose = out.reduce((a, l) => a + (l.match(/⟩/g) || []).length, 0);
const residual = out.filter((l) => /⟨[^⟩]*[。；，、：][^⟩]*⟩/.test(l)).length;
console.log(`BRACKETNORM ledger=${LEDGER.replace(ROOT + "/", "")} spans=${spans} spans-with-delimiter=${changed} residual=${residual} pairs ${afterOpen}/${afterClose} emptyOrStraddling=${straddle}`);
if (!spans) { console.log("BRACKETNORM_RESULT=FAIL reason=一个壳都没找到 ⇒ 要么约定没落地，要么扫错了文件（零输入不得判绿）"); process.exit(2); }
if (afterOpen !== afterClose) { console.log("BRACKETNORM_RESULT=FAIL reason=改完开闭壳数量不等，会误伤真判点"); process.exit(2); }
if (residual) { console.log("BRACKETNORM_RESULT=FAIL reason=仍有壳内含子句分隔符"); process.exit(2); }
if (!APPLY) { console.log("BRACKETNORM_RESULT=DRY 加 --apply 才写盘"); process.exit(0); }
writeFileSync(LEDGER + ".pre-bracketnorm.bak", src);
writeFileSync(LEDGER, out.join("\n"));
console.log("BRACKETNORM_RESULT=OK 写盘 " + changed + " 个壳（备份 .pre-bracketnorm.bak）");
