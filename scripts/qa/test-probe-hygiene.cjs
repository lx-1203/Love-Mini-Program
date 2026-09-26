/* 判点抽取器（verify-fixes-against-artifact.cjs 的 probesFrom/refine）回归测试。
   为什么单独立一个：本轮 NOT_IN_EITHER 从 5 涨到 7，查下去发现**不是"没修"，是我把取证散文
   写进了结构化列，抽取器照着 markdown 抠判点**：
     token=`font-size:56rpx}\``（反引号是散文的收尾）、`background:var(--c-bg-page)…}\``、
     甚至整条命令 `grep -rn f6fbfc apps/client/src` 被当 string-lit 判点。
   这类"假指控"会把已落地的修复打成没修，比假绿更难发现 —— 因为它看起来像工具在报坏消息。
   用法：node scripts/qa/test-probe-hygiene.cjs
   断言一律打在**真实语料**上（116 条），不放行任何"扫描集为空所以绿"。 */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const REPO = path.resolve(__dirname, "..", "..");
const TOOL = path.join(REPO, "scripts", "qa", "verify-fixes-against-artifact.cjs");
const OUT = path.join(REPO, ".zcode", "tmp", "fixverify", "verdicts.json");
const BASELINE = path.join(REPO, ".zcode", "tmp", "fixverify", "verdicts.pre-probe-hygiene.json");

let fails = 0, checks = 0;
function t(name, cond, detail) {
  checks++;
  if (!cond) { fails++; console.log("FAIL " + name + (detail ? " :: " + String(detail).slice(0, 220) : "")); }
  else console.log("ok   " + name);
}

let out = "";
try {
  out = execFileSync(process.execPath, [TOOL], { cwd: REPO, encoding: "utf8", timeout: 240000, maxBuffer: 64 * 1024 * 1024 });
} catch (e) {
  console.log("PH_ABORT 工具本身没跑起来：" + (e && (e.stdout || e.message)));
  console.log("PH_TEST=FAIL\nPH_SUMMARY checks=1 fail=1");
  process.exit(1);
}
const v = JSON.parse(fs.readFileSync(OUT, "utf8"));
const items = Array.isArray(v) ? v : (v.items || []);
const byId = (id) => items.find((x) => x.id === id);

t("语料非空且五桶守恒（116 条不许静默缩水）", items.length === 116, "items=" + items.length);
t("CONSERVED=yes", /CONSERVED=yes/.test(out), out.split("\n").filter((l) => /FIXVERIFY_RESULT|CONSERVATION/.test(l)).join(" ⏎ "));

const allProbes = items.reduce((a, x) => a.concat(x.probes || []), []);
t("判点总量非空", allProbes.length > 100, "probes=" + allProbes.length);
const junk = allProbes.filter((p) => /[`{}」『』【】]/.test(String(p.token)));
t("没有判点带 markdown/代码外壳（反引号·花括号·全角引号）", junk.length === 0, junk.slice(0, 4).map((p) => JSON.stringify(p.token)).join(" , "));
const cmds = allProbes.filter((p) => /^\s*(grep|awk|sed|find|node|npm|cd|ls|cat|head|tail|wc|stat|git)\s/i.test(String(p.token)));
t("没有判点是一条 shell 命令", cmds.length === 0, cmds.slice(0, 3).map((p) => JSON.stringify(p.token)).join(" , "));

/* 反向对照：这三条正是收紧前被外壳判点冤枉的条目，现在必须回到各自该有的桶 */
const m001 = byId("MP-R2VIS-PAGES-MESSAGES-INDEX-001");
const m003 = byId("MP-R2VIS-PAGES-MESSAGES-INDEX-003");
t("MESSAGES-001 不再被假判点冤枉（ARTIFACT_VERIFIED）", m001 && m001.verdict === "ARTIFACT_VERIFIED", m001 && (m001.verdict + " / " + m001.verdictWhy));
t("MESSAGES-003 与 §79 人工核对一致（同一条判点两条独立路径同结论）", m003 && m003.verdict === "ARTIFACT_VERIFIED", m003 && m003.verdict);
const m002 = byId("MP-R2VIS-SUBPACKAGES-DISCOVER-EXTRA-DISCOVER-MATCHING-002");
t("MATCHING-002 的绿不是靠去重顺序丢掉的", m002 && m002.verdict === "ARTIFACT_VERIFIED", m002 && m002.verdict);

/* 跨子句去重必须保留更硬的来源：closer-diff 与顺手抠出的散文同名判点合并后仍是 hard */
const hardOf = (x, tok) => ((x && x.probes) || []).filter((p) => p.token === tok && p.hard).length;
t("MATCHING-002 的 background 判点仍按 closer-diff 记硬", hardOf(m002, "background:var(--c-gradient-match)") === 1,
  m002 && JSON.stringify((m002.probes || []).map((p) => p.kind + ":" + p.token + (p.hard ? "(H)" : "(s)"))));

/* NIE 全仓源码回落：每条 NIE 必须各打印一行，且不许用"命令跑挂了"冒充 0 命中 */
const nie = items.filter((x) => x.verdict === "NOT_IN_EITHER");
const nieLines = out.split("\n").filter((l) => /NIE_SCOPE_CHECK /.test(l));
t("NIE 条数与回落观测行数一致（不许多也不漏）", nie.length === nieLines.length, "nie=" + nie.length + " lines=" + nieLines.length);
t("NIE 桶非空（否则本测试的这条判据是空转）", nie.length > 0, "nie=0");
t("回落口径写明『只记观测不改判』", /NIE_SOURCE_FALLBACK/.test(out) && /不改判/.test(out), out.split("\n").filter((l) => /NIE_SOURCE_FALLBACK/.test(l)).join(" ⏎ "));

/* 收紧不得把真判点一并杀掉：这些 token 在收紧前后都必须在册 */
const mustKeep = ["--c-bg-page", "background:var(--c-gradient-match)", "--page-padding", "not-logged__btn"];
mustKeep.forEach((tok) => {
  const hit = allProbes.some((p) => p.token === tok || String(p.token).indexOf(tok) >= 0);
  t("真判点仍在册：" + tok, hit, "(all probes searched)");
});

/* 负样本自检：拿收紧前的备份证明"这些垃圾确实存在过"，
   否则上面两条拒绝型断言可能只是语料变了而判据根本没生效。 */
if (fs.existsSync(BASELINE)) {
  const bv = JSON.parse(fs.readFileSync(BASELINE, "utf8"));
  const bitems = Array.isArray(bv) ? bv : (bv.items || []);
  const bprobes = bitems.reduce((a, x) => a.concat(x.probes || []), []);
  const bjunk = bprobes.filter((p) => /[`{}」]/.test(String(p.token)) || /^\s*grep\s/i.test(String(p.token)));
  t("基线里确实有外壳判点（证明本测试的拒绝判据不是空转）", bjunk.length > 0,
    "baseline probes=" + bprobes.length + " junk=0 → 判据无法自证");
  console.log("     baseline 垃圾判点 " + bjunk.length + " 条，例：" + bjunk.slice(0, 2).map((p) => JSON.stringify(p.token)).join(" , "));
} else {
  console.log("     NOTE 收紧前基线文件不在盘上（" + path.relative(REPO, BASELINE) + "），拒绝型断言缺少反向对照");
}

console.log(`PH_SUMMARY checks=${checks} fail=${fails}`);
console.log(`PH_TEST=${fails ? "FAIL" : "PASS"}`);
process.exit(fails ? 1 : 0);
