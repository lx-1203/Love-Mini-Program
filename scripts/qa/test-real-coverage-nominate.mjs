#!/usr/bin/env node
/* verify-real-coverage.mjs 的**欠账点名台账**能不能变红、点出来的名对不对
   —— 用户 2026-09-29 的要求：一条门只印一个数（REALCOV_UNCOVERED=10）是不可派活的红，
      必须逐条点名 + 一条台账守恒断言；而且"必须加一条能变红的负例，
      负例咬不动就等于没测"。本文件就是那条负例。
   三件事分开锁死：
   ① 可见性：每笔欠账都得有一行 `  UNCOVERED <suite>|<id> 缺=<轴>`，且 REALCOV_UNCOVERED_LIST=n
      与 REALCOV_UNCOVERED 由**测试自己再数一遍**（不采信门印的数）；
   ② 判点不变：门在夹具上仍按"欠账 =0 才绿"判（基线绿、任何一笔欠账红），
      点名不许让一条本来的绿变红、也不许让一笔欠变绿；
   ③ 负例真的咬得动：每个变体都要求 **退出码与输出同时**与基线不同、
      且点出来的那一行在基线输出里**不存在**（否则名字不是这次变异带来的）；
      变异前后的夹具 JSON 字节也必须不同（否则我改的是空气）。
   四种轴形状逐个点名：never-on-real（real 档一行都没有）/ login（登录轴没判过）/
   guest（游客轴没判过）/ login+guest（两轴都没判过，= round-8 那条"有档位有行却没身份"的形状）。
   全部离线：只读载具 + .zcode/tmp 下的临时夹具，不开模拟器、不抢 UI 租约、
   不写 reports/ 下任何权威账本。
   自报口径：聚合器 run-qa-selftests.mjs:45-49 只认 `SUMMARY: assertion failures = N`
   或 `<≤8字>_SUMMARY cases=N fail=M` + `NAME_TEST=PASS`；这里两种都印，且名字前缀压到 8 字以内
   （RCOV_…），否则会被读成"无自报断言计数（不可信）"或"无 *_TEST= 判据行"。 */
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
/* RCOV_GATE 只服务于一件事：**证明这条负例咬得动**。把它指到"还没有点名的旧门"
   （git HEAD 那份 verify-real-coverage.mjs）时，本文件必须整条变红；
   若旧门也能过关，就说明我测的是自己的桩而不是门的 behaviour。默认值是真门，
   聚合器跑的时候不带这个变量 ⇒ 被测对象不可被环境变量偷换。 */
const GATE = process.env.RCOV_GATE ? resolve(REPO, process.env.RCOV_GATE) : resolve(REPO, "scripts/qa/verify-real-coverage.mjs");
const NODE = process.execPath;
const TMP = resolve(REPO, ".zcode/tmp/realcov-nominate");
mkdirSync(resolve(TMP, "ops"), { recursive: true });

let checks = 0, fail = 0;
/* 门自己的输出里满是 REALCOV_RESULT=FAIL 这种形状；聚合器抓**第一个** *_TEST=/*_RESULT= 当判据行，
   所以任何被我回显进诊断信息的门输出都要先去毒，否则我绿它也会把聚合器骗成红（反之亦然）。 */
const mask = (s) => String(s).replace(/\b([A-Z]{2,8})_(TEST|RESULT)=(PASS|FAIL)\b/g, "$1~$2~$3");
function t(name, cond, got) {
  checks++;
  if (!cond) { fail++; console.log(`FAIL ${name} :: ${mask(String(got).slice(0, 400))}`); }
  else console.log(`ok   ${name}`);
}

/* ---------------- 夹具：两本判据 + 一条执行腿 ----------------
   A04 是 automatable:false 的免检行：它必须既不算覆盖、也**不出现在点名台账里**
   （门注释里的老规矩：免检 ≠ 覆盖，也不等于欠账）。 */
