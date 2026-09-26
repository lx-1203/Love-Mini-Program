/* verify-ledger 的 status 值域核对（§79）自带负样本测试。
   动机：这一轮我写过的"永不失败检查器"已经抓到 5 个，所以新加的任何判据必须先证明
   它在该红的时候真的红 —— 尤其是「不立账」这种**我自己加进受控词表**的词：
   如果它放在哪都合法，那它就是"把真缺陷标成不立账即可脱离追踪"的后门。
   用法：node scripts/qa/test-ledger-status-vocab.cjs
   自判：每个用例都同时断言"计数字段存在"和"计数值"，防止解析器读不到字段时判绿。 */
"use strict";
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const REPO = path.resolve(__dirname, "..", "..");
const GATE = path.join(REPO, "scripts", "qa", "verify-ledger.mjs");
const NODE = process.execPath;

const HDR = "| id | alias | page | category | severity | status | conf | evidence | statusEvidence | idealRef | 处置 |";
const SEP = "|" + Array.from({ length: 11 }, () => "---").join("|") + "|";
const row = (id, status) => [ "", id, "异体", "pages/x/index", "类别", "P1", status, "0.9", "evidence:1", "状态证据", "理想稿", "处置说明", "" ].join("|");

function ledger(rowsInSec1, noiseRows) {
  const parts = ["# 测试台账", "", "## 一、本轮本尊行", HDR, SEP].concat(rowsInSec1);
  if (noiseRows) {
    parts.push("", "## 四、NOISE 不予立账（逐条处置）", HDR, SEP);
    noiseRows.forEach((r) => parts.push(r));
    parts.push("", "## 五、门禁可核性说明", "说明文字");
  }
  return parts.join("\n") + "\n";
}

function run(fixture) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ledgervocab-"));
  fs.writeFileSync(path.join(dir, "issue-matrix.md"), fixture);
  const r = spawnSync(NODE, [GATE, dir], { encoding: "utf8" });
  fs.rmSync(dir, { recursive: true, force: true });
  const out = (r.stdout || "") + (r.stderr || "");
  const num = (k) => { const m = out.match(new RegExp(k + "=(\\d+)")); return m ? Number(m[1]) : null; };
  return { vocab: num("STATUS_VOCAB_BAD"), off: num("OFF_SCHEMA_ROWS"), out };
}

let fails = 0, checks = 0;
function t(name, cond, detail) {
  checks++;
  if (!cond) { fails++; console.log("FAIL " + name + (detail ? " :: " + detail : "")); }
  else console.log("ok   " + name);
}

/* 1) 正样本：不立账在「不予立账」小节内 = 合法，且扫描集非空（不是"没东西可判所以绿"） */
{
  const r = run(ledger([row("MP-T-OK-001", "待修复")], [row("MP-T-GHOST-001", "不立账")]));
  t("clean: 字段可读", r.vocab !== null && r.off !== null, JSON.stringify(r).slice(0, 160));
  t("clean: 小节内不立账 → STATUS_VOCAB_BAD=0", r.vocab === 0, "got " + r.vocab);
  t("clean: 扫描集非空 → DATA_ROWS 至少 2 行", /DATA_ROWS=([2-9]|\d{2,})\b/.test(r.out), r.out.match(/DATA_ROWS=\d+/)?.[0]);
}
/* 2) 负样本：同一个"不立账"搬到第一节 = 后门，必须红 */
{
  const r = run(ledger([row("MP-T-BACKDOOR-001", "不立账")], [row("MP-T-GHOST-002", "不立账")]));
  t("backdoor: 第一节的不立账 → STATUS_VOCAB_BAD>=1", r.vocab >= 1, "got " + r.vocab);
  t("backdoor: 报的是越节，不是值域外", /不立账只允许出现在/.test(r.out), r.out.split("\n").filter((l) => /STATUS_VOCAB/.test(l)).slice(0, 2).join(" ⏎ "));
}
/* 3) 负样本：整篇没有「不予立账」小节时，不立账一律不合法（防"找不到节⇒全放行"） */
{
  const r = run(ledger([row("MP-T-NOSEC-001", "不立账")], null));
  t("no-section: STATUS_VOCAB_BAD>=1", r.vocab >= 1, "got " + r.vocab);
}
/* 4) 负样本：status 列坐着一整段散文（§79 的真实成因） */
{
  const r = run(ledger([row("MP-T-PROSE-001", "【源码复核推翻 finding 的 status=待修复】正文其实是一段处置说明")], null));
  t("prose: STATUS_VOCAB_BAD>=1", r.vocab >= 1, "got " + r.vocab);
}
/* 5) 负样本：空 status（§61 补齐 4 列行留下的洞） */
{
  const r = run(ledger([row("MP-T-EMPTY-001", "")], null));
  t("empty: STATUS_VOCAB_BAD>=1", r.vocab >= 1, "got " + r.vocab);
}
/* 6) 值域核对不得替形状核对漏报：错位 10 列行由 OFF_SCHEMA 报，不能两边都 0 */
{
  const bad10 = row("MP-T-SHAPE-001", "待修复").split("|").slice(0, -2).join("|") + "|";
  if (bad10.split("|").length - 2 !== 10) { console.log(`LVOCAB_SUMMARY checks=0 fail=1\nLVOCAB_TEST=FAIL fixture: bad10 实际 ${bad10.split("|").length - 2} 列，不是 10 列（用例自证失败）`); process.exit(1); }
  const r = run(ledger([bad10], null));
  t("shape: 10 列行 → OFF_SCHEMA_ROWS>=1", r.off >= 1, "got " + r.off);
}
/* 7) 受控词 + 括注 是合法写法（真实台账里 `已修复待复验（本轮收口…）` 很多） */
{
  const r = run(ledger([row("MP-T-PAREN-001", "已修复待复验（本轮收口落工作树，待下一轮复验）")], null));
  t("paren: 词+括注 → STATUS_VOCAB_BAD=0", r.vocab === 0, "got " + r.vocab);
}

/* 自报行必须同时满足聚合器（run-qa-selftests.mjs）认的两种既有口径：
   `^XX_SUMMARY ... fail=N` 给断言计数、`XX_TEST=PASS` 给判据 —— 前缀限 2–8 个大写字母。
   首版我写成 LEDGERVOCAB_RESULT=PASS（11 个字母、也没有 fail= 计数），
   聚合器如实判"无自报断言计数（不可信）"，那是我这条自报没达标，不是门禁坏了。 */
console.log(`LVOCAB_SUMMARY checks=${checks} fail=${fails}`);
console.log(`LVOCAB_TEST=${fails ? "FAIL" : "PASS"}`);
process.exit(fails ? 1 : 0);
