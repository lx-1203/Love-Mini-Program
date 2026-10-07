/*
 * L21 负例：round-8 总报告 §6 的「待拍板」分桶必须有牙。
 * 钉住的缺陷：gen-round8-report.mjs 原先把裁定册每一条 `## N.` 标题都当成待拍板项，
 *   而册子体例是「原文一字不动、新状态另写一节」，于是流水/对账/已裁节都算成待办，
 *   并且编排方每收一笔账（新增一节流水）待办数就凭空 +1。
 * 全部跑在 tmp/ 下的假夹具上：只读裁定册、只写 tmp/，绝不覆盖 reports/ 里的权威件。
 * 用法：node22 scripts/qa/test-report-decision-buckets.cjs
 *       变异体对照：L21_GEN=<改动过的生成器路径> node22 scripts/qa/test-report-decision-buckets.cjs
 * 聚合器按文件名 ^test-.+\.(cjs|mjs)$ 自动收件，本文件即被 run-qa-selftests.mjs 收走。
 */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const REPO = path.resolve(__dirname, "..", "..");
const GEN = process.env.L21_GEN ? path.resolve(process.env.L21_GEN) : path.join(REPO, "scripts", "qa", "gen-round8-report.mjs");
const REAL_LEDGER = path.join("reports", "audit", "round-7", "decisions-v33.md");
const TMPDIR = path.join(REPO, "tmp", "l21-buckets-test");

const nodeOk = (() => {
  const [maj, min] = process.versions.node.split(".").map(Number);
  return maj > 20 || (maj === 20 && min >= 11) || maj > 20;
})();

let fails = 0;
const say = (s) => console.log(s);
function ok(cond, name, detail) {
  if (cond) say(`  PASS ${name}${detail ? "  ｜" + detail : ""}`);
  else { fails++; say(`  FAIL ${name}${detail ? "  ｜" + detail : ""}`); }
}
/* 成对断言：每条判据都带一个反向对照，防止"规则改宽了但测试也跟着变绿"。 */
function pair(name, posDetail, negDetail, posCond, negCond) {
  ok(posCond, `${name}（阳性）`, posDetail);
  ok(negCond, `${name}（反向对照）`, negDetail);
}

function runGen(ledgerRel) {
  const outRel = path.posix.join("tmp/l21-buckets-test/out", path.basename(ledgerRel).replace(/\.md$/, "") + ".report.md");
  const r = spawnSync(process.execPath, [GEN, "--ledger", ledgerRel, "--out", outRel], { cwd: REPO, encoding: "utf8" });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  if (r.status !== 0) return { exit: r.status, out, buckets: null, report: "" };
  const m = out.match(/GENREPORT_DECISION_BUCKETS .*headings_total=(\d+) pending=(\d+) ruled=(\d+) closed=(\d+) log=(\d+) sum=(\d+)/);
  const guard = out.match(/GENREPORT_BUCKET_GUARD=(\w+) removed=(\S+) pending_zero_guard=(\S+) ask_override_held=(\d+)/);
  return {
    exit: r.status, out,
    buckets: m ? { headings: +m[1], pending: +m[2], ruled: +m[3], closed: +m[4], log: +m[5], sum: +m[6] } : null,
    guard: guard ? { verdict: guard[1], removed: guard[2], zero: guard[3], held: +guard[4] } : null,
    report: fs.readFileSync(path.join(REPO, outRel), "utf8"),
    outRel,
  };
}