const BAND = "real@f00dfeed";
const OPS_FILES = {
  "fix-a.json": {
    suite: "FIXTURE-A", page: "pages/fixture-a/index",
    cases: [
      { id: "A01", requiresReal: true, title: "未标 identities ⇒ 双身份各要一条" },
      { id: "A02", requiresReal: true, identities: ["A", "B"], title: "只要求登录轴" },
      { id: "A03", requiresReal: true, identities: ["guest", "none"], title: "只要求游客轴" },
      { id: "A04", requiresReal: true, automatable: false, notAutomatableFrom: "fixture-exempt.json", title: "免检行：不许进点名台账" },
    ],
  },
  "fix-b.json": {
    suite: "FIXTURE-B", page: "pages/fixture-b/index",
    cases: [
      { id: "B01", requiresReal: true, title: "双身份 + B / not-logged-in 两种拼法" },
      { id: "B02", requiresReal: true, title: "双身份 + A / guest 两种拼法" },
    ],
  },
};
for (const [f, j] of Object.entries(OPS_FILES)) writeFileSync(resolve(TMP, "ops", f), JSON.stringify(j, null, 1));

const row = (manifest, id, identity, status, band) => ({ manifest, id, band: band || BAND, identity, status });
/* 基线：六个 requiresReal 判据 ⇒ 免检 1 + 覆盖 5 + 欠账 0（守恒 6=6，门必须绿）。 */
const BASE_ROWS = [
  row("FIXTURE-A", "A01", "A", "EXECUTED"), row("FIXTURE-A", "A01", "guest", "EXECUTED"),
  row("FIXTURE-A", "A02", "A", "FAILED"),
  row("FIXTURE-A", "A03", "guest", "EXECUTED"),
  row("FIXTURE-B", "B01", "B", "EXECUTED"), row("FIXTURE-B", "B01", "not-logged-in", "EXECUTED"),
  row("FIXTURE-B", "B02", "A", "EXECUTED"), row("FIXTURE-B", "B02", "guest", "EXECUTED"),
];
const without = (rows, manifest, id, pick) => rows.filter((r) => !(r.manifest === manifest && r.id === id && (!pick || pick(r))));

function run(tag, rows) {
  const legDir = resolve(TMP, `round-${tag}`, "exec-fixture-leg");
  mkdirSync(legDir, { recursive: true });
  const doc = JSON.stringify({ round: tag, results: rows }, null, 1);
  writeFileSync(resolve(legDir, "exec-results.json"), doc);
  const r = spawnSync(NODE, [GATE, "--ops", resolve(TMP, "ops"), "--dir", resolve(TMP, `round-${tag}`)],
    { cwd: REPO, encoding: "utf8", timeout: 120000 });
  const out = (r.stdout || "") + (r.stderr || "");
  const num = (re) => { const m = out.match(re); return m ? Number(m[1]) : null; };
  /* 点名行按严格语法自己再数一遍：两空格 + UNCOVERED + <无空格 key> + 空格 + 缺=<轴>
     —— 轴口径说明那一行（含"缺哪根轴"却没有 " 缺="）不会被误收。 */
  const named = out.split(/\r?\n/).filter((l) => /^ {2}UNCOVERED \S+ 缺=\S+$/.test(l)).map((l) => l.trim());
  return {
    tag, code: r.status, out, doc, named,
    uncovered: num(/^REALCOV_UNCOVERED=(\d+)/m),
    list: num(/^REALCOV_UNCOVERED_LIST=(\d+)/m),
    covered: num(/^REALCOV_COVERED=(\d+)/m),
    exempt: num(/^REALCOV_AUTOMATABLE_EXEMPT=(\d+)/m),
    cases: num(/^REALCOV_CASES=(\d+)/m),
    ledger: (out.match(/REALCOV_UNCOVERED_LEDGER=(\w+)/) || [])[1] || null,
    conserved: (out.match(/REALCOV_CONSERVATION=(\w+)/) || [])[1] || null,
    result: (out.match(/REALCOV_RESULT=(\w+)/) || [])[1] || null,
  };
}
const body = (r) => r.named.map((l) => l.replace(/^UNCOVERED /, ""));

