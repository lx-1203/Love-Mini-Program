#!/usr/bin/env node
/* 载体接线门（scripts/qa/verify-carrier-wiring.mjs）的双向负例。
   为什么必须有它：这条门的全部价值是"能变红"。一条量不出红的消费者检测器就是恒绿假仪器，
   而恒绿假仪器正是本仓这一轮拆了四次的东西（建了没人跑、没有任何门会因此变红）。
   所以这里不只测"有消费者时别乱报"，而是先钉死「零消费者的导出件必须红」，
   再钉死「补一处真 import 必须转绿」——两头发红/转绿都亲验退出码，不接受"印了 FAIL 就算红"。

   四条反证（都走门自己的同一条判据码路，不 mock 判据）：
     1 阳性对照：盘上放一个有 export、零消费者的具名模块 ⇒ 整跑与 --select 都必须红并指名它
     2 阴性对照：再加一个**静态 import** 它的真实消费者 ⇒ 同一发必须转绿且整跑不再指名它
     3 豁免账生效：把它按实测写进豁免清单（带 why）⇒ 不再判红，且必须打出 EXEMPT_ITEM
     4 豁免账腐烂：已经有消费者了却还留在豁免清单 ⇒ 必须判红并打出 STALE_ITEM
        （本仓定规「收紧门必须撤回旧放行」——旧放行不撤回就是这条门最隐蔽的死法）

   变异之后**删掉临时文件并 ls 证明不在盘上**（留着夹具就是往判域里塞噪音）。
   夹具名刻意不以 test- 开头：否则会被 run-qa-selftests 的 ^test-.+ 收件规则当成负例自动跑，
   污染别的车道的 +1 自数。
   本文件不写任何 reports/** 判决件；临时豁免清单落 tmp/（门的口径里 tmp/ 不算消费者）。
   输出纪律：被 spawn 的门自己的 WIRING_RESULT 行会以全角＝回显，避免聚合器把
   它的 FAIL 误读成本测试的判据行（聚合器取第一个 *_TEST|RESULT=(PASS|FAIL)）。
   用法：node scripts/qa/test-carrier-wiring.cjs
*/
const { spawnSync } = require("node:child_process");
const { writeFileSync, existsSync, readdirSync } = require("node:fs");
const { resolve, join } = require("node:path");

const REPO = resolve(__dirname, "..", "..");
const GATE = join("scripts", "qa", "verify-carrier-wiring.mjs");
const QA_DIR = join("scripts", "qa");

// 夹具名按段拼接：本文件若写下完整的 "<stem>.mjs" 字面量，自己就成了那个夹具的消费者，
// 阳性对照当场失效（这是本测试第一个坑，踩过一次才知道要这样写）。
// 再叠一层 PID 隔离：本负例被 run-qa-selftests 的 ^test-.+ 规则自动收件，
// 于是同一时刻可能有多个实例在跑（编排方亲跑 + 某车道跑聚合器）。
// 实测踩过：两个实例共用固定夹具名 ⇒ A 的 cleanup 删掉 B 刚建的 user，B 当场 ENOENT 崩，
// 且 B 的整跑把 A 的半截夹具读成死件、把「整跑不再指名它」判成 FAIL。
// 按 process.pid 命名后实例互不可见，判据强度不减（各测各的具名夹具）。
const TAG = "tmp-l18-carrier-" + process.pid;
const STEM = TAG + "-fixture";
const FIX = STEM + ".mjs";
const USER = TAG + "-user.mjs";
const FIX_REL = "scripts/qa/" + FIX;
const USER_REL = "scripts/qa/" + USER;
const EXEMPT_TMP = "tmp/l18-exempt-" + process.pid + "-fixture.json";

let failures = 0;
const notes = [];
function ck(name, cond, detail) {
  if (!cond) { failures++; console.log("  FAIL  " + name + (detail ? "  « " + detail : "")); }
  else console.log("  ok    " + name);
}
/** 跑门。返回 {code, out}；out 里的判据行保持原样（只在本测试自己的 stdout 里才做全角处理）。 */
function runGate(extraArgs) {
  const r = spawnSync(process.execPath, [GATE, "--json", "tmp/l18-sidecar-test.json"].concat(extraArgs || []), {
    cwd: REPO, encoding: "utf8", timeout: 180000, maxBuffer: 32 * 1024 * 1024,
  });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  return { code: r.status, out, spawnErr: r.error ? String(r.error.message).slice(0, 120) : "" };
}
const echoGate = (label, res) => {
  // 全角＝回显：聚合器按 /\b[A-Z]{2,8}_(?:TEST|RESULT)=(PASS|FAIL)\b/ 抓判据行，
  // 门自己那行 WIRING_RESULT=FAIL 是**被测物的输出**，不是本测试的结论，不能被它抓走。
  const line = (res.out.split(/\r?\n/).filter((l) => /^WIRING_(RESULT|DEAD_ITEM|EXEMPT_ITEM|STALE_ITEM)/.test(l)).join(" ⟶ ") || "(没有判据行)").replace(/=/g, "＝");
  console.log(`      ${label} exit=${res.code} :: ${line.slice(0, 420)}`);
};
function mkFix() {
  writeFileSync(join(REPO, FIX_REL), `/* L18 阳性对照夹具：有 export、零消费者。测完即删，不留进判域。 */
export function ${STEM.replace(/-/g, "_")}Ping() { return "pong"; }
`);
}
function mkUser() {
  // 真实静态 import（走门的 import-specifier 解析这一支，不是随便一个字符串点名）
  writeFileSync(join(REPO, USER_REL), `/* L18 阴性对照：本文件静态 import 上面那个夹具。测完即删。 */
import { ${STEM.replace(/-/g, "_")}Ping } from "./${FIX}";
console.log("L18_CONTROL_PING=" + ${STEM.replace(/-/g, "_")}Ping());
`);
}
function mkExempt() {
  writeFileSync(join(REPO, EXEMPT_TMP), JSON.stringify({ exemptions: [{ path: FIX_REL, why: "L18 负例用的临时夹具，测完即删，不是本仓产物" }] }, null, 2) + "\n");
}
function cleanup() {
  for (const p of [join(REPO, FIX_REL), join(REPO, USER_REL), join(REPO, EXEMPT_TMP)]) {
    try { require("node:fs").unlinkSync(p); } catch (e) { /* 已不在盘上 */ }
  }
}

