#!/usr/bin/node
/* 负例（刀二 #C-3）：TAP_RE 认不出驼峰动词 ⇒ 交互型判据一行不发却记 EXECUTED（假绿）。
   这个文件的存在意义不是"证明新表对"，而是**证明它会变红**：
     · 断言打在从 scripts/qa/r-exec-cli.mjs 现抠的那两条字面量上（与执行器同一份口径，
       和 scripts/qa/census-tap-targets.mjs:26-39 同一个取法），抄一份到测试里就不叫回归测试；
     · 反向对照用真实判据台的 action 原文（DND08/TP04/SCU06…），不放"扫描集为空所以绿"；
     · 空转防护：先用**修复前的那条老边界**跑一遍同一条断言，它必须判出 rapidTap 不匹配，
       否则这条正例只是语料碰巧变绿，不是这道守卫生效。
   跑法：PATH=<node22 目录>:$PATH node scripts/qa/test-exec-tap-verb-camel.cjs
   聚合器认的输出：SUMMARY: assertion failures = N（run-qa-selftests.mjs:45-51）+ TVC_TEST=PASS|FAIL */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const REPO = path.resolve(__dirname, "..", "..");
const EXEC = path.join(REPO, "scripts", "qa", "r-exec-cli.mjs");
const OPS = path.join(REPO, "reports", "audit", "round-6", "ops");
const OUT = path.join(REPO, ".zcode", "tmp", "tapcensus-exec-verbs");

let fails = 0, checks = 0;
function t(name, cond, detail) {
  checks++;
  if (!cond) { fails++; console.log("FAIL " + name + (detail === undefined ? "" : " :: " + String(detail).slice(0, 240))); }
  else console.log("ok   " + name + (detail === undefined ? "" : "  (" + String(detail).slice(0, 160) + ")"));
}

/* ── 取口径：与 census-tap-targets 同一行字面量的取法（一条一行、flags 按字面量自己的） ── */
function grabLiteral(src, key) {
  const p = src.indexOf(key);
  if (p < 0) return null;
  const line = src.slice(p + key.length - 1).split("\n")[0].trim();
  const end = line.lastIndexOf("/");
  if (!line.startsWith("/") || end <= 0) return null;
  const flags = line.slice(end + 1).replace(/[^a-zgimsuy]/g, "");
  try { return new RegExp(line.slice(1, end), flags); } catch (e) { return null; }
}
let src = "";
try { src = fs.readFileSync(EXEC, "utf8"); } catch (e) { }
const TAP_RE = grabLiteral(src, "const TAP_RE = /");
const TAP_CAMEL_RE = grabLiteral(src, "const TAP_CAMEL_RE = /");
t("取到执行器的 TAP_RE 字面量（取不到就说明口径又被搬走，本测试必须红）", !!TAP_RE, TAP_RE ? TAP_RE.flags : "null");
t("取到执行器的 TAP_CAMEL_RE 字面量（#C-3 的驼峰半边，丢了 rapidTap 一族就静默不测）", !!TAP_CAMEL_RE,
  TAP_CAMEL_RE ? "flags=" + JSON.stringify(TAP_CAMEL_RE.flags) : "null");
if (!TAP_RE || !TAP_CAMEL_RE) {
  console.log("SUMMARY: assertion failures = " + (fails + 1));
  console.log("TVC_TEST=FAIL（口径取不到，后面的断言没有一条跑过 ⇒ 不许当绿）");
  process.exit(1);
}
const HIT = (s) => TAP_RE.test(s) || TAP_CAMEL_RE.test(s);