/* ---------------- 1) 基线：绿，且"绿也得把那行印出来" ---------------- */
const base = run("baseline", BASE_ROWS);
t("基线：判据 6 条、免检 1 + 覆盖 5 + 欠账 0 ⇒ 门绿 exit=0",
  base.code === 0 && base.cases === 6 && base.exempt === 1 && base.covered === 5 && base.uncovered === 0 && base.result === "PASS",
  `exit=${base.code} cases=${base.cases} exempt=${base.exempt} covered=${base.covered} uncovered=${base.uncovered} ${base.out}`);
t("基线：零欠账也必须印 REALCOV_UNCOVERED_LIST=0（绿的时候不许对台账沉默）",
  /^REALCOV_UNCOVERED_LIST=0/m.test(base.out), base.out.split(/\r?\n/).find((l) => l.startsWith("REALCOV_UNCOVERED_LIST")) || "(没有这一行)");
t("基线：一条点名都没有（点名不是凭空长出来的）", base.named.length === 0, base.named.join(" | "));
t("基线：台账守恒 OK、账本守恒 OK", base.ledger === "OK" && base.conserved === "OK", `ledger=${base.ledger} conservation=${base.conserved}`);
t("基线：免检行 A04 绝不进点名台账（豁免≠覆盖，也不等于欠账）",
  !/A04 缺=/.test(base.out), base.out.split(/\r?\n/).find((l) => l.includes("A04 缺=")) || "(没点它)");
/* 对照：同一批行**一字不改**、只换一条腿目录再跑 ⇒ 必须仍是绿、仍零点名。
   没有这条对照，"变异后变红"就可能是我的夹具或目录形状自己带的红（负例得配一个不动的对照）。 */
const ctrl = run("control", BASE_ROWS);
t("对照（同一批行、换一条腿目录）⇒ 仍绿、仍零点名、台账仍闭合：红只可能来自变异本身",
  ctrl.code === 0 && ctrl.named.length === 0 && ctrl.uncovered === 0 && ctrl.list === 0 && ctrl.ledger === "OK",
  `exit=${ctrl.code} named=${ctrl.named.length} uncovered=${ctrl.uncovered} list=${ctrl.list} ledger=${ctrl.ledger}`);

/* ---------------- 2) 四种轴形状逐个点名 ----------------
   每个变体都必须：退出码翻成 1、输出与基线不同、点名数=LIST=UNCOVERED=1、
   点的那一行（含轴名）逐字对、且这一行在基线输出里不存在、两本守恒仍为 OK。 */
const VARIANTS = [
  { tag: "never", why: "删掉 B02 的两条 real 档行 ⇒ real 档一行都没有", rows: without(BASE_ROWS, "FIXTURE-B", "B02"), want: "FIXTURE-B|B02 缺=never-on-real" },
  { tag: "login", why: "A02 的 A 行改成 SKIPPED（跳过不算量到）", rows: BASE_ROWS.map((r) => (r.manifest === "FIXTURE-A" && r.id === "A02" ? { ...r, status: "SKIPPED" } : r)), want: "FIXTURE-A|A02 缺=login" },
  { tag: "guest", why: "删掉 A01 的 guest 行（登录轴还在，游客轴没了）", rows: without(BASE_ROWS, "FIXTURE-A", "A01", (r) => r.identity === "guest"), want: "FIXTURE-A|A01 缺=guest" },
  { tag: "twoaxes", why: "A01 换成一条 real 档、identity 缺失的行 ⇒ 两轴都没判过", rows: [...without(BASE_ROWS, "FIXTURE-A", "A01"), row("FIXTURE-A", "A01", "?", "EXECUTED")], want: "FIXTURE-A|A01 缺=login+guest" },
];
for (const v of VARIANTS) {
  const r = run("mut-" + v.tag, v.rows);
  t(`${v.tag} 变异后的夹具字节与基线不同（我改的确实是输入，不是空气）`, r.doc !== base.doc, "两份 exec-results.json 一模一样");
  t(`${v.tag}（${v.why}）⇒ 门必须变红：exit 与输出同时不同于基线（负例咬得动）`,
    r.code === 1 && base.code === 0 && r.out !== base.out, `exit 基线=${base.code} 变异=${r.code} 输出相同=${r.out === base.out}`);
  t(`${v.tag} 点名恰好一条、轴名逐字对：${v.want}`,
    body(r).length === 1 && body(r)[0] === v.want, "点名=" + (body(r).join(" | ") || "(零行)") + " want=" + v.want);
  t(`${v.tag} 这一行在基线输出里不存在（名字是这次变异带来的，不是本来就印着的）`,
    !base.out.includes(v.want), v.want);
  t(`${v.tag} 三处数必须互相闭合：点名数 = REALCOV_UNCOVERED_LIST = REALCOV_UNCOVERED = 1`,
    r.named.length === 1 && r.list === 1 && r.uncovered === 1, `named=${r.named.length} list=${r.list} uncovered=${r.uncovered}`);
  t(`${v.tag} 台账守恒仍为 OK、账本守恒仍为 OK（红只来自欠账，不是门自己算崩）`,
    r.ledger === "OK" && r.conserved === "OK", `ledger=${r.ledger} conservation=${r.conserved} ${r.out}`);
}

