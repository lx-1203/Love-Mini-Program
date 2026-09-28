#!/usr/bin/env node
/* 把台账里 ⟨…⟩ 说明壳内的子句分隔符换成空格。
   为什么要这一步：判据台先按子句切分再抽判点，一个跨了「。」「、」的长壳会被劈成
   "只有开壳的前半 + 只有闭壳的后半"，前半的未闭合壳会把它后面所有真判点一起吃掉
   （实测 unbalanced=1、生产数据上被抑制 42 个候选 token）。壳内不留分隔符 ⇒ 壳永远落在单个子句内。
   【§96.2 补全】本脚本旧版只建模 `。；` 一族分隔符，不建模"变更动词切句"——判据台的
   clausesOf 还会在 firstVerbIndex 的动词处把子句剪成 pre｜post，壳里含这类词一样被剪成半只壳，
   而这里 spans-with-delimiter=0 检不出来（当时靠人肉把壳换成纯名词短语）。现在两个工具共用
   change-verbs.cjs 的同一份数组：本脚本对"壳内含变更动词"计数并显式告警（动词不是分隔符，
   不能靠替换成空格"归一化"——那会篡改台账语义，处置是把壳改写成纯名词短语，这是人的活）。
   用法：node scripts/qa/normalize-bracket-spans.mjs [--ledger <path>] [--apply] [--strict-verb-shells] */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const CHV = require("./change-verbs.cjs");
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? resolve(ROOT, process.argv[i + 1]) : d; };
/* arg() 自己补 "--"，调用方只传裸名；传 "--ledger" 会静默回落到默认值（同批脚本里实测踩过） */
const LEDGER = arg("ledger", resolve(ROOT, "reports/audit/round-6/issue-matrix.md"));
const APPLY = process.argv.includes("--apply");
const STRICT_VERB = process.argv.includes("--strict-verb-shells");
const DELIM = /[。；，、：]/g;

if (!existsSync(LEDGER)) { console.log("BRACKETNORM_RESULT=FAIL reason=台账不存在 " + LEDGER); process.exit(2); }
const src = readFileSync(LEDGER, "utf8");
const lines = src.split(/\r?\n/);
let spans = 0, dirty = 0, changed = 0, straddle = 0;
let verbSpans = 0;
const verbSamples = [];
const out = lines.map((L) => {
  /* 变更动词壳：不管含不含分隔符，逐行统计并点名（这条轴和归一化动作正交，先于早退分支跑）。 */
  if (L.includes("⟨")) {
    for (const h of CHV.verbStraddlingSpans(L)) {
      verbSpans++;
      if (verbSamples.length < 6) verbSamples.push(h.inner.slice(0, 60));
    }
  }
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
console.log(`BRACKETNORM ledger=${LEDGER.replace(ROOT + "/", "")} spans=${spans} spans-with-delimiter=${changed} spans-with-change-verb=${verbSpans} residual=${residual} pairs ${afterOpen}/${afterClose} emptyOrStraddling=${straddle}`);
/* 变更动词壳不能被"换成空格"修掉（见头注），只能显式告警 + 可选否决；词表与切句器同源（change-verbs.cjs），
   所以这里报 0 才真的等价于"切句器剪不到任何壳"。 */
for (const s of verbSamples) console.log("  VERB_SHELL " + s);
if (verbSpans) console.log(`BRACKETNORM_VERB_WARN=${verbSpans} 个壳内含变更动词（切句器 clausesOf 会在动词处剪成半只壳，真判点会被吞）⇒ 处置=把该壳改写成纯名词短语；--strict-verb-shells 可让本脚本报红`);
if (!spans) { console.log("BRACKETNORM_RESULT=FAIL reason=一个壳都没找到 ⇒ 要么约定没落地，要么扫错了文件（零输入不得判绿）"); process.exit(2); }
if (afterOpen !== afterClose) { console.log("BRACKETNORM_RESULT=FAIL reason=改完开闭壳数量不等，会误伤真判点"); process.exit(2); }
if (residual) { console.log("BRACKETNORM_RESULT=FAIL reason=仍有壳内含子句分隔符"); process.exit(2); }
if (verbSpans && STRICT_VERB) { console.log(`BRACKETNORM_RESULT=FAIL reason=有 ${verbSpans} 个壳内含变更动词（--strict-verb-shells 生效，判据台侧的 PROSE_BRACKET_VERB 同数）`); process.exit(2); }
if (!APPLY) { console.log("BRACKETNORM_RESULT=DRY 加 --apply 才写盘"); process.exit(0); }
writeFileSync(LEDGER + ".pre-bracketnorm.bak", src);
writeFileSync(LEDGER, out.join("\n"));
console.log("BRACKETNORM_RESULT=OK 写盘 " + changed + " 个壳（备份 .pre-bracketnorm.bak）");