/* ── 1. 修复前的老边界必须仍然判不出 rapidTap（空转防护：证明下面那批正例是守卫生效不是巧合） ── */
/* 修复前那条字面量的完整复刻（中文动词 + 老边界），用来量影响面与"不许丢命中" */
const OLD_FULL = /点击|按下|长按|双击|输入|滑动|滚动|拖动|下拉|勾选|切换后|聚焦|失焦|(?<![A-Za-z])(?:tap|click|input|scroll|swipe|trigger|press)(?![A-Za-z])/i;
const OLD_ONLY = /(?<![A-Za-z])(?:tap|click|input|scroll|swipe|trigger|press)(?![A-Za-z])/i;
t("反向对照：老边界确实认不出 rapidTap/doubleTap/longPress（否则本测试的守卫是空转）",
  !OLD_ONLY.test("500ms 内对 .save-btn rapidTap×5") && !OLD_ONLY.test("doubleTap 两次") && !OLD_ONLY.test("longPress 800ms"),
  "old.rapidTap=" + OLD_ONLY.test("rapidTap×5"));
t("反向对照：新口径把这三条都认成交互", HIT("500ms 内对 .save-btn rapidTap×5") && HIT("doubleTap 两次") && HIT("longPress 800ms"));

/* ── 2. 三条既有负例/正例一个都不许漂 ── */
t("负例：getApp() 里的 tAp 不算交互（census:36 的同一条守卫）", !HIT("调用 getApp() 取应用实例"));
t("正例：lane 写的英文 tap 仍算交互（census:37 的同一条守卫）", HIT("tap .code-input 提交"));
t("负例：引号里的驼峰名是名字不是动作 emit('searchTap')", !HIT("der.vue:17 emit('searchTap') 声明"));
t("负例：动词嵌在更长标识符开头不算（tapAvatar / scrollTo / CardSwiper / scrollTop）",
  !HIT("emit tapAvatar 冒泡") && !HIT("页面 scrollTo 到底") && !HIT("根 SwipeContainer 上绑 CardSwiper.vue") && !HIT("记录 scrollTop、scrollHeight 读数"));
t("负例：全小写粘在词里不算（bindtap / catchtap：动词不在驼峰接缝上）",
  !HIT("该节点用 bindtap 绑 handler") && !HIT("根节点 catchtap 拦事件"));
t("驼峰半边不认领全大写常量名（TAP_MOVE_THRESHOLD 的判定由老表既有的 [A-Za-z] 边界决定，本刀不改变它）",
  !TAP_CAMEL_RE.test("TAP_MOVE_THRESHOLD") && OLD_FULL.test("位移 <TAP_MOVE_THRESHOLD") === HIT("位移 <TAP_MOVE_THRESHOLD"),
  "新旧同值=" + (OLD_FULL.test("位移 <TAP_MOVE_THRESHOLD") === HIT("位移 <TAP_MOVE_THRESHOLD")));
t("中文动词一条都没被挤掉（长按/点击/输入/滚动）",
  HIT("长按卡片标题") && HIT("点击 .save-btn") && HIT("输入手机号") && HIT("滚动到底"));
/* /i 折叠大小写是这一刀最大的坑：并进带 i 的那条字面量，边界整个失效（catchtap 都会命中）。 */
t("驼峰半边不许带 i 旗标（带上 [a-z][A-Z] 就被大小写折叠，实测 catchtap/bindtap 全会命中）",
  !/i/.test(TAP_CAMEL_RE.flags), "flags=" + JSON.stringify(TAP_CAMEL_RE.flags));