/* ---------------- 3) 排序确定性 + 多条一起缺 ---------------- */
const manyRows = BASE_ROWS
  /* B02 两条 real 档行全删 ⇒ never-on-real */
  .filter((r) => !(r.manifest === "FIXTURE-B" && r.id === "B02"))
  /* A01 只留登录轴那条 ⇒ 缺 guest */
  .filter((r) => !(r.manifest === "FIXTURE-A" && r.id === "A01" && r.identity === "guest"))
  /* A02 的 A 行降级成 SKIPPED（跳过不算量到）⇒ 缺 login */
  .map((r) => (r.manifest === "FIXTURE-A" && r.id === "A02" ? { ...r, status: "SKIPPED" } : r));
const many = run("mut-many", manyRows);
/* 点名顺序=suite→id，与"三个数组的首次出现顺序"（B02 → A02 → A01）不同 ⇒ 这条断言真的在测排序。 */
const WANT_MANY = ["FIXTURE-A|A01 缺=guest", "FIXTURE-A|A02 缺=login", "FIXTURE-B|B02 缺=never-on-real"];
t("三条同时缺（跨两本判据）⇒ 点名顺序严格 suite→id，逐字等于期望序列",
  body(many).join(" ~ ") === WANT_MANY.join(" ~ "), "实点=" + body(many).join(" ~ "));
t("三条同时缺 ⇒ 三处数闭合：3 = LIST = UNCOVERED = 点名行数",
  many.named.length === 3 && many.list === 3 && many.uncovered === 3, `named=${many.named.length} list=${many.list} uncovered=${many.uncovered}`);
t("每条点名都符合严格语法（机器可解析），轴名只取三条词表里的值",
  many.named.every((l) => /^UNCOVERED [^\s|]+\|[^\s]+ 缺=(never-on-real|login|guest)(\+(login|guest))?$/.test(l)),
  many.named.filter((l) => !/^UNCOVERED [^\s|]+\|[^\s]+ 缺=(never-on-real|login|guest)(\+(login|guest))?$/.test(l)).join(" | ") || "(没有不合语法的)");
t("many 的台账守恒仍为 OK（多条也不会把账点重或点漏）",
  many.ledger === "OK" && many.conserved === "OK", `ledger=${many.ledger} conservation=${many.conserved}`);
/* 同一输入跑两次 ⇒ 输出逐字相同：这样上面那些 diff 才不是顺序抖动。
   必须复用**同一个 tag**（=同一个结果目录）：门会把目录名印进 REALCOV_CASES 那行，
   换了 tag 比的是路径不是稳定性（第一版就栽在这里，两条 diff 假红）。 */
const firstDiff = (a, b) => {
  const la = String(a).split(/\r?\n/), lb = String(b).split(/\r?\n/);
  for (let i = 0; i < Math.max(la.length, lb.length); i++) if (la[i] !== lb[i]) return `第 ${i + 1} 行 A=[${la[i]}] B=[${lb[i]}]`;
  return "(逐字相同)";
};
const many2 = run("mut-many", manyRows);
t("同一份夹具跑两次输出逐字相同（点名顺序是确定性的，diff 才稳定）",
  many2.out === many.out && many2.code === many.code, "两次的 stdout 不同 " + firstDiff(many2.out, many.out));