/* §6 实际列出的条目 = `## 6.` 之后第一段连续的 `- ` 行（6.1/6.2 是另起的子节）。 */
function section6(report) {
  const lines = report.split(/\r?\n/);
  const s = lines.findIndex((l) => /^## 6\. 需你拍板 (\d+) 项/.test(l));
  if (s < 0) return { found: false, headingNum: null, items: [] };
  const headingNum = +lines[s].match(/^## 6\. 需你拍板 (\d+) 项/)[1];
  const items = [];
  for (let i = s + 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^- /.test(l)) items.push(l.slice(2));
    else if (items.length && !/^[>\s]*$/.test(l) && !/^GENREPORT_/.test(l)) break;
    if (/^### |^## 7\./.test(l)) break;
  }
  const basis = (report.match(/｜移出依据：/g) || []).length;
  const emptyWarn = /本桶为空/.test(report);
  return { found: true, headingNum, items, basis, emptyWarn };
}

const FIX = {};
function writeFixture(name, body) {
  const rel = path.posix.join("tmp/l21-buckets-test", name);
  fs.writeFileSync(path.join(REPO, rel), body, "utf8");
  FIX[name] = rel;
  return rel;
}

function main() {
  if (!nodeOk) {
    say(`BUCKETS_TEST=FAIL reason=Node ${process.version} 太老（生成器用 import.meta.dirname 需 >=20.11，跑在这里只会假红）；请设 NODE22_EXE 指一个新版 node（或把它放进 PATH）再跑`);
    console.log("SUMMARY: assertion failures = 1");
    process.exit(1);
  }
  if (!fs.existsSync(GEN)) { say(`BUCKETS_TEST=FAIL reason=生成器不存在 ${GEN}`); console.log("SUMMARY: assertion failures = 1"); process.exit(1); }
  fs.rmSync(TMPDIR, { recursive: true, force: true });
  fs.mkdirSync(path.join(TMPDIR, "out"), { recursive: true });
  say(`L21 §6 分桶负例  gen=${path.relative(REPO, GEN).replace(/\\/g, "/")}  node=${process.version}  夹具目录=tmp/l21-buckets-test/`);

  /* ── 夹具 A：混合体例的假裁定册 ────────────────────────────────────────────
     #0/#30/#31/#33 复制的是盘上真册子里那四节的措辞形状；#99 是新造阳性项。 */
  const fixA = writeFixture("fixture-a.md", [
    "# 假裁定册（L21 负例夹具，不是盘上事实源）", "",
    "## 0. 用户已裁定（2026-09-29 06:20；下列四项口径已定，本轮按此执行）", "- 表体略", "",
    "## 1. `--r-lg` 令牌值与判据正面冲突", "- 方向 A/B", "",
    "## 5. 帧像素与清单路径要不要长期可查", "- 方向 A/B", "",
    "## 30. 状态对账（2026-09-29 16:2x；上面 0–29 节原文一字未改，现状态只写在这里）",
    "**仍等你裁定（一条都没替你选）**", "#1 #5。", "",
    "## 31. 36 条 CRITERIA_NAMES_NOTHING 的去向已经跑完，顺带纠出一台**假仪器**（2026-09-29 20:4x）", "- 流水", "",
    "## 33. r9 收口流水（2026-09-30 01:4x；编排亲验，非车道自报）", "- 流水", "",
    "## 99. 需要你定 X：测试数据要不要清", "- 方向 A/B", "",
  ].join("\n"));

  say("[1] 阳性：新造的 `## 99. 需要你定 X` 必须落进待拍板桶");
  const a = runGen(fixA);
  const a6 = section6(a.report);
  ok(a.exit === 0 && !!a.buckets, "生成器在夹具 A 上跑通", a.out.split(/\r?\n/)[0]);
  ok(a6.items.some((i) => /^99\./.test(i)), "§6 列出了 #99", `§6=${a6.items.map((i) => i.split(".")[0]).join(",")}`);
  ok(!a6.items.some((i) => /^0\./.test(i)), "阴性对照：§6 不含 #0（用户已裁定）", "已裁节不得算作待办");
  ok(!a6.items.some((i) => /^33\./.test(i)), "阴性对照：§6 不含 #33（r9 收口流水）", "流水节不得算作待办");
  ok(!a6.items.some((i) => /^30\./.test(i)), "阴性对照：§6 不含 #30（状态对账）", "对账节不得算作待办");
  ok(!a6.items.some((i) => /^31\./.test(i)), "阴性对照：§6 不含 #31（已经跑完）", "流水节不得算作待办");
  ok(a.buckets && a.buckets.pending === 3 && a.buckets.headings === 7, "夹具 A 桶数", a.buckets && `pending=${a.buckets.pending}/headings=${a.buckets.headings}（期望 3/7：#1 #5 #99 待拍板，另 4 条是 已裁/对账/两条流水）`);

  say("[2] 守恒与自数一致");
  ok(a.buckets && a.buckets.sum === a.buckets.headings, "四桶相加 == 标题总数（没有静默丢项）", a.buckets && `${a.buckets.pending}+${a.buckets.ruled}+${a.buckets.closed}+${a.buckets.log}=${a.buckets.sum} vs headings=${a.buckets.headings}`);
  ok(a6.headingNum === a6.items.length, "§6 标题里的数字 == 实际列出条数", `标题=${a6.headingNum} 列出=${a6.items.length}`);
  ok(a6.basis === a.buckets.headings - a.buckets.pending, "每条移出项都带一行移出依据", `移出 ${a.buckets.headings - a.buckets.pending} 条 / 依据 ${a6.basis} 行`);

  say("[3] 本缺陷的钉子：新增一节收口流水 ⇒ 待拍板数不变");
  const fixB = writeFixture("fixture-b.md", fs.readFileSync(path.join(REPO, fixA), "utf8") +
    "## 34. r9 收口流水（2026-09-30 12:0x；编排亲验，非车道自报）\n- 收掉的账\n");
  const b = runGen(fixB);
  const b6 = section6(b.report);
  ok(b.buckets.pending === a.buckets.pending, "待拍板数不随新增流水节增长", `夹具 A pending=${a.buckets.pending} → 夹具 B(多一节流水) pending=${b.buckets.pending}`);
  ok(b.buckets.headings === a.buckets.headings + 1 && b.buckets.log === a.buckets.log + 1, "标题总数 +1 只进流水桶", `headings ${a.buckets.headings}→${b.buckets.headings}，log ${a.buckets.log}→${b.buckets.log}`);
  ok(b6.headingNum === a6.headingNum, "§6 标题数字不变（旧代码在这里会自动变 +1）", `旧形状=需你拍板 ${a.buckets.headings + 1} 项；现在=需你拍板 ${b6.headingNum} 项`);
  /* 反向对照：同一位置加的是**真待办**时，数字必须 +1，证明它不是写死的常数。 */
  const fixC = writeFixture("fixture-c.md", fs.readFileSync(path.join(REPO, fixA), "utf8") +
    "## 34. 需要你定 Y：round-1 那 144 帧给不给显式豁免\n- 方向 A/B\n");
  const c = runGen(fixC);
  ok(c.buckets.pending === a.buckets.pending + 1, "反向对照：新增真待办 ⇒ 待拍板数 +1", `pending ${a.buckets.pending}→${c.buckets.pending}（不是写死不动的数）`);

  say("[4] 反例守卫：标题既像已裁又像选择题时留在待拍板桶");
  const fixD = writeFixture("fixture-d.md", fs.readFileSync(path.join(REPO, fixA), "utf8") +
    "## 35. 上一批用户已裁定，本批还需你拍板一项\n- 方向 A/B\n");
  const d = runGen(fixD);
  const d6 = section6(d.report);
  ok(d6.items.some((i) => /^35\./.test(i)), "守卫把 #35 留在待拍板桶", `ask_override_held=${d.guard && d.guard.held}`);
  ok(d.buckets.pending === a.buckets.pending + 1, "守卫只会让待办变大不会变小", `pending ${a.buckets.pending}→${d.buckets.pending}`);

  say("[5] 反「凭空归零」：整册都是流水时必须印 RED");
  const fixE = writeFixture("fixture-e.md", [
    "# 假裁定册（全流水形状，测的是守卫不是桶）", "",
    "## 0. r9 收口流水（一）", "- 流水", "",
    "## 1. 提交前自我纠一处我自己造成的文件损伤", "- 纠正", "",
    "## 2. 状态对账（现状态只写在这里）", "- 对账", "",
  ].join("\n"));
  const e = runGen(fixE);
  const e6 = section6(e.report);
  ok(e.guard && e.guard.verdict === "RED" && e.guard.zero === "TRIPPED", "待拍板桶为空 ⇒ GENREPORT_BUCKET_GUARD=RED", e.out.match(/GENREPORT_BUCKET_GUARD=.*/)[0]);
  ok(e6.emptyWarn, "报告里印出「本桶为空」的警示，不静默交还空清单", "空桶必须有形状说明");

  say("[6] 真实裁定册回归（只读盘上真册子，输出写 tmp/，不碰权威件）");
  const real = runGen(REAL_LEDGER.replace(/\\/g, "/"));
  const real6 = section6(real.report);
  ok(!!real.buckets, "真册子跑通", real.out.split(/\r?\n/)[1]);
  ok(real.buckets.sum === real.buckets.headings, "真册子四桶守恒", `headings=${real.buckets.headings} sum=${real.buckets.sum}`);
  ok(real6.headingNum === real6.items.length, "真册子 §6 自数一致", `标题=${real6.headingNum} 列出=${real6.items.length}`);
  ok(real6.basis === real.buckets.headings - real.buckets.pending, "真册子每条移出项都带依据", `移出 ${real.buckets.headings - real.buckets.pending} 条`);
  /* §6 的渲染格式有两种：标题分类是 `N. 标题`，名册是 `decisions#N：标题（可选：…）`。
     断言按**编号**认成员，不按行首形状认——上一版写死 `/^\d+\./`，名册一上线这条就假红（检查器与写入器
     格式耦合，语义却没变），与本册"夹具过期就改成派生不变量、不许放宽语义"同一条处置。 */
  const ids = new Set();
  for (const i of real6.items) {
    const m1 = /^(\d+)\./.exec(i);
    const m2 = /^decisions#(\d+)/.exec(i);
    if (m1) ids.add(Number(m1[1]));
    if (m2) ids.add(Number(m2[1]));
  }
  /* §5 的期望不再钉死"在待拍板清单里"（名册上线后 §6 以 PENDING_RULINGS 为源；#5 被记为 half-closed 后
     它离开清单是名册的合法读数，不是分桶器漏——基线红正是这条过期钉子；2026-10-06 全量采纳后这一族只会更多）。
     改成**派生不变量**：从真册名册逐行复算 decisions#5 的 status，断言 §6 成员资格与之一致
     （status=open ⇔ 在清单里）⇒ 名册此后无论把 #5 挪到哪一档，这条都不会假红，也不会放过真漏。 */
  const ledgerLines = fs.readFileSync(path.join(REPO, REAL_LEDGER), "utf8").split(/\r?\n/);
  const rb = ledgerLines.findIndex((l) => /^\s*PENDING_RULINGS_BEGIN/.test(l));
  const re5 = ledgerLines.findIndex((l, i) => i > rb && /^\s*PENDING_RULINGS_END/.test(l));
  const row5 = rb >= 0 && re5 > rb ? (ledgerLines.slice(rb + 1, re5).find((l) => /^\s*RULING id=decisions#5 /.test(l)) || "") : "";
  const row5Status = (/\bstatus=(\S+)/.exec(row5) || [])[1] || "(名册无此行)";
  const row5Open = row5Status === "open";
  pair("真册子非待办项确实被移出", "§0/§30/§31/§32/§33 均不在待拍板桶",
    row5Open ? "§5 名册记 open 却不在待拍板清单里" : `§5 名册已记 ${row5Status}（非 open）却仍在待拍板清单里`,
    [0, 30, 31, 32, 33].every((n) => !ids.has(n)), ids.has(5) === row5Open);
  ok(real6.items.length === real6.headingNum, "真册子 §6 列出条数==标题数字（自数一致，两种渲染口径同规）",
    `列出=${real6.items.length} 标题=${real6.headingNum}`);
  console.log(`  info 真册子 §6 来源=${/source=roster/.test(real.out) ? "PENDING_RULINGS 名册" : "标题分类"}；§5 命中=${ids.has(5)}`);
  ok(real.buckets.pending > 0, "反 vacuous：待拍板桶非空", `pending=${real.buckets.pending}（原始标题数 ${real.buckets.headings}）`);

  say("");
  say(fails ? `BUCKETS_TEST=FAIL（${fails} 条断言未过）` : "BUCKETS_TEST=PASS");
  console.log(`SUMMARY: assertion failures = ${fails}`);
  return fails ? 1 : 0;
}

let code = 1;
try {
  code = main();
} catch (err) {
  fails++;
  say("BUCKETS_TEST=FAIL 异常=" + (err && err.message));
  console.log(`SUMMARY: assertion failures = ${fails}`);
  code = 1;
} finally {
  fs.rmSync(TMPDIR, { recursive: true, force: true });
}
process.exit(code);