/* ── 3. 真实判据台：那批假绿的行现在必须被认出来，且新增命中只能来自驼峰半边 ── */
const MUST_MATCH = ["DND08", "TP04", "TK05", "SCU06", "SCU10", "SCH10", "RP06", "INT07", "FB07"];
const cases = [];
for (const f of fs.readdirSync(OPS).filter((x) => x.endsWith(".json"))) {
  let mf; try { mf = JSON.parse(fs.readFileSync(path.join(OPS, f), "utf8")); } catch (e) { continue; }
  for (const c of mf.cases || []) cases.push({ file: f.replace(/\.json$/, ""), id: c.id, action: String(c.action || "") });
}
t("判据台扫到了行（扫描集非空）", cases.length >= 1000, "cases=" + cases.length);
const byId = {};
for (const c of cases) (byId[c.id] = byId[c.id] || []).push(c);
for (const id of MUST_MATCH) {
  const hit = (byId[id] || [])[0];
  t("真实判据 " + id + " 的 action 现在被认成交互（修复前它一行不跑却记 EXECUTED）",
    !!hit && HIT(hit.action), hit ? hit.action.slice(0, 70) : "判据台里找不到这个 id");
}
const added = cases.filter((c) => !TAP_RE.test(c.action) && HIT(c.action));
t("新增命中的每一条都真的含驼峰动词（不许有靠别的东西混进来的命中）",
  added.every((c) => TAP_CAMEL_RE.test(c.action)), added.slice(0, 3).map((c) => c.id).join(","));
const lost = cases.filter((c) => OLD_FULL.test(c.action) && !HIT(c.action));
t("严格超集：修复前命中的行一条都没被丢掉（放宽不许顺手关掉旧的门）", lost.length === 0, "lost=" + lost.length);
console.log("     影响面：修复前命中 " + cases.filter((c) => OLD_FULL.test(c.action)).length +
  " 条 / 修复后命中 " + cases.filter((c) => HIT(c.action)).length + " 条 / 共 " + cases.length + " 条 action，新增 " + added.length + " 条");
t("新增条数与审计口径同量级（rapidTap 一族 9 条 + 引用尾段驼峰名的若干条；>0 才算这一刀真的接上了）", added.length >= 9, "added=" + added.length);
t("反向对照：修复前的完整口径确实判不出这 9 条 rapidTap 判据（假绿的形状）",
  MUST_MATCH.every((id) => { const h = (byId[id] || [])[0]; return h && !OLD_FULL.test(h.action) && HIT(h.action); }),
  MUST_MATCH.join(","));

/* ── 4. 消费者接线：执行器的两个下发/跳过判点必须走合成口径，不许再各读各的 ── */
const callSites = (src.match(/wantsInteraction\(/g) || []).length;
t("执行器内部两处交互判点都改成走 wantsInteraction()（合成口径，不再单读 TAP_RE）",
  callSites >= 3 && !/if \(TAP_MODE && !bandSkip\(c\) && routeOk !== false && TAP_RE\.test/.test(src),
  "wantsInteraction 出现 " + callSites + " 次");

/* ── 5. 跑普查工具本体：它的四条对照必须全过、退出码必须 0（产物写进自己的目录，不覆盖权威件） ── */
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) { }
let censusOut = "", censusCode = 0;
try {
  censusOut = execFileSync(process.execPath, [path.join(REPO, "scripts", "qa", "census-tap-targets.mjs"),
    "--out", path.relative(REPO, OUT).split(path.sep).join("/")], { cwd: REPO, encoding: "utf8", timeout: 120000 });
} catch (e) { censusCode = (e && e.status) === undefined ? -1 : e.status; censusOut = ((e && e.stdout) || "") + ((e && e.message) || ""); }
t("census-tap-targets 退出码 0（它自带的 rapidTap 正例对照若被删掉就会 exit 2）", censusCode === 0, "exit=" + censusCode);
t("census 自报了四条对照全过", /TAPCENSUS_CONTROLS 4\/4 通过/.test(censusOut), censusOut.split("\n").find((l) => /TAPCENSUS_CONTROLS/.test(l)) || "(没打印)");
t("census 守恒等式仍然成立（放宽动词不能把待补清单数成不闭合）", /守恒：yes/.test(censusOut),
  censusOut.split("\n").find((l) => /TAPCENSUS cases=/.test(l)) || "(没打印)");

console.log("SUMMARY: assertion failures = " + fails);
console.log(fails ? "TVC_TEST=FAIL" : "TVC_TEST=PASS");
process.exit(fails ? 1 : 0);