const base2 = run("baseline", BASE_ROWS);
t("基线跑两次也逐字相同，且仍为绿（红/绿的差不是抖动）",
  base2.out === base.out && base2.code === 0, `exit=${base2.code} ${firstDiff(base2.out, base.out)}`);

/* ---------------- 4) 门自己的台账断言也得咬得动 ----------------
   "点名数 = 欠账数" 若只是一句印在纸上的话就没有价值。这里跑门的 --selftest：
   它现在带台账负样本（欠账数比点名多一条 / 点出判据集外的用例 / never-on-real 与具体轴同一行…），
   负样本数由读数里现取，不硬编码门总样本数。 */
const st = spawnSync(NODE, [GATE, "--selftest"], { cwd: REPO, encoding: "utf8", timeout: 120000 });
const stOut = (st.stdout || "") + (st.stderr || "");
const stN = Number((stOut.match(/台账负样本=(\d+)/) || [])[1] || 0);
t("门 --selftest 绿（含台账自检），接线在本测试里（聚合器按文件名扫不到 verify-*）",
  st.status === 0 && /REALCOV_SELFTEST=PASS/.test(stOut) && /bad=0/.test(stOut), `exit=${st.status} ${stOut}`);
t("门的台账自检里至少有 4 条**负**样本（守恒断言本身被证明会响，不是摆设）",
  stN >= 4, "台账负样本读数=" + stN + " ｜ " + ((stOut.split(/\r?\n/).find((l) => l.startsWith("REALCOV_SELFTEST"))) || "(没有这一行)"));

/* ---------------- 5) 真盘不变量（只核数，不核结论） ----------------
   权威盘上今天就是红的（欠账 10）；这里**不硬编码条数**（别的车道还在往盘上写腿账，
   钉死一个数就是一条会过期的门），只要求台账自洽：点名数 = LIST = UNCOVERED = 点名行数，
   且每一条都带一根轴。real 盘读数的原文见 .zcode/tmp/realcov-nominate-report.md。 */
const real = spawnSync(NODE, [GATE], { cwd: REPO, encoding: "utf8", timeout: 300000, maxBuffer: 64 * 1024 * 1024 });
const realOut = (real.stdout || "") + (real.stderr || "");
const realNamed = realOut.split(/\r?\n/).filter((l) => /^ {2}UNCOVERED \S+ 缺=\S+$/.test(l)).map((l) => l.trim());
const realU = Number((realOut.match(/^REALCOV_UNCOVERED=(\d+)/m) || [])[1] ?? -1);
const realL = Number((realOut.match(/^REALCOV_UNCOVERED_LIST=(\d+)/m) || [])[1] ?? -1);
t("真盘：门以 0/1 退出（判据台/结果目录都在，不该是 exit=2 的崩溃）",
  real.status === 0 || real.status === 1, "exit=" + real.status + " " + realOut.slice(0, 200));
t("真盘：台账自洽 —— 点名行数 = REALCOV_UNCOVERED_LIST = REALCOV_UNCOVERED",
  realU >= 0 && realL === realU && realNamed.length === realU, `uncovered=${realU} list=${realL} 点名行=${realNamed.length}`);
t("真盘：REALCOV_UNCOVERED_LEDGER=OK（门对自己那本账的守恒断言成立）",
  /REALCOV_UNCOVERED_LEDGER=OK/.test(realOut), (realOut.match(/REALCOV_UNCOVERED_LEDGER=.*/) || ["(没有这一行)"])[0]);
t("真盘：每一行欠账都点得出名（无一行轴名为空）",
  realNamed.every((l) => / 缺=\S+$/.test(l)), realNamed.filter((l) => !/ 缺=\S+$/.test(l)).join(" | ") || "(全有点名)");
console.log("INFO 真盘点名 " + realU + " 条：" + realNamed.map((l) => l.replace(/^UNCOVERED /, "")).join(" ｜ "));

console.log(`SUMMARY: assertion failures = ${fail}`);
console.log(`RCOV_SUMMARY cases=${checks} fail=${fail}`);
console.log(fail === 0 ? "RCOV_TEST=PASS" : "RCOV_TEST=FAIL");
process.exit(fail === 0 ? 0 : 1);