console.log("L18 载体接线门负例  node=" + process.execPath);
if (!existsSync(join(REPO, GATE))) {
  console.log("CARRIER_TEST=FAIL reason=门脚本不在盘上（" + GATE + "），负例无从谈起");
  console.log("SUMMARY: assertion failures = 1");
  process.exit(1);
}

try {
  /* ── 基线：夹具不存在时，整跑不许指名它 ─────────────────────────────── */
  ck("前置：夹具不在盘上", !existsSync(join(REPO, FIX_REL)));
  const base = runGate([]);
  ck("前置：基线整跑能跑完（退出码 0 或 1，不是崩）", base.code === 0 || base.code === 1, "exit=" + base.code + " " + base.spawnErr);
  ck("前置：基线整跑没有指名夹具", !base.out.includes("WIRING_DEAD_ITEM path=" + FIX_REL));

  /* ── 1 阳性对照：零消费者的导出件必须让门变红 ─────────────────────────── */
  mkFix();
  const posSel = runGate(["--select", FIX]);
  echoGate("阳性 --select", posSel);
  ck("1 阳性对照：--select 这一发退出码非 0（门真的红了，不是只印了 FAIL）", posSel.code !== 0, "exit=" + posSel.code);
  ck("1 阳性对照：机器行是 FAIL 而不是 ADVISORY（默认极性＝判红，没被 --advisory 偷换成报数）", /WIRING_RESULT=FAIL/.test(posSel.out));
  ck("1 阳性对照：红项指名了这个夹具", posSel.out.includes("WIRING_DEAD_ITEM path=" + FIX_REL));
  ck("1 阳性对照：死件计数=1（不是 0 也不是把别人算进来）", /死件=1 /.test(posSel.out), (posSel.out.match(/WIRING_RESULT=[^\n]*/) || [""])[0]);

  const posFull = runGate([]);
  echoGate("阳性 整跑", posFull);
  ck("1 阳性对照：整跑（不带 --select）也指名它 ⇒ --select 不是让它变红的原因",
    posFull.out.includes("WIRING_DEAD_ITEM path=" + FIX_REL));

  /* ── 2 阴性对照：补一处真实静态 import 必须转绿 ────────────────────────── */
  mkUser();
  const negSel = runGate(["--select", FIX]);
  echoGate("阴性 --select", negSel);
  ck("2 阴性对照：加了 import 后这一发退出码回到 0", negSel.code === 0, "exit=" + negSel.code);
  ck("2 阴性对照：机器行是 PASS", /WIRING_RESULT=PASS/.test(negSel.out));
  ck("2 阴性对照：PASS 行里死件=0", /死件=0/.test(negSel.out));
  const negFull = runGate([]);
  echoGate("阴性 整跑", negFull);
  ck("2 阴性对照：整跑不再指名它", !negFull.out.includes("WIRING_DEAD_ITEM path=" + FIX_REL));

  /* ── 3 豁免账生效：按实测进清单 ⇒ 放行且必须留名 ─────────────────────── */
  try { require("node:fs").unlinkSync(join(REPO, USER_REL)); } catch (e) { /* 我的 user 本应在此，删失败由下面第 3 条断言兜底（PID 隔离后不该再被并发实例抢先删走） */ }      // 撤掉消费者，回到零消费者状态
  mkExempt();
  const exSel = runGate(["--select", FIX, "--exemptions", EXEMPT_TMP]);
  echoGate("豁免 --select", exSel);
  ck("3 豁免账生效：退出码 0（豁免真的放行）", exSel.code === 0, "exit=" + exSel.code);
  ck("3 豁免账生效：打出 EXEMPT_ITEM 并带上为什么（放行必须留名留账，不许静默消失）",
    exSel.out.includes("WIRING_EXEMPT_ITEM path=" + FIX_REL) && /why=/.test(exSel.out));

  /* ── 4 豁免账腐烂：已有消费者却还留在清单 ⇒ 必须红 ────────────────────── */
  mkUser();
  const stSel = runGate(["--select", FIX, "--exemptions", EXEMPT_TMP]);
  echoGate("过期豁免 --select", stSel);
  ck("4 豁免账腐烂：这条红回来了（收紧门必须撤回旧放行）", stSel.code !== 0, "exit=" + stSel.code);
  ck("4 豁免账腐烂：指名 STALE_ITEM 并给出它的消费者", stSel.out.includes("WIRING_STALE_ITEM path=" + FIX_REL));

  /* ── 5 仪器的完整性：口径与守恒 ────────────────────────────────────────── */
  const dom = (posSel.out.match(/WIRING_DOMAIN[^\n]*/) || [""])[0];
  ck("5 口径标注：DOMAIN 行自带「判域/导出件数/为什么不含一次性脚本」的口径（数字不标口径最容易被读成达标）",
    /判域=.*导出件=\d+.*口径=/.test(dom), dom.slice(0, 120));
  const car = (posSel.out.match(/WIRING_CARRIER[^\n]*/) || [""])[0];
  ck("5 口径标注：入口分类行同时写清算什么与**不算**什么（不算的那半才是这门不腐的前提）",
    /算消费者=.*不算=/.test(car));
  const ag = (posSel.out.match(/WIRING_AUTO_COLLECT[^\n]*/) || [""])[0];
  ck("5 自动收件登记在册：聚合器规则与实收条数被印出来（漏登记就会把自动收件的负例误报成死件）",
    /run-qa-selftests\.mjs/.test(ag) && /实收 \d+ 个文件/.test(ag), ag.slice(0, 140));

  /* ── 6 变异输入：门不许"读不到就当没事" ───────────────────────────────── */
  const badSel = runGate(["--select", "definitely-not-a-real-module-l18.mjs"]);
  echoGate("--select 拼错", badSel);
  ck("6 --select 点了不存在的名字 ⇒ exit 2（拼错就静默变绿的检查器等于没有检查器）", badSel.code === 2, "exit=" + badSel.code);
  const badEx = runGate(["--select", FIX, "--exemptions", "tmp/l18-no-such-exempt.json"]);
  echoGate("豁免清单缺失", badEx);
  ck("6 豁免清单文件不存在 ⇒ exit 2（缺清单不许被读成「没有豁免所以全判」，那会让清单被随手删掉而无人知）", badEx.code === 2, "exit=" + badEx.code);
} catch (e) {
  failures++;
  console.log("  FAIL  测试自己抛异常：" + String(e && e.stack || e).slice(0, 300));
} finally {
  /* ── 7 变异证明之后删干净，并用 ls 证明「我的」夹具不在盘上 ─────────────
     取证只钉本 PID 的夹具（PID 隔离后这是可证的）；别的 PID 残留是并发实例的在途件，
     按编排方"并发车道会留临时件，取数时刻如实标注"的口径只如实列出不判红——
     把别人的在途件算成我的泄漏，或为了让 ls 干净而去删别人的件，两头都是假。 */
  cleanup();
  const ls = spawnSync("bash", ["-c", `ls scripts/qa | grep -F '${TAG}' ; echo LS_GREP_RC=$?`], { cwd: REPO, encoding: "utf8", timeout: 30000 });
  const lsOut = `${ls.stdout || ""}${ls.stderr || ""}`.trim();
  console.log(`      ls 证明（bash: ls scripts/qa | grep -F ${TAG}）: ` + (lsOut || "(无输出)").replace(/\n/g, " ⏎ ").slice(0, 300));
  const mine = readdirSync(join(REPO, QA_DIR)).filter((f) => f.includes(TAG));
  ck("7 本进程的临时夹具已从盘上删干净（ls -F <pid夹具串> + readdirSync 双向核，只留一个都不算证明）",
    mine.length === 0 && !new RegExp(TAG).test(lsOut || ""), "本进程残留=" + JSON.stringify(mine));
  for (const p of [join(REPO, FIX_REL), join(REPO, USER_REL)]) {
    ck("7 逐个核不存在：" + p.replace(REPO + "/", ""), !existsSync(p));
  }
  const foreign = readdirSync(join(REPO, QA_DIR)).filter((f) => f.includes("tmp-l18") && !f.includes(TAG));
  console.log("      （并发实例的 tmp-l18 残留，非本进程泄漏，取数时刻 " + new Date().toISOString() + "）: " + (foreign.length ? JSON.stringify(foreign) : "无"));
}

notes.push("阳性=零消费者导出件必须红；阴性=补 import 必须转绿；两条都验的是退出码，不是 stdout 字样");
console.log("L18_NOTE=" + notes.join("；"));
console.log(failures ? `CARRIER_TEST=FAIL（${failures} 条断言未过 ⇒ 这条门不可信，别把它当门禁）` : "CARRIER_TEST=PASS");
console.log(`SUMMARY: assertion failures = ${failures}`);
process.exit(failures ? 1 : 0);
